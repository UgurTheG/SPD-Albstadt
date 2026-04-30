/**
 * GET    /api/admin-presence  — returns all currently active users
 * POST   /api/admin-presence  — heartbeat; updates the calling user's presence
 * DELETE /api/admin-presence  — user is closing the session (best-effort)
 *
 * State is purely in-memory.  Cold starts reset the map — that is intentional:
 * stale presence automatically disappears after the TTL anyway.
 */
import type { VercelRequest, VercelResponse } from './vercel.d.ts'
import { parseCookies, isAllowedOrigin, ACCESS_TOKEN_COOKIE } from './auth/cookies.js'

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

// ─── In-memory store ──────────────────────────────────────────────────────────

/** 45 s TTL — poll interval is 30 s, so 1.5× gives buffer for slow networks */
const TTL_MS = 45_000

const presence = new Map<string, PresenceUser>()

function evictExpired() {
  const now = Date.now()
  for (const [login, user] of presence) {
    if (now - user.lastSeen > TTL_MS) presence.delete(login)
  }
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

  evictExpired()

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return res.status(200).json({ users: [...presence.values()] })
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body as {
      login?: string
      avatar_url?: string
      activeTab?: string
      dirtyTabs?: string[]
    }

    if (!body?.login) return res.status(400).json({ error: 'missing login' })

    presence.set(body.login, {
      login: body.login,
      avatar_url: body.avatar_url ?? '',
      activeTab: body.activeTab ?? '',
      dirtyTabs: Array.isArray(body.dirtyTabs) ? body.dirtyTabs : [],
      lastSeen: Date.now(),
    })

    // Return everyone except the caller
    const others = [...presence.values()].filter(u => u.login !== body.login)
    return res.status(200).json({ users: others })
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const body = req.body as { login?: string }
    if (body?.login) presence.delete(body.login)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}
