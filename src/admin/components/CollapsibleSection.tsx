import { useState } from 'react'
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * A collapsible section header used across admin editors.
 *
 * - `variant="section"` (default): top-level section style with a right-pointing
 *   chevron that rotates 90° when open, used in ObjectEditor / TabEditor.
 * - `variant="subsection"`: sub-section style with up/down chevron, used inside
 *   year cards in KommunalpolitikEditor.
 */

interface CollapsibleSectionProps {
  label: string
  /** Optional item count shown as a badge */
  count?: number
  /** Extra className forwarded to the button wrapper */
  className?: string
  /** Style variant — defaults to "section" */
  variant?: 'section' | 'subsection'
  /** Whether the section starts open — defaults to true */
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  label,
  count,
  className,
  variant = 'section',
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`mb-6 ${className ?? ''}`}>
      <CollapsibleSectionHeader
        label={label}
        open={open}
        count={count}
        variant={variant}
        onClick={() => setOpen(v => !v)}
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * The clickable header part of a collapsible section.
 * Can also be used standalone when the open state is managed externally
 * (e.g. when an action button must share the same row).
 */
export function CollapsibleSectionHeader({
  label,
  open,
  count,
  variant = 'section',
  onClick,
}: {
  label: string
  open: boolean
  count?: number
  variant?: 'section' | 'subsection'
  onClick: () => void
}) {
  if (variant === 'subsection') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 text-left group w-full"
      >
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
          {label}
        </h4>
        {count !== undefined && (
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
            {count}
          </span>
        )}
        <span className="ml-auto text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 w-full py-3 mb-4 group"
    >
      <ChevronRight
        size={14}
        className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      />
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
        {label}
      </h3>
      {count !== undefined && (
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-linear-to-r from-gray-200 dark:from-gray-700 to-transparent ml-2" />
    </button>
  )
}
