import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface Props {
  id: string
  /** Extra classes on the outer <section>. Overrides the default bg-gray-50 dark:bg-gray-900 via twMerge. */
  className?: string
  /** Extra classes on the inner content <div>. */
  innerClassName?: string
  /** Content rendered inside <section> but before the inner max-w-7xl <div> (e.g. absolute decorations). */
  before?: ReactNode
  children: ReactNode
}

export default function SectionPage({ id, className, innerClassName, before, children }: Props) {
  return (
    <section id={id} className={cn('py-24 bg-gray-50 dark:bg-gray-900', className)}>
      {before}
      <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', innerClassName)}>
        {children}
      </div>
    </section>
  )
}
