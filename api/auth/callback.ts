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
            error?: string
            error_description?: string
        }

        if (!data.access_token) {
            const msg = data.error_description ?? data.error ?? 'token_exchange_failed'
            return redirect(`#error=${encodeURIComponent(msg)}`)
        }

        let fragment = `#token=${encodeURIComponent(data.access_token)}`
        if (state) fragment += `&state=${encodeURIComponent(state)}`
        return redirect(fragment)
    } catch {
        return redirect('#error=token_exchange_failed')
    }
}
