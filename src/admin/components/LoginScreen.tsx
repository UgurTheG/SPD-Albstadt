import { useEffect, useState } from 'react'
import { Loader2, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../store'

function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 98 96" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  )
}

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined

function generateState(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export default function LoginScreen() {
  const { login, loginError, loginLoading, loginAuthStatus } = useAdminStore()
  const navigate = useNavigate()

  // Parse the OAuth callback hash once at mount — avoids setState inside an effect
  const [{ hashError, hashToken, hashExpiresAt, hashRefreshToken, hashRefreshTokenExpiresAt }] =
    useState(() => {
      const empty = {
        hashError: '',
        hashToken: null as string | null,
        hashExpiresAt: 0,
        hashRefreshToken: '',
        hashRefreshTokenExpiresAt: 0,
      }
      const hash = window.location.hash.slice(1)
      if (!hash) return empty
      const params = new URLSearchParams(hash)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      const error = params.get('error')
      if (error)
        return { ...empty, hashError: `Anmeldung fehlgeschlagen: ${decodeURIComponent(error)}` }
      const token = params.get('token')
      const returnedState = params.get('state')
      if (!token) return empty
      const savedState = sessionStorage.getItem('oauth_state')
      sessionStorage.removeItem('oauth_state')
      if (!returnedState || !savedState || returnedState !== savedState) {
        return { ...empty, hashError: 'Sicherheitsfehler: Ungültige Anfrage.' }
      }
      const expiresIn = params.get('expires_in')
      const refreshToken = params.get('refresh_token')
      const refreshTokenExpiresIn = params.get('refresh_token_expires_in')
      return {
        hashError: '',
        hashToken: decodeURIComponent(token),
        hashExpiresAt: expiresIn ? Date.now() + parseInt(expiresIn, 10) * 1000 : 0,
        hashRefreshToken: refreshToken ? decodeURIComponent(refreshToken) : '',
        hashRefreshTokenExpiresAt: refreshTokenExpiresIn
          ? Date.now() + parseInt(refreshTokenExpiresIn, 10) * 1000
          : 0,
      }
    })

  const [oauthError, setOauthError] = useState(hashError)

  useEffect(() => {
    if (hashToken)
      login({
        token: hashToken,
        expiresAt: hashExpiresAt,
        refreshToken: hashRefreshToken,
        refreshTokenExpiresAt: hashRefreshTokenExpiresAt,
      })
  }, [hashToken, login, hashExpiresAt, hashRefreshToken, hashRefreshTokenExpiresAt])

  useEffect(() => {
    if (loginAuthStatus === 401 || loginAuthStatus === 403 || loginAuthStatus === 404) {
      navigate(`/${loginAuthStatus}`, { replace: true })
    }
  }, [loginAuthStatus, navigate])

  const handleGitHubLogin = () => {
    if (!CLIENT_ID) return
    setOauthError('')
    const state = generateState()
    sessionStorage.setItem('oauth_state', state)
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${window.location.origin}/api/auth/callback`,
      state,
    })
    window.location.href = `https://github.com/login/oauth/authorize?${params}`
  }

  const errorMsg = loginError || oauthError

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative overflow-hidden text-left [hyphens:none]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-spd-red/5 dark:bg-spd-red/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-spd-red/3 dark:bg-spd-red/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative"
      >
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-black/40 p-8 sm:p-10 w-full max-w-md text-center border border-white/50 dark:border-gray-700/50">
          <div className="relative mx-auto mb-8 w-fit">
            <div className="absolute inset-0 bg-spd-red/20 rounded-3xl blur-xl scale-150" />
            <div className="relative w-16 h-16 rounded-2xl shadow-xl shadow-spd-red/30 overflow-hidden">
              <img src="/spd-logo.svg" alt="SPD" className="w-full h-full" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold mb-1 dark:text-white tracking-tight">
            Daten-Editor
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Melden Sie sich mit Ihrem GitHub-Konto an, um Inhalte zu bearbeiten.
          </p>

          {!CLIENT_ID ? (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-2xl text-left border border-amber-200/60 dark:border-amber-700/40">
              <strong>Konfigurationsfehler:</strong>{' '}
              <code className="font-mono">VITE_GITHUB_CLIENT_ID</code> ist nicht gesetzt.
            </div>
          ) : (
            <div className="space-y-4">
              {errorMsg && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 text-left bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl"
                >
                  {errorMsg}
                </motion.p>
              )}

              <button
                type="button"
                onClick={handleGitHubLogin}
                disabled={loginLoading}
                className="w-full bg-gray-900 dark:bg-white/10 hover:bg-gray-800 dark:hover:bg-white/15 text-white font-bold py-4 rounded-2xl hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:scale-100"
              >
                {loginLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <GitHubMark size={18} /> Mit GitHub anmelden
                  </>
                )}
              </button>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2 justify-center text-[10px] text-gray-400">
            <Shield size={10} />
            <span>OAuth 2.0 · Nur GitHub API · Lokal gespeichert</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
