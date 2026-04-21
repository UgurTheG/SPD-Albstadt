import {motion} from 'framer-motion'
import {
    AlertTriangle,
    ArrowLeft,
    Ban,
    Clock,
    Home,
    KeyRound,
    Repeat,
    Search,
    ServerCrash,
    ShieldAlert,
    ShieldOff,
    Slash
} from 'lucide-react'

interface ErrorPageProps {
    code: number
    navigateTo: (id: string) => void
}

const ERROR_CONFIG: Record<number, { icon: typeof Home; title: string; description: string }> = {
    400: {
        icon: AlertTriangle,
        title: 'Ungültige Anfrage',
        description: 'Die Anfrage konnte nicht verarbeitet werden. Bitte überprüfen Sie die URL und versuchen Sie es erneut.',
    },
    401: {
        icon: KeyRound,
        title: 'Nicht autorisiert',
        description: 'Sie müssen sich anmelden, um auf diese Seite zugreifen zu können.',
    },
    403: {
        icon: ShieldOff,
        title: 'Zugriff verweigert',
        description: 'Sie haben leider keine Berechtigung, diese Seite aufzurufen.',
    },
    404: {
        icon: Search,
        title: 'Seite nicht gefunden',
        description: 'Die angeforderte Seite existiert leider nicht. Möglicherweise wurde sie verschoben oder entfernt.',
    },
    405: {
        icon: Slash,
        title: 'Methode nicht erlaubt',
        description: 'Diese Anfragemethode wird für die angeforderte Ressource nicht unterstützt.',
    },
    408: {
        icon: Clock,
        title: 'Zeitüberschreitung',
        description: 'Die Anfrage hat zu lange gedauert. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    },
    429: {
        icon: ShieldAlert,
        title: 'Zu viele Anfragen',
        description: 'Sie haben zu viele Anfragen gesendet. Bitte warten Sie einen Moment und versuchen Sie es dann erneut.',
    },
    500: {
        icon: ServerCrash,
        title: 'Serverfehler',
        description: 'Auf dem Server ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
    },
    502: {
        icon: Repeat,
        title: 'Ungültige Antwort',
        description: 'Der Server hat eine ungültige Antwort von einem vorgelagerten Server erhalten. Bitte versuchen Sie es später erneut.',
    },
    503: {
        icon: Ban,
        title: 'Vorübergehend nicht verfügbar',
        description: 'Die Seite wird gerade gewartet und ist vorübergehend nicht erreichbar. Bitte versuchen Sie es in Kürze erneut.',
    },
    504: {
        icon: Clock,
        title: 'Gateway-Zeitüberschreitung',
        description: 'Der Server hat nicht rechtzeitig geantwortet. Bitte versuchen Sie es später erneut.',
    },
}

function hasIconInCode(code: number): boolean {
    return (String(code).match(/0/g) || []).length === 1
}

function renderCodeWithIcon(code: number, Icon: typeof Home) {
    const str = String(code)
    const zeroCount = (str.match(/0/g) || []).length
    if (zeroCount !== 1) return <>{str}</>
    const idx = str.indexOf('0')
    return (
        <>
            {str.slice(0, idx)}
            <span className="relative inline-flex items-center justify-center w-[0.75em] h-[0.75em] mx-[0.01em]">
                <span className="absolute inset-0 rounded-full bg-spd-red/20 blur-md animate-pulse"/>
                <span
                    className="relative w-full h-full rounded-full bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center shadow-[0_0_20px_rgba(227,6,19,0.15)]">
                    <Icon className="text-spd-red w-[0.4em] h-[0.4em]" strokeWidth={1.5}/>
                </span>
            </span>
            {str.slice(idx + 1)}
        </>
    )
}

export default function ErrorPage({code, navigateTo}: ErrorPageProps) {
    const config = ERROR_CONFIG[code] ?? ERROR_CONFIG[404]!
    const Icon = config.icon

    return (
        <section className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
            <motion.div
                initial={{opacity: 0, y: 30}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6, ease: 'easeOut'}}
                className="text-center max-w-md"
            >
                {/* Status code with icon */}
                <div className="flex flex-col items-center mb-8 select-none">
                    {!hasIconInCode(code) && (
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-4">
                            <div className="absolute inset-0 rounded-full bg-spd-red/20 blur-xl animate-pulse"/>
                            <div
                                className="relative w-full h-full rounded-full bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center shadow-[0_0_30px_rgba(227,6,19,0.15)]">
                                <Icon size={40} strokeWidth={1.5} className="text-spd-red sm:w-12 sm:h-12"/>
                            </div>
                        </div>
                    )}
                    <span
                        className="text-[7rem] sm:text-[10rem] font-black leading-none text-gray-200 dark:text-gray-800 flex items-center">
                        {renderCodeWithIcon(code, Icon)}
                    </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3">
                    {config.title}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                    {config.description}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={() => navigateTo('home')}
                        className="inline-flex items-center gap-2 bg-spd-red hover:bg-spd-red-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors cursor-pointer"
                    >
                        <Home size={16}/>
                        Zur Startseite
                    </button>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-spd-red font-semibold px-6 py-3 rounded-xl transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={16}/>
                        Zurück
                    </button>
                </div>
            </motion.div>
        </section>
    )
}

