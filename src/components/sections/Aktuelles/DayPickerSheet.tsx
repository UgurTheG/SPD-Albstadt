import { ChevronRight, Clock } from 'lucide-react'
import type { ICSEvent } from '@/utils/icsParser'
import { formatEventDate } from '@/utils/calendarUtils'

interface Props {
  events: ICSEvent[]
  onSelect: (event: ICSEvent) => void
}

export default function DayPickerSheet({ events, onSelect }: Props) {
  if (events.length === 0) return null

  return (
    <div>
      <div className="bg-linear-to-br from-spd-red via-spd-red to-spd-red-dark px-5 sm:px-6 pt-6 sm:pt-8 pb-5 sm:pb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">
            {formatEventDate(events[0].datum).full}
          </p>
          <h3 className="font-black text-white text-lg sm:text-xl leading-tight">
            {events.length} Termine an diesem Tag
          </h3>
        </div>
      </div>

      <div className="px-3 sm:px-5 py-4 sm:py-5 space-y-2.5">
        {events.map(e => {
          const { day, month: mon } = formatEventDate(e.datum)
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelect(e)}
              className="w-full flex items-center gap-3 sm:gap-4 text-left p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/40 hover:border-spd-red/40 hover:shadow-lg hover:shadow-spd-red/5 transition-all duration-200 group cursor-pointer"
            >
              <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-spd-red text-white flex flex-col items-center justify-center shadow-sm shadow-spd-red/20">
                <span className="text-xs sm:text-sm font-black leading-none">{day}</span>
                <span className="text-[7px] sm:text-[8px] uppercase opacity-80 tracking-wide">
                  {mon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-spd-red transition-colors">
                  {e.titel}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock size={10} className="text-gray-400 dark:text-gray-500 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 truncate">
                    {e.ganztaegig ? 'Ganztägig' : `${e.uhrzeit} Uhr`}
                    {e.ort ? ` · ${e.ort}` : ''}
                  </p>
                </div>
              </div>
              <div className="shrink-0 w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-spd-red/40 group-hover:bg-spd-red/5 transition-all">
                <ChevronRight
                  size={13}
                  className="text-gray-300 dark:text-gray-600 group-hover:text-spd-red transition-colors"
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
