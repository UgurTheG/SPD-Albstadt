import {useState} from 'react'
import {ChevronDown, ExternalLink, KeyRound, LogIn, Shield} from 'lucide-react'
import {motion} from 'framer-motion'
import {useAdminStore} from '../store'

export default function LoginScreen() {
    const [token, setToken] = useState('')
    const {login, loginError, loginLoading} = useAdminStore()

    const isValidTokenFormat = (t: string) => {
        const trimmed = t.trim()
        return trimmed.startsWith('ghp_') || trimmed.startsWith('github_pat_') || trimmed.startsWith('gho_')
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-40 -right-40 w-96 h-96 bg-spd-red/5 dark:bg-spd-red/10 rounded-full blur-3xl"/>
                <div
                    className="absolute -bottom-40 -left-40 w-96 h-96 bg-spd-red/3 dark:bg-spd-red/5 rounded-full blur-3xl"/>
            </div>

            <motion.div
                initial={{opacity: 0, y: 20, scale: 0.97}}
                animate={{opacity: 1, y: 0, scale: 1}}
                transition={{duration: 0.5, ease: 'easeOut'}}
                className="relative"
            >
                <div
                    className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-black/40 p-8 sm:p-10 w-full max-w-md text-center border border-white/50 dark:border-gray-700/50">
                    {/* Logo with glow */}
                    <div className="relative mx-auto mb-8 w-fit">
                        <div className="absolute inset-0 bg-spd-red/20 rounded-3xl blur-xl scale-150"/>
                        <div
                            className="relative w-16 h-16 bg-gradient-to-br from-spd-red to-spd-red-dark rounded-2xl flex items-center justify-center shadow-xl shadow-spd-red/30">
                            <span className="text-white font-black text-sm tracking-tight">SPD</span>
                        </div>
                    </div>

                    <h1 className="text-2xl font-extrabold mb-1 dark:text-white tracking-tight">Daten-Editor</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        Melden Sie sich mit Ihrem Zugangstoken an, um Inhalte zu bearbeiten.
                    </p>

                    <form onSubmit={e => {
                        e.preventDefault();
                        login(token)
                    }} className="space-y-4">
                        <div className="relative group">
                            <KeyRound size={16}
                                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-spd-red transition-colors"/>
                            <input
                                type="password"
                                autoComplete="current-password"
                                placeholder="GitHub-Token eingeben…"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                className="w-full bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl pl-11 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-spd-red/30 focus:border-spd-red/50 focus:bg-white dark:focus:bg-gray-800 dark:text-white dark:placeholder-gray-500 transition-all duration-200"
                            />
                        </div>

                        {loginError && (
                            <motion.p
                                initial={{opacity: 0, y: -4}}
                                animate={{opacity: 1, y: 0}}
                                className="text-xs text-red-500 text-left bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl"
                            >
                                {loginError}
                            </motion.p>
                        )}

                        {token.trim() && !isValidTokenFormat(token) && (
                            <p className="text-xs text-amber-500 text-left bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl">
                                Token sollte mit <code className="font-mono">ghp_</code> oder <code
                                className="font-mono">github_pat_</code> beginnen.
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loginLoading || !token.trim() || !isValidTokenFormat(token)}
                            className="w-full bg-gradient-to-r from-spd-red to-spd-red-dark text-white font-bold py-4 rounded-2xl hover:shadow-xl hover:shadow-spd-red/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:scale-100"
                        >
                            {loginLoading ? (
                                <div
                                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                            ) : (
                                <><LogIn size={16}/> Anmelden</>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center gap-2 justify-center text-[10px] text-gray-400">
                        <Shield size={10}/>
                        <span>Verschlüsselt · Nur GitHub API · Lokal gespeichert</span>
                    </div>

                    <details className="mt-8 text-left group">
                        <summary
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer flex items-center gap-1.5 select-none">
                            <ChevronDown size={12} className="transition-transform duration-200 group-open:rotate-180"/>
                            Was ist ein Token?
                        </summary>
                        <motion.div
                            initial={false}
                            className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-2 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-100/80 dark:border-gray-700/40"
                        >
                            <p>Ein <strong className="text-gray-700 dark:text-gray-300">GitHub Personal Access
                                Token</strong> ist ein Passwort-Ersatz für den Zugang zum Daten-Repository.</p>
                            <ol className="list-decimal ml-4 space-y-1.5">
                                <li>Gehen Sie auf <a href="https://github.com/settings/tokens/new" target="_blank"
                                                     rel="noopener noreferrer"
                                                     className="text-spd-red hover:underline inline-flex items-center gap-0.5 font-medium">github.com/settings/tokens/new <ExternalLink
                                    size={9}/></a></li>
                                <li>Bei „Note" einen Namen eingeben (z.B. <strong>SPD Editor</strong>)</li>
                                <li>Bei „Expiration" eine Laufzeit wählen</li>
                                <li>Bei „Select scopes" das Häkchen bei <strong>repo</strong> setzen</li>
                                <li>Auf „<strong>Generate token</strong>" klicken</li>
                                <li>Das Token (beginnt mit <code
                                    className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-md text-[10px] font-mono">ghp_</code>)
                                    kopieren und hier einfügen
                                </li>
                            </ol>
                            <p className="pt-1 text-gray-600 dark:text-gray-300"><strong>Wichtig:</strong> Das Token
                                wird nur einmal angezeigt — sofort kopieren!</p>
                        </motion.div>
                    </details>
                </div>
            </motion.div>
        </div>
    )
}
