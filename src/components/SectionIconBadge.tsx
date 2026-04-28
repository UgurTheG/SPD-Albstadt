import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Shared icon badge used in section sub-headers throughout Aktuelles.
 * Renders a small rounded square with the SPD-red tinted background.
 */
export default function SectionIconBadge({ children }: Props) {
  return (
    <div className="w-8 h-8 rounded-lg bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center">
      {children}
    </div>
  )
}
