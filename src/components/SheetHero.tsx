import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface SheetHeroProps {
  /** Vertical padding (and any other overrides) for this sheet. */
  className?: string
  /** Absolutely positioned decoration rendered behind the content. */
  decoration?: ReactNode
  children: ReactNode
}

/** Red gradient header at the top of a detail sheet. */
export default function SheetHero({ className, decoration, children }: SheetHeroProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-linear-to-br from-spd-red via-spd-red to-spd-red-dark px-5 sm:px-6',
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.12),transparent_50%)]" />
      {decoration}
      <div className="relative">{children}</div>
    </div>
  )
}
