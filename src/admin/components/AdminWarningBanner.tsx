import { AlertTriangle } from 'lucide-react'

interface Props {
  title?: string
  children: React.ReactNode
  /** Icon size in px — defaults to 14 */
  iconSize?: number
}

/**
 * Shared amber warning banner used in AdminApp and TabEditor.
 * Renders a consistent glassmorphism-styled alert box.
 */
export default function AdminWarningBanner({ title, children, iconSize = 14 }: Props) {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40 rounded-2xl px-4 py-3">
      <AlertTriangle
        size={iconSize}
        className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
      />
      <div>
        {title && (
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-0.5">{title}</p>
        )}
        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">{children}</div>
      </div>
    </div>
  )
}
