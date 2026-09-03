/**
 * Server-side authorisation helpers shared by the OAuth callback and the
 * token refresh endpoint.
 *
 * Admin access requires BOTH:
 *   1. push permission on the content repository (verified against GitHub
 *      with the user's own token — the repo is public, so a 200 on the repo
 *      endpoint alone proves nothing), and
 *   2. membership in ALLOWED_GITHUB_LOGINS, if that allowlist is configured.
 */

export const REPO_OWNER = 'UgurTheG'
export const REPO_NAME = 'SPD-Albstadt'

const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

/** Returns the lower-cased GitHub login for the token, or '' if it cannot be resolved. */
export async function fetchGitHubLogin(accessToken: string): Promise<string> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { ...GITHUB_HEADERS, Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return ''
    const data = (await res.json()) as { login?: unknown }
    return typeof data.login === 'string' ? data.login.toLowerCase() : ''
  } catch {
    return ''
  }
}

/**
 * Returns true only when GitHub reports push permission on the content repo
 * for the given token. Any error or missing permission block fails closed.
 */
export async function hasPushAccess(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
      headers: { ...GITHUB_HEADERS, Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return false
    const data = (await res.json()) as { permissions?: { push?: unknown } }
    return data.permissions?.push === true
  } catch {
    return false
  }
}

/**
 * Checks the optional ALLOWED_GITHUB_LOGINS allowlist. With the variable unset
 * every login passes; with it set, only listed logins pass.
 */
export function isLoginAllowed(login: string): boolean {
  const raw = process.env.ALLOWED_GITHUB_LOGINS
  if (!raw) return true
  const allowed = raw
    .split(',')
    .map(l => l.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(login.toLowerCase())
}
