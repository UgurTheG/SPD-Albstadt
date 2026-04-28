import { motion } from 'framer-motion'
import { ArrowLeft, Home } from 'lucide-react'
import { useNavigateTo } from '@/hooks/useNavigateTo'
import { ERROR_CONFIG, hasIconInCode, renderCodeWithIcon } from './errorConfig'

interface ErrorPageProps {
  code: number
}

export default function ErrorPage({ code }: ErrorPageProps) {
  const navigateTo = useNavigateTo()
  const config = ERROR_CONFIG[code] ?? ERROR_CONFIG[404]!
  const Icon = config.icon

  return (
    <section className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center max-w-md"
      >
        {/* Status code with icon */}
        <div className="flex flex-col items-center mb-8 select-none">
          {!hasIconInCode(code) && (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-4">
              <div className="absolute inset-0 rounded-full bg-spd-red/20 blur-xl animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center shadow-[0_0_30px_rgba(227,6,19,0.15)]">
                <Icon size={40} strokeWidth={1.5} className="text-spd-red sm:w-12 sm:h-12" />
              </div>
            </div>
          )}
          <span className="text-[7rem] sm:text-[10rem] font-black leading-none text-gray-200 dark:text-gray-800 flex items-center">
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
            <Home size={16} />
            Zur Startseite
          </button>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-spd-red font-semibold px-6 py-3 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            Zurück
          </button>
        </div>
      </motion.div>
    </section>
  )
}
