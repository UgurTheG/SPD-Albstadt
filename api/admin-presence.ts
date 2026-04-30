/**
 * GET    /api/admin-presence  — returns all currently active users
 * POST   /api/admin-presence  — heartbeat; updates the calling user's presence
 * DELETE /api/admin-presence  — user is closing the session (best-effort)
 *
 * Identity is bound to the server-side USER_LOGIN_COOKIE set during OAuth —
 * client-supplied `login` values in the request body are ignored for key
 * purposes, preventing presence spoofing / session takeover.
 *
 * Storage strategy:
 *   • If KV_REST_API_URL is set → uses @vercel/kv (shared across all Vercel
 *     function instances, required for multi-instance correctness).
 *   • Otherwise → falls back to an in-memory Map (works for single-instance /
 *     local dev; presence may be partitioned across cold-started instances).
 *
 * To enable KV: run `vercel env add KV_REST_API_URL` and
 * `vercel env add KV_REST_API_TOKEN` after linking a Vercel KV database via
 * the Vercel dashboard (Storage → Create Database → KV).
 */
import type { VercelRequest, VercelResponse } from './vercel.d.ts'
import {
  parseCookies,
  isAllowedOrigin,
  ACCESS_TOKEN_COOKIE,
  USER_LOGIN_COOKIE,
} from './auth/cookies.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceUser {
  login: string
  avatar_url: string
  /** The tab the user is currently viewing */
  activeTab: string
  /** The tabs that have unsaved changes (locally "locked") */
  dirtyTabs: string[]
  lastSeen: number
}

// ─── Storage abstraction ──────────────────────────────────────────────────────

/** 45 s TTL — poll interval is 30 s, so 1.5× gives buffer for slow networks */
const TTL_MS = 45_000
/** Redis TTL in seconds (slightly longer than JS TTL so KV never evicts before us) */
const TTL_S = 50

// KV key prefix and index set for tracking active logins
const KV_PREFIX = 'spd:presence:'
const KV_INDEX = 'spd:presence:__index__'

// In-memory fallback (single-instance / local dev)
const inMemory = new Map<string, PresenceUser>()

function evictExpired() {
  const now = Date.now()
  for (const [login, user] of inMemory) {
    if (now - user.lastSeen > TTL_MS) inMemory.delete(login)
  }
}

/** Returns true when Vercel KV env-vars are configured. */
function isKvEnabled(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function storageUpsert(user: PresenceUser): Promise<void> {
  if (isKvEnabled()) {
    try {
      const { kv } = await import('@vercel/kv')
      // Store each user as an individual key with its own TTL so expiry is
      // automatic and per-user (no stale entries after cold-starts).
      await kv.set(`${KV_PREFIX}${user.login}`, user, { ex: TTL_S })
      // Maintain an index set so we can list active users without a SCAN.
      await kv.sadd(KV_INDEX, user.login)
      await kv.expire(KV_INDEX, TTL_S * 10)
      return
    } catch {
      // KV unavailable — fall through to in-memory
    }
  }
  inMemory.set(user.login, user)
}

async function storageRemove(login: string): Promise<void> {
  if (isKvEnabled()) {
    try {
      const { kv } = await import('@vercel/kv')
      await kv.del(`${KV_PREFIX}${login}`)
      await kv.srem(KV_INDEX, login)
      return
    } catch {
      // fall through
    }
  }
  inMemory.delete(login)
}

async function storageGetAll(): Promise<PresenceUser[]> {
  if (isKvEnabled()) {
    try {
      const { kv } = await import('@vercel/kv')
      const logins = (await kv.smembers(KV_INDEX)) as string[]
      if (!logins.length) return []
      const users = await Promise.all(logins.map(l => kv.get<PresenceUser>(`${KV_PREFIX}${l}`)))
      // Filter nulls — entries whose TTL expired between the SMEMBERS and GET
      const live = users.filter((u): u is PresenceUser => u !== null)
      // Clean up stale index entries in the background
      const staleLogins = logins.filter((_, i) => users[i] === null)
      if (staleLogins.length) {
        void kv.srem(KV_INDEX, ...staleLogins).catch(() => {})
      }
      return live
    } catch {
      // KV unavailable — fall through to in-memory
    }
  }
  evictExpired()
  return [...inMemory.values()]
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  const origin = (req.headers['origin'] as string | undefined) ?? ''
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  // Require auth cookie — don't expose presence to unauthenticated callers
  const cookies = parseCookies(req.headers.cookie as string | undefined)
  if (!cookies[ACCESS_TOKEN_COOKIE]) {
    return res.status(401).json({ error: 'unauthenticated' })
  }

  // ── Identity binding ────────────────────────────────────────────────────────
  // The authoritative login comes from the HttpOnly USER_LOGIN_COOKIE set
  // during OAuth callback — never from the client-supplied request body.
  // This prevents any authenticated user from impersonating someone else or
  // evicting a colleague's presence entry (DELETE takeover).
  const verifiedLogin = cookies[USER_LOGIN_COOKIE]
  if (!verifiedLogin) {
    // User authenticated before the login cookie was introduced — force re-login.
    return res.status(401).json({ error: 'missing_identity_cookie' })
  }

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const all = await storageGetAll()
    return res.status(200).json({ users: all })
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body as {
      avatar_url?: string
      activeTab?: string
      dirtyTabs?: string[]
    }

    const user: PresenceUser = {
      // Identity is bound to the verified cookie — ignore any body.login
      login: verifiedLogin,
      avatar_url: body?.avatar_url ?? '',
      activeTab: body?.activeTab ?? '',
      dirtyTabs: Array.isArray(body?.dirtyTabs) ? body.dirtyTabs : [],
      lastSeen: Date.now(),
    }

    await storageUpsert(user)

    // Return everyone except the caller
    const all = await storageGetAll()
    const others = all.filter(u => u.login !== verifiedLogin)
    return res.status(200).json({ users: others })
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    // Users can only remove their own presence entry — prevents session takeover
    // where an authenticated user evicts a colleague from the presence map.
    await storageRemove(verifiedLogin)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}
