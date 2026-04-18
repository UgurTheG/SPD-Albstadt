import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { FileText } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Anbieterin dieser Website im Sinne des § 5 Telemediengesetz (TMG)',
    content: (
      <>
        <p className="mb-4">
          SPD Albstadt vertreten durch die Vorsitzende Marianne Roth<br />
          Flanderstraße 35<br />
          72458 Albstadt
        </p>
        <p>
          Telefon: (07431) 51822<br />
          E-Mail:{' '}
          <a href="mailto:jumroth@t-online.de" className="text-spd-red dark:text-red-400 hover:underline">
            jumroth@t-online.de
          </a>
        </p>
      </>
    ),
  },
  {
    title: 'Inhaltlich Verantwortliche gemäß § 55 Abs. 2 Rundfunkstaatsvertrag (RStV)',
    content: (
      <>
        <p className="mb-4">
          Marianne Roth<br />
          Flanderstraße 35<br />
          72458 Albstadt
        </p>
        <p className="mb-4">
          Telefon: (07431) 51822<br />
          E-Mail:{' '}
          <a href="mailto:jumroth@t-online.de" className="text-spd-red dark:text-red-400 hover:underline">
            jumroth@t-online.de
          </a>
        </p>
        <p>
          Wenn Sie Kontakt zur SPD Albstadt aufnehmen möchten, wenden Sie sich bitte an die Vorsitzende der SPD
          Albstadt, Marianne Roth, oder nutzen Sie unser Kontaktformular.
        </p>
      </>
    ),
  },
  {
    title: 'Urheberrechtshinweis',
    content: (
      <p>
        Alle Texte, Fotos und sonstige Gestaltungselemente dieses Internetangebots sind urheberrechtlich geschützt,
        sofern nicht ein/e andere/r Urheber/in oder ein/e andere/r Urheberrechtsinhaber/in angegeben ist. Jede
        Nutzung dieser Inhalte darf nur mit schriftlicher Zustimmung des Ortsvereins erfolgen.
      </p>
    ),
  },
  {
    title: 'Haftung für Links',
    content: (
      <p>
        Wir haben auf unseren Seiten Links zu anderen Seiten im Internet. Für alle diese Links gilt, dass wir
        keinerlei Einfluss auf die Gestaltung und die Inhalte dieser Seiten haben. Deswegen übernehmen wir auch
        keinerlei Verantwortung für Inhalt und Gestaltung dieser Seiten. Diese Erklärung gilt für alle auf unserer
        Internetpräsenz angezeigten Links und für alle Inhalte der Seiten, zu denen die bei uns angemeldeten Banner
        und Links führen.
      </p>
    ),
  },
]

export default function Impressum() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <main className="flex-1 pt-20 pb-16">
      {/* Header */}
      <section className="bg-linear-to-br from-spd-red via-spd-red to-red-700 dark:from-red-900 dark:via-red-900 dark:to-red-950 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <FileText size={22} />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest text-red-200">Rechtliches</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black tracking-tight mb-4 text-left"
          >
            Impressum
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-red-100 text-lg max-w-2xl"
          >
            Angaben gemäß § 5 TMG sowie weitere rechtliche Hinweise.
          </motion.p>
        </div>
      </section>

      {/* Content */}
      <section ref={ref} className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="space-y-10">
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="border-b border-gray-200 dark:border-gray-800 pb-8 last:border-0"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{section.title}</h2>
              <div className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                {section.content}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  )
}

