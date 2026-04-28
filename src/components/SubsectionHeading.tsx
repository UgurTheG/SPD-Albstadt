import type { ReactNode } from 'react'
import SectionIconBadge from './SectionIconBadge'

interface Props {
  icon: ReactNode
  title: string
  /** Supports ReactNode so dynamic counts can be passed (e.g. "3 Beiträge"). */
  subtitle: ReactNode
  /** Optional element placed on the right side (e.g. a subscribe button or link). */
  action?: ReactNode
  /** Tailwind margin-bottom class. Default: 'mb-5'. */
  mb?: string
}

/**
 * Reusable sub-section header used within Aktuelles sub-components:
 * NewsFeed, CalendarSection, InstagramSection.
 *
 * Layout: [icon badge]  [h3 title / subtitle p]   [optional action]
 */
export default function SubsectionHeading({ icon, title, subtitle, action, mb = 'mb-5' }: Props) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${mb}`}>
      <div className="flex items-center gap-2.5">
        <SectionIconBadge>{icon}</SectionIconBadge>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  )
}
