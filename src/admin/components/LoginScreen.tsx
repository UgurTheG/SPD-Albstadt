import { useEffect, useState } from 'react'
import { Loader2, Moon, Shield, Sun } from 'lucide-react'
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

export default function LoginScreen() {
  const { login, loginError, loginLoading, loginAuthStatus, darkMode, toggleDark } = useAdminStore()
  const navigate = useNavigate()

  const [authResult] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const auth = params.get('auth')
    if (!auth) return { error: '', ok: false }
    window.history.replaceState(null, '', window.location.pathname)
    if (auth === 'error') {
      const msg = params.get('msg') || 'unknown_error'
      return { error: `Anmeldung fehlgeschlagen: ${decodeURIComponent(msg)}`, ok: false }
    }
    return { error: '', ok: auth === 'ok' }
  })

  const [oauthError, setOauthError] = useState(authResult.error)

  useEffect(() => {
    if (authResult.ok) login()
  }, [authResult.ok, login])

  useEffect(() => {
    if (loginAuthStatus === 401 || loginAuthStatus === 403 || loginAuthStatus === 404) {
      navigate(`/${loginAuthStatus}`, { replace: true })
    }
  }, [loginAuthStatus, navigate])

  const handleGitHubLogin = () => {
    if (!CLIENT_ID) return
    setOauthError('')
    window.location.href = '/api/auth/start'
  }

  const errorMsg = loginError || oauthError

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-left [hyphens:none]">

      {/* ── Left branding panel (desktop only) ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col justify-between p-10 xl:p-14 relative overflow-hidden bg-gray-950">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:36px_36px]" />
        {/* Radial glows */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-spd-red/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-spd-red/8 rounded-full blur-3xl" />
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-spd-red via-spd-red/60 to-transparent" />
        {/* Right edge fade */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />

        {/* Top: logo + wordmark */}
        <div className="relative z-10">
          <div className="relative w-fit mb-10">
            <div className="absolute inset-0 bg-spd-red/25 blur-2xl scale-[2.5]" />
            <div className="relative w-16 h-16 overflow-hidden shadow-2xl shadow-spd-red/40 ring-1 ring-white/10">
              <img src="/spd-logo.svg" alt="SPD Albstadt" className="w-full h-full" />
            </div>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.05] mb-4">
            Daten-<br />Editor
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-[260px]">
            Inhalte bearbeiten, Fotos hochladen und Änderungen direkt auf spd-albstadt.de veröffentlichen.
          </p>
        </div>

        {/* Bottom: version / org */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-spd-red/60" />
          <p className="text-[11px] text-gray-600 font-medium tracking-wide uppercase">
            SPD Ortsverein Albstadt
          </p>
        </div>
      </div>

      {/* ── Right login panel ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 relative overflow-hidden bg-white dark:bg-gray-950">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50/80 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900" />
        <div className="absolute -top-48 -right-48 w-[600px] h-[600px] bg-spd-red/[0.04] dark:bg-spd-red/[0.08] rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-spd-red/[0.02] dark:bg-spd-red/[0.05] rounded-full blur-3xl" />

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleDark}
          aria-label={darkMode ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm"
        >
          {/* Mobile logo (hidden on desktop) */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-spd-red/20 blur-md" />
              <div className="relative w-10 h-10 overflow-hidden shadow-lg shadow-spd-red/20 ring-1 ring-spd-red/10">
                <img src="/spd-logo.svg" alt="SPD" className="w-full h-full" />
              </div>
            </div>
            <div>
              <p className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight">Daten-Editor</p>
              <p className="text-[10px] text-gray-400">SPD Albstadt</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-spd-red uppercase tracking-widest mb-2">
            Administration
          </p>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1.5">
            Willkommen zurück
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Melden Sie sich mit Ihrem GitHub-Konto an, um Inhalte zu verwalten.
          </p>

          {!CLIENT_ID ? (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-2xl text-left border border-amber-200/60 dark:border-amber-700/40">
              <strong>Konfigurationsfehler:</strong>{' '}
              <code className="font-mono">VITE_GITHUB_CLIENT_ID</code> ist nicht gesetzt.
            </div>
          ) : (
            <div className="space-y-3">
              {errorMsg && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2.5 rounded-xl border border-red-100 dark:border-red-900/40"
                >
                  {errorMsg}
                </motion.p>
              )}

              <button
                type="button"
                onClick={handleGitHubLogin}
                disabled={loginLoading}
                className="w-full group relative bg-gray-950 dark:bg-white/8 hover:bg-gray-800 dark:hover:bg-white/12 text-white font-bold py-3.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-black/10 dark:shadow-black/30 hover:shadow-xl hover:shadow-black/15 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loginLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <GitHubMark size={18} />
                    <span>Mit GitHub anmelden</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800/60 flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
            <Shield size={10} className="shrink-0" />
            <span>OAuth 2.0 · Nur GitHub API · HttpOnly Cookies</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
