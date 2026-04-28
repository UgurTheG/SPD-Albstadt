import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { FileText } from 'lucide-react'
import { useData } from '@/hooks/useData'
import { renderTextContent } from '@/utils/renderTextContent'

interface ImpressumSection {
  title: string
  content: string
}

interface ImpressumData {
  beschreibung?: string
  sections: ImpressumSection[]
}

export default function Impressum() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { data, loading } = useData<ImpressumData>('/data/impressum.json')

  const sections = data?.sections
  const beschreibung =
    data?.beschreibung ?? 'Angaben gemäß § 5 TMG sowie weitere rechtliche Hinweise.'

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
            <span className="text-sm font-semibold uppercase tracking-widest text-red-200">
              Rechtliches
            </span>
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
            {beschreibung}
          </motion.p>
        </div>
      </section>

      {/* Content */}
      <section ref={ref} className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-spd-red/30 border-t-spd-red rounded-full animate-spin" />
          </div>
        )}
        {!loading && sections && (
          <div className="space-y-10">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="border-b border-gray-200 dark:border-gray-800 pb-8 last:border-0"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {section.title}
                </h2>
                <div className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                  {renderTextContent(section.content)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
