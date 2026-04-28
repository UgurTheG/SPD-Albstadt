import { CalendarPlus, Clock, MapPin } from 'lucide-react'
import type { ICSEvent } from '@/utils/icsParser'
import { formatEventDate, downloadICS } from '@/utils/calendarUtils'
import { formatLocation } from '@/utils/formatLocation'

interface Props {
  event: ICSEvent
}

export default function EventDetailSheet({ event }: Props) {
  const { day, month, full } = formatEventDate(event.datum)

  return (
    <div>
      {/* Hero */}
      <div className="bg-linear-to-br from-spd-red via-spd-red to-spd-red-dark px-5 sm:px-6 pt-6 sm:pt-8 pb-7 sm:pb-9 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.12),transparent_50%)]" />
        <span className="absolute -right-3 -bottom-4 text-[90px] sm:text-[120px] font-black text-white/6 leading-none select-none pointer-events-none">
          {day}
        </span>
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/15 backdrop-blur-sm rounded-full pl-0.5 pr-3 sm:pl-1 sm:pr-4 py-0.5 sm:py-1 mb-3 sm:mb-5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white flex flex-col items-center justify-center">
              <span className="text-xs sm:text-sm font-black text-spd-red leading-none">{day}</span>
              <span className="text-[6px] sm:text-[7px] font-bold text-spd-red/70 uppercase leading-none">
                {month}
              </span>
            </div>
            <span className="text-white/90 text-[11px] sm:text-xs font-medium">{full}</span>
          </div>
          <h3 className="font-black text-white text-lg sm:text-2xl leading-tight">{event.titel}</h3>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 space-y-4">
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center">
              <Clock size={15} className="text-spd-red" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Uhrzeit
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {event.ganztaegig ? 'Ganztägig' : `${event.uhrzeit} Uhr`}
              </p>
            </div>
          </div>
          {event.ort && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center">
                <MapPin size={15} className="text-spd-red" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Ort
                </p>
                <p
                  className="text-sm text-gray-900 dark:text-white leading-snug"
                  style={{ hyphens: 'none' }}
                >
                  {formatLocation(event.ort).map((line, i) => (
                    <span key={i}>
                      {i > 0 && <br />}
                      {i === 0 ? <span className="font-semibold">{line}</span> : line}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          )}
        </div>

        {event.beschreibung && (
          <div>
            <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Beschreibung
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {event.beschreibung}
            </p>
          </div>
        )}
      </div>

      <div className="px-5 sm:px-6 pt-5 pb-6 sm:pb-8">
        <button
          onClick={() => downloadICS(event)}
          className="w-full flex items-center justify-center gap-2 bg-spd-red hover:bg-spd-red-dark active:scale-[0.98] text-white text-sm font-bold py-3 px-5 rounded-xl transition-all"
        >
          <CalendarPlus size={16} />
          Termin speichern (.ics)
        </button>
      </div>
    </div>
  )
}
