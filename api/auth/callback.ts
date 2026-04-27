export default async function handler(
    req: {query: Record<string, string | string[]>},
    res: {
        setHeader(name: string, value: string): void
        status(code: number): {end(body: string): void}
    }
) {
    const q = req.query
    const code = Array.isArray(q.code) ? q.code[0] : q.code
    const state = Array.isArray(q.state) ? q.state[0] : q.state

    function redirect(fragment: string) {
        res.setHeader('Location', `/admin${fragment}`)
        res.status(302).end('')
    }

    if (!code) return redirect('#error=missing_code')

    const clientId = process.env.VITE_GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET

    if (!clientId || !clientSecret) return redirect('#error=server_misconfigured')

    try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: JSON.stringify({client_id: clientId, client_secret: clientSecret, code}),
        })

        const data = await tokenRes.json() as {
            access_token?: string
            expires_in?: number
            refresh_token?: string
            refresh_token_expires_in?: number
            error?: string
            error_description?: string
        }

        if (!data.access_token) {
            const msg = data.error_description ?? data.error ?? 'token_exchange_failed'
            return redirect(`#error=${encodeURIComponent(msg)}`)
        }

        const params = new URLSearchParams()
        params.set('token', data.access_token)
        if (data.expires_in) params.set('expires_in', String(data.expires_in))
        if (data.refresh_token) params.set('refresh_token', data.refresh_token)
        if (data.refresh_token_expires_in) params.set('refresh_token_expires_in', String(data.refresh_token_expires_in))
        if (state) params.set('state', state)
        return redirect(`#${params.toString()}`)
    } catch {
        return redirect('#error=token_exchange_failed')
    }
}
