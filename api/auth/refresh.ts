export default async function handler(
  req: {
    method?: string
    body?: Record<string, string>
    query: Record<string, string | string[]>
  },
  res: {
    setHeader(name: string, value: string): void
    status(code: number): { json(body: unknown): void; end(body: string): void }
  },
) {
  const clientId = process.env.VITE_GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'server_misconfigured' })
  }

  const q = req.query
  const refreshToken =
    req.body?.refresh_token ??
    (Array.isArray(q.refresh_token) ? q.refresh_token[0] : q.refresh_token)

  if (!refreshToken) {
    return res.status(400).json({ error: 'missing_refresh_token' })
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const data = (await tokenRes.json()) as {
      access_token?: string
      expires_in?: number
      refresh_token?: string
      refresh_token_expires_in?: number
      error?: string
      error_description?: string
    }

    if (!data.access_token) {
      const msg = data.error_description ?? data.error ?? 'refresh_failed'
      return res.status(401).json({ error: msg })
    }

    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
      refresh_token_expires_in: data.refresh_token_expires_in,
    })
  } catch {
    return res.status(500).json({ error: 'refresh_failed' })
  }
}
