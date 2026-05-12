import { type ReactNode, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useData } from '@/hooks/useData'
import { renderTextContent } from '@/utils/renderTextContent'
import LoadingSpinner from '@/components/LoadingSpinner'

interface LegalSection {
  title: string
  content: string
}

interface LegalData {
  beschreibung?: string
  sections: LegalSection[]
}

interface LegalPageProps {
  icon: ReactNode
  title: string
  category: string
  dataUrl: string
  descriptionFallback: string
}

export default function LegalPage({
  icon,
  title,
  category,
  dataUrl,
  descriptionFallback,
}: LegalPageProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { data, loading } = useData<LegalData>(dataUrl)

  const sections = data?.sections
  const beschreibung = data?.beschreibung ?? descriptionFallback

  return (
    <main className="flex-1 pt-20 pb-16">
      <section className="bg-linear-to-br from-spd-red via-spd-red to-red-700 dark:from-red-900 dark:via-red-900 dark:to-red-950 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              {icon}
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest text-red-200">
              {category}
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black tracking-tight mb-4 text-left"
          >
            {title}
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

      <section ref={ref} className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {loading && <LoadingSpinner size="md" className="py-20" />}
        {!loading && sections && (
          <div className="space-y-10">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: i * 0.07 }}
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
