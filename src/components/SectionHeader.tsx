import { type ReactNode, type RefObject } from 'react'
import { motion } from 'framer-motion'

interface SectionHeaderProps {
  /** The ref returned by useRef — passed to the motion.div so useInView works. */
  sectionRef: RefObject<HTMLDivElement | null>
  /** Whether the section is in the viewport (from useInView in the parent). */
  isInView: boolean
  /** Small uppercase label above the title, e.g. "Fraktion". */
  label: string
  /** Main heading — accepts ReactNode so inline elements (spans etc.) are supported. */
  title: ReactNode
  /** Optional description paragraph below the heading. Not rendered when falsy. */
  description?: ReactNode
  /** Tailwind margin-bottom class for the wrapper. Default: 'mb-16'. */
  mb?: string
  /** Extra Tailwind classes applied to the description <p>. */
  descriptionClassName?: string
}

/**
 * Shared animated section intro block used by Aktuelles, Partei,
 * Fraktion and Historie.
 *
 * Layout:  red pill accent + label
 *          big h2 title
 *          optional description paragraph
 */
export default function SectionHeader({
  sectionRef,
  isInView,
  label,
  title,
  description,
  mb = 'mb-16',
  descriptionClassName = 'max-w-3xl leading-relaxed whitespace-pre-line',
}: SectionHeaderProps) {
  return (
    <motion.div
      ref={sectionRef}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className={`relative ${mb}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-1 w-12 bg-spd-red rounded-full" />
        <span className="text-spd-red font-semibold text-sm uppercase tracking-wider">{label}</span>
      </div>

      <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight text-left">
        {title}
      </h2>

      {description && (
        <p className={`mt-4 text-lg text-gray-500 dark:text-gray-400 ${descriptionClassName}`}>
          {description}
        </p>
      )}
    </motion.div>
  )
}
