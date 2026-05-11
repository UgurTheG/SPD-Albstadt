import { type ReactNode } from 'react'

interface SectionContainerProps {
  id: string
  className?: string
  children: ReactNode
}

export default function SectionContainer({
  id,
  className = 'bg-gray-50 dark:bg-gray-900',
  children,
}: SectionContainerProps) {
  return (
    <section id={id} className={`py-24 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  )
}
