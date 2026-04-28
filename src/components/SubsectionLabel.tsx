import { motion } from 'framer-motion'

interface SubsectionLabelProps {
  /** Small uppercase category label. */
  label: string
  /** Optional larger title shown below the label (e.g. "Haushaltsreden"). */
  title?: string
  /** Whether the parent section is in view (from useInView in the parent). */
  isInView: boolean
  /** Animation delay in seconds. Default: 0. */
  delay?: number
  /** Tailwind margin-bottom class applied to the wrapper. Default: 'mb-8'. */
  mb?: string
}

/**
 * Animated subsection label used to introduce groups within a section.
 *
 * Layout:  small uppercase label
 *          optional large bold title beneath it
 *
 * Used by: Partei (Schwerpunkte / Vorstand / Abgeordnete),
 *          Fraktion (Dokumente / Haushaltsreden).
 */
export default function SubsectionLabel({
  label,
  title,
  isInView,
  delay = 0,
  mb = 'mb-8',
}: SubsectionLabelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className={mb}
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {label}
      </h3>
      {title && <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{title}</p>}
    </motion.div>
  )
}
