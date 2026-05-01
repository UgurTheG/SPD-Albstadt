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
import { rateLimit, getClientIP } from './auth/rateLimit.js'

// ─── Allowed tab keys (must match src/admin/config/tabs.ts) ──────────────────

const ALLOWED_TAB_KEYS = new Set([
  'startseite',
  'news',
  'party',
  'fraktion',
  'kommunalpolitik',
  'haushaltsreden',
  'history',
  'impressum',
  'datenschutz',
  'kontakt',
  'config',
])

// ─── Startup guard ────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production' && !process.env.KV_REST_API_URL) {
  console.warn(
    '[admin-presence] KV_REST_API_URL is not set in production. ' +
      'Presence state is stored in-memory and will be partitioned across ' +
      'serverless function instances. Configure Vercel KV for correct ' +
      'multi-instance behaviour.',
  )
}

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
/**
 * Index set TTL: 3× individual key TTL.  The index is refreshed on every
 * upsert so it stays alive while any user is active.  When all users leave
 * (no more upserts), it expires within 150 s — far less than the old 10×
 * (500 s) that caused prolonged stale-entry accumulation.
 */
const KV_INDEX_TTL_S = TTL_S * 3

// KV key prefix and index set for tracking active logins
const KV_PREFIX = 'spd:presence:'
const KV_INDEX = 'spd:presence:__index__'
/** Monotonic version counter — incremented on every write so receivers can
 *  detect changes with a single cheap GET instead of a full smembers+mget. */
const KV_VERSION_KEY = 'spd:presence:version'

// In-memory fallback (single-instance / local dev)
const inMemory = new Map<string, PresenceUser>()
let inMemoryVersion = 0

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

async function storageUpsert(user: PresenceUser): Promise<number> {
  if (isKvEnabled()) {
    try {
      const { kv } = await import('@vercel/kv')
      await kv.set(`${KV_PREFIX}${user.login}`, user, { ex: TTL_S })
      await kv.sadd(KV_INDEX, user.login)
      await kv.expire(KV_INDEX, KV_INDEX_TTL_S)
      const version = await kv.incr(KV_VERSION_KEY)
      // Keep the version key alive as long as any user is active
      await kv.expire(KV_VERSION_KEY, KV_INDEX_TTL_S)
      return version
    } catch {
      // KV unavailable — fall through to in-memory
    }
  }
  inMemory.set(user.login, user)
  return ++inMemoryVersion
}

async function storageRemove(login: string): Promise<void> {
  if (isKvEnabled()) {
    try {
      const { kv } = await import('@vercel/kv')
      await kv.del(`${KV_PREFIX}${login}`)
      await kv.srem(KV_INDEX, login)
      await kv.incr(KV_VERSION_KEY)
      return
    } catch {
      // fall through
    }
  }
  inMemory.delete(login)
  ++inMemoryVersion
}

async function storageGetVersion(): Promise<number> {
  if (isKvEnabled()) {
    try {
      const { kv } = await import('@vercel/kv')
      return (await kv.get<number>(KV_VERSION_KEY)) ?? 0
    } catch {
      // fall through
    }
  }
  return inMemoryVersion
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

  const origin =
    (req.headers['origin'] as string | undefined) ||
    (req.headers['referer'] as string | undefined) ||
    ''
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // 180 requests / minute per IP — allows 500 ms version-check polling for up
  // to ~3 concurrent active sessions (3 users × 2 req/s = 6 req/s) while
  // still blocking runaway clients.
  const ip = getClientIP(req.headers as Record<string, string | string[] | undefined>)
  if (!rateLimit(ip, 180, 60_000)) {
    return res.status(429).json({ error: 'rate_limited' })
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
  // Supports an optional `?since=<version>` query param for cheap version
  // checks: if the version hasn't changed the response skips the full KV scan
  // and returns `{ version, changed: false }` so callers can poll at 500 ms
  // without the overhead of a full smembers+mget on every tick.
  if (req.method === 'GET') {
    const since = req.query?.since as string | undefined
    const version = await storageGetVersion()
    if (since !== undefined && Number(since) === version) {
      return res.status(200).json({ version, changed: false })
    }
    const all = await storageGetAll()
    const others = all.filter(u => u.login !== verifiedLogin)
    return res.status(200).json({ version, changed: true, users: others })
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body as {
      avatar_url?: string
      activeTab?: string
      dirtyTabs?: string[]
    }

    // ── Input validation ────────────────────────────────────────────────────
    // Validate avatar_url: must be a valid https:// URL (GitHub CDN or blank)
    const rawAvatar = body?.avatar_url ?? ''
    let safeAvatarUrl = ''
    if (rawAvatar) {
      try {
        const url = new URL(rawAvatar)
        if (url.protocol === 'https:') safeAvatarUrl = rawAvatar
      } catch {
        // Malformed URL — silently drop it
      }
    }

    // Validate activeTab against the known tab key list
    const rawActiveTab = body?.activeTab ?? ''
    const safeActiveTab = ALLOWED_TAB_KEYS.has(rawActiveTab) ? rawActiveTab : ''

    // Validate dirtyTabs: filter to known keys only; cap at total tab count
    const rawDirtyTabs = Array.isArray(body?.dirtyTabs) ? body.dirtyTabs : []
    const safeDirtyTabs = rawDirtyTabs
      .filter((k): k is string => typeof k === 'string' && ALLOWED_TAB_KEYS.has(k))
      .slice(0, ALLOWED_TAB_KEYS.size)

    const user: PresenceUser = {
      // Identity is bound to the verified cookie — ignore any body.login
      login: verifiedLogin,
      avatar_url: safeAvatarUrl,
      activeTab: safeActiveTab,
      dirtyTabs: safeDirtyTabs,
      lastSeen: Date.now(),
    }

    const version = await storageUpsert(user)

    // Return the new version + everyone except the caller so clients can
    // detect changes in their version-check polling loop.
    const all = await storageGetAll()
    const others = all.filter(u => u.login !== verifiedLogin)
    return res.status(200).json({ version, users: others })
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
