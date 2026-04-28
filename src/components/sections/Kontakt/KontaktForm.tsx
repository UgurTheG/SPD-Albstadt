import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle, ChevronDown, Send } from 'lucide-react'
import { useKontaktForm } from '@/hooks/useKontaktForm'
import { BETREFF_OPTIONS } from './constants'

const inputClass =
  'w-full bg-white dark:bg-red-900/40 border border-gray-200 dark:border-white/20 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-red-300/60 focus:outline-none focus:ring-2 focus:ring-spd-red/25 dark:focus:ring-white/30 transition-all duration-200 text-sm'

export function KontaktForm() {
  const { formData, status, handleChange, handleSubmit, reset } = useKontaktForm()

  return (
    <AnimatePresence mode="wait">
      {status === 'success' ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex-1 flex flex-col items-center justify-center text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
          >
            <CheckCircle
              size={56}
              className="text-spd-red dark:text-white mb-5"
              strokeWidth={1.5}
            />
          </motion.div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
            Nachricht gesendet!
          </h3>
          <p className="text-gray-500 dark:text-white/70 mb-6 text-sm leading-relaxed">
            Vielen Dank für Ihre Nachricht. Wir melden uns so bald wie möglich bei Ihnen.
          </p>
          <button
            onClick={reset}
            className="bg-spd-red dark:bg-white/10 text-white dark:text-white font-bold px-6 py-2.5 rounded-xl hover:bg-spd-red-dark dark:hover:bg-white/20 transition-colors text-sm"
          >
            Neue Nachricht schreiben
          </button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex flex-col space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 dark:text-white text-xs font-semibold mb-2 uppercase tracking-wide">
                Ihr Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Max Mustermann"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-white text-xs font-semibold mb-2 uppercase tracking-wide">
                E-Mail-Adresse *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="max@beispiel.de"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-white text-xs font-semibold mb-2 uppercase tracking-wide">
              Betreff *
            </label>
            <div className="relative">
              <select
                name="betreff"
                value={formData.betreff}
                onChange={handleChange}
                required
                className={`${inputClass} cursor-pointer appearance-none`}
              >
                <option value="" disabled>
                  Bitte wählen Sie einen Betreff
                </option>
                {BETREFF_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 pointer-events-none"
                strokeWidth={2}
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-gray-700 dark:text-white text-xs font-semibold mb-2 uppercase tracking-wide">
              Ihre Nachricht *
            </label>
            <textarea
              name="nachricht"
              value={formData.nachricht}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Schreiben Sie Ihre Nachricht hier..."
              className={`${inputClass} resize-none flex-1 min-h-30`}
            />
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2.5 bg-red-50 dark:bg-white text-spd-red rounded-xl px-4 py-3 text-sm font-medium border border-red-200 dark:border-transparent">
              <AlertCircle size={16} className="shrink-0" />
              Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie uns
              direkt per E-Mail.
            </div>
          )}

          <motion.button
            type="submit"
            disabled={status === 'sending'}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-spd-red dark:bg-white/10 text-white dark:text-white font-bold py-4 rounded-xl hover:bg-spd-red-dark dark:hover:bg-white/20 transition-all duration-200 flex items-center justify-center gap-2.5 text-sm disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-spd-red/20 dark:shadow-black/10"
          >
            {status === 'sending' ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Wird gesendet...
              </>
            ) : (
              <>
                <Send size={15} />
                Nachricht senden
              </>
            )}
          </motion.button>

          <p className="text-gray-400 dark:text-white/40 text-xs text-center leading-relaxed">
            Mit dem Absenden stimmen Sie zu, dass wir Ihre Daten zur Bearbeitung Ihrer Anfrage
            verwenden.
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  )
}
