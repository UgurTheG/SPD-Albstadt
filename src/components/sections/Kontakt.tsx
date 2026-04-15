import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'

interface FormData {
  name: string
  email: string
  betreff: string
  nachricht: string
}

export default function Kontakt() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', betreff: '', nachricht: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')

    // -------------------------------------------------------
    // INTEGRATION HINWEIS: Um das Formular zu aktivieren,
    // erstellen Sie ein kostenloses Konto auf formspree.io,
    // erstellen Sie ein Formular und ersetzen Sie die URL unten
    // mit Ihrer eigenen Formspree-URL, z.B.:
    // "https://formspree.io/f/IHRE_FORMULAR_ID"
    // -------------------------------------------------------
    const FORMSPREE_URL = 'https://formspree.io/f/xqegbkyl' // Hier Ihre Formspree-URL eintragen

    if (!FORMSPREE_URL) {
      // Demo mode: simulate success
      await new Promise(r => setTimeout(r, 1200))
      setStatus('success')
      setFormData({ name: '', email: '', betreff: '', nachricht: '' })
      return
    }

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setStatus('success')
        setFormData({ name: '', email: '', betreff: '', nachricht: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const inputClass =
    'w-full bg-white dark:bg-red-900/40 border border-gray-200 dark:border-white/20 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-red-300/60 focus:outline-none focus:ring-2 focus:ring-spd-red/25 dark:focus:ring-white/30 transition-all duration-200 text-sm'

  return (
    <section id="kontakt" className="py-24 bg-gray-50 dark:bg-red-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.06] text-spd-red dark:text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="kontakt-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#kontakt-grid)" />
        </svg>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-spd-red/5 dark:bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-spd-red/5 dark:bg-white/5" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1 w-12 bg-spd-red dark:bg-white/50 rounded-full" />
            <span className="text-spd-red dark:text-white/70 font-semibold text-sm uppercase tracking-wider">
              Kontakt
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4 text-left">
            Schreiben Sie uns
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/70 max-w-2xl">
            Haben Sie Fragen, Anregungen oder möchten Sie Mitglied werden? Wir freuen uns auf Ihre Nachricht.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8 items-stretch">
          {/* Form — 3 columns */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col"
          >
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
                    <CheckCircle size={56} className="text-spd-red dark:text-white mb-5" strokeWidth={1.5} />
                  </motion.div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Nachricht gesendet!</h3>
                  <p className="text-gray-500 dark:text-white/70 mb-6 text-sm leading-relaxed">
                    Vielen Dank für Ihre Nachricht. Wir melden uns so bald wie möglich bei Ihnen.
                  </p>
                  <button
                    onClick={() => setStatus('idle')}
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
                        <option value="Mitglied werden">Mitglied werden</option>
                        <option value="Allgemeine Anfrage">Allgemeine Anfrage</option>
                        <option value="Presseanfrage">Presseanfrage</option>
                        <option value="Veranstaltungen">Veranstaltungen</option>
                        <option value="Sonstiges">Sonstiges</option>
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
                      Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie uns direkt per
                      E-Mail.
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
                    Mit dem Absenden stimmen Sie zu, dass wir Ihre Daten zur Bearbeitung Ihrer Anfrage verwenden.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Contact info — 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2 flex flex-col gap-6"
          >
            {/* Group photo */}
            <div className="rounded-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-white/10 shadow-sm">
              <img
                src="/images/kontakt/gruppenbild.webp"
                alt="SPD Albstadt – Gruppenbild"
                className="w-full h-auto block"
              />
            </div>

            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h4 className="text-gray-900 dark:text-white font-bold mb-5 text-lg">Kontaktdaten</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 bg-spd-red/10 dark:bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-spd-red dark:text-white" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">Anschrift</p>
                    <p className="text-gray-500 dark:text-white/60 text-sm mt-0.5 leading-relaxed">
                      SPD Albstadt
                      <br />
                      Stadtgarten 1<br />
                      72458 Albstadt-Ebingen
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 bg-spd-red/10 dark:bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                    <Mail size={16} className="text-spd-red dark:text-white" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">E-Mail</p>
                    <a
                      href="mailto:info@spd-albstadt.de"
                      className="text-gray-500 dark:text-white/60 text-sm hover:text-spd-red dark:hover:text-white transition-colors mt-0.5 block"
                    >
                      info@spd-albstadt.de
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 bg-spd-red/10 dark:bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                    <Phone size={16} className="text-spd-red dark:text-white" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">Telefon</p>
                    <a
                      href="tel:+497431000000"
                      className="text-gray-500 dark:text-white/60 text-sm hover:text-spd-red dark:hover:text-white transition-colors mt-0.5 block"
                    >
                      07431 / 000 000
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h4 className="text-gray-900 dark:text-white font-bold mb-3">Bürozeiten</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-white/60">Montag – Freitag</span>
                  <span className="text-gray-900 dark:text-white font-medium">10:00 – 16:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-white/60">Samstag</span>
                  <span className="text-gray-900 dark:text-white font-medium">Nach Vereinbarung</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
