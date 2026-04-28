import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Calendar } from 'lucide-react'
import type { ICSEvent } from '@/utils/icsParser'
import SubsectionHeading from '@/components/SubsectionHeading'
import CalendarView from './CalendarView'
import CalendarSubscribeButton from './CalendarSubscribeButton'

interface Props {
  events: ICSEvent[]
  loading: boolean
  error: string | null
  icsUrl?: string
  onSelectEvent: (e: ICSEvent) => void
  onSelectDayEvents: (events: ICSEvent[]) => void
}

export default function CalendarSection({
  events,
  loading,
  error,
  icsUrl,
  onSelectEvent,
  onSelectDayEvents,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mb-16"
    >
      {/* Section header */}
      <SubsectionHeading
        icon={<Calendar size={15} className="text-spd-red" />}
        title="Kalenderansicht"
        subtitle="Alle Termine auf einen Blick"
        action={icsUrl ? <CalendarSubscribeButton icsUrl={icsUrl} /> : undefined}
      />

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 flex items-center justify-center gap-3">
          <span className="w-5 h-5 border-2 border-spd-red/20 dark:border-spd-red/30 border-t-spd-red rounded-full animate-spin" />
          <span className="text-sm text-gray-400 dark:text-gray-500">Termine werden geladen…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">{error}</p>
        </div>
      )}

      {/* Calendar */}
      {!loading && events.length > 0 && (
        <CalendarView
          events={events}
          onSelectEvent={onSelectEvent}
          onSelectDayEvents={onSelectDayEvents}
        />
      )}
    </motion.div>
  )
}
