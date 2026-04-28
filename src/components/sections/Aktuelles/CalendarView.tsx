import { memo, useMemo, useState } from 'react'
import { Calendar, CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ICSEvent } from '@/utils/icsParser'
import { toDateStr, formatEventDate, downloadICS } from '@/utils/calendarUtils'
import { cn } from '@/utils/cn'

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

interface Props {
  events: ICSEvent[]
  onSelectEvent: (e: ICSEvent) => void
  onSelectDayEvents: (events: ICSEvent[]) => void
}

const CalendarView = memo(function CalendarView({
  events,
  onSelectEvent,
  onSelectDayEvents,
}: Props) {
  const [current, setCurrent] = useState(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), 1)
  })
  const year = current.getFullYear()
  const monthIdx = current.getMonth()

  // Re-compute today on each render — avoids stale highlight when the tab
  // is left open overnight.
  const today = new Date()
  const todayStr = toDateStr(today)

  const eventsByDate = useMemo(() => {
    const map: Record<string, ICSEvent[]> = {}
    events.forEach(e => {
      ;(map[e.datum] ??= []).push(e)
    })
    return map
  }, [events])

  const cells = useMemo(() => {
    const first = new Date(year, monthIdx, 1)
    // Monday-aligned start: offset = 0 (Mon) … 6 (Sun)
    const offset = (first.getDay() + 6) % 7
    const d = new Date(first)
    d.setDate(d.getDate() - offset)
    // Always render exactly 6 rows × 7 cols = 42 cells
    const result: Date[] = []
    for (let i = 0; i < 42; i++) {
      result.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return result
  }, [year, monthIdx])

  const monthEvents = useMemo(
    () =>
      events
        .filter(e => {
          const d = new Date(e.datum + 'T00:00:00')
          return d.getFullYear() === year && d.getMonth() === monthIdx
        })
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [events, year, monthIdx],
  )

  const isCurrentMonth = year === today.getFullYear() && monthIdx === today.getMonth()
  const monthLabel = current.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setCurrent(new Date(year, monthIdx - 1, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-spd-red hover:bg-spd-red/10 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-spd-red" />
          <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
            {monthLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="text-[11px] font-semibold text-spd-red hover:bg-spd-red/10 px-2 py-1 rounded-lg transition-colors mr-1"
            >
              Heute
            </button>
          )}
          <button
            type="button"
            onClick={() => setCurrent(new Date(year, monthIdx + 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-spd-red hover:bg-spd-red/10 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {WEEKDAY_LABELS.map(d => (
          <div
            key={d}
            className="py-1.5 sm:py-2 text-center text-[9px] sm:text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 p-1 sm:p-2 gap-px sm:gap-0.5">
        {cells.map((cell, i) => {
          const ds = toDateStr(cell)
          const dayEvs = eventsByDate[ds] ?? []
          const thisMonth = cell.getMonth() === monthIdx
          const isToday = ds === todayStr
          const hasEvs = dayEvs.length > 0 && thisMonth
          return (
            <button
              key={i}
              type="button"
              disabled={!hasEvs}
              onClick={() =>
                hasEvs &&
                (dayEvs.length === 1 ? onSelectEvent(dayEvs[0]) : onSelectDayEvents(dayEvs))
              }
              className={cn(
                'relative flex flex-col items-center justify-start pt-0.5 sm:pt-1 pb-1 sm:pb-1.5 rounded-lg sm:rounded-xl min-h-9 sm:min-h-11 transition-all',
                !thisMonth && 'opacity-20',
                hasEvs
                  ? 'cursor-pointer hover:bg-spd-red/8 dark:hover:bg-spd-red/15'
                  : 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[11px] sm:text-[12px] font-semibold leading-none',
                  isToday
                    ? 'bg-spd-red text-white font-black'
                    : thisMonth
                      ? 'text-gray-800 dark:text-gray-100'
                      : 'text-gray-400',
                )}
              >
                {cell.getDate()}
              </span>
              {hasEvs && (
                <span className="flex gap-0.5 mt-px sm:mt-0.5">
                  {dayEvs.slice(0, 3).map((_, j) => (
                    <span key={j} className="w-1 h-1 rounded-full bg-spd-red" />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Month event list */}
      {monthEvents.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 sm:px-5 py-2.5 sm:py-3 space-y-0.5 sm:space-y-1">
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2">
            {monthEvents.length} Termin{monthEvents.length !== 1 ? 'e' : ''} im{' '}
            {current.toLocaleDateString('de-DE', { month: 'long' })}
          </p>
          {monthEvents.map(e => {
            const { day, month: mon, weekday } = formatEventDate(e.datum)
            return (
              // Outer div is the visual row — both the row-click and the download action
              // are sibling <button>s, avoiding the invalid nested-button pattern.
              <div
                key={e.id}
                className="relative flex items-center gap-2.5 sm:gap-3 p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
              >
                {/* Full-coverage transparent button — activates the row */}
                <button
                  type="button"
                  onClick={() => onSelectEvent(e)}
                  className="absolute inset-0 rounded-lg sm:rounded-xl focus-visible:ring-2 focus-visible:ring-spd-red focus-visible:outline-none"
                  aria-label={`${e.titel} öffnen`}
                />

                {/* Date badge */}
                <div className="relative shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-spd-red text-white flex flex-col items-center justify-center">
                  <span className="text-[10px] sm:text-[11px] font-black leading-none">{day}</span>
                  <span className="text-[6px] sm:text-[7px] uppercase opacity-80 tracking-wide">
                    {mon}
                  </span>
                </div>

                {/* Text */}
                <div className="relative flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-spd-red transition-colors">
                    {e.titel}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {weekday} · {e.ganztaegig ? 'Ganztägig' : `${e.uhrzeit} Uhr`}
                    {e.ort ? ` · ${e.ort}` : ''}
                  </p>
                </div>

                {/* Actions — relative so they sit above the transparent overlay */}
                <div className="relative flex items-center gap-0.5 sm:gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={ev => {
                      ev.stopPropagation()
                      downloadICS(e)
                    }}
                    title="Termin speichern"
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-spd-red hover:bg-spd-red/10 transition-colors"
                  >
                    <CalendarPlus size={11} />
                  </button>
                  <ChevronRight
                    size={12}
                    className="text-gray-300 dark:text-gray-600 group-hover:text-spd-red transition-colors"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {monthEvents.length === 0 && (
        <p className="px-4 sm:px-5 py-3 sm:py-4 text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 text-center border-t border-gray-100 dark:border-gray-800">
          Keine Termine in diesem Monat
        </p>
      )}
    </div>
  )
})

export default CalendarView
