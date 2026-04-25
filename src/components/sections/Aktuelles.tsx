import {memo, useEffect, useMemo, useRef, useState} from 'react'
import {motion, useInView} from 'framer-motion'
import {
  Calendar,
  CalendarPlus,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Rss,
  Search,
  Tag,
  X
} from 'lucide-react'
import {useData} from '../../hooks/useData'
import {useHttpErrorRedirect} from '../../hooks/useHttpErrorRedirect'
import {INSTAGRAM_PROFILE_URL, INSTAGRAM_USERNAME} from '../../shared/instagram.ts'
import {useConfig} from '../../hooks/useConfig'
import Sheet from '../Sheet'
import PhotoGallery from '../PhotoGallery'
import {type ICSEvent, parseICS} from '../../utils/icsParser'
import {formatLocation} from '../../utils/formatLocation'
import {useItemsPerPage} from '../../utils/useItemsPerPage'
import {formatDate} from '../../utils/formatDate'
import SectionHeader from '../SectionHeader'
import {createEvent, type DateArray} from 'ics'

interface NewsItem {
  id: string
  datum: string
  titel: string
  zusammenfassung: string
  inhalt: string
  kategorie: string
  bildUrl: string
  bildBeschreibung?: string
  bildUrls?: string[]
  bildBeschreibungen?: string[]
}

interface EventItem {
  id: string
  datum: string
  uhrzeit: string
  ganztaegig?: boolean
  titel: string
  ort: string
  beschreibung: string
}


const CATEGORY_COLORS: Record<string, string> = {
  Gemeinderat: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Veranstaltung: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Haushalt: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Ortsverein: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}


function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: d.toLocaleDateString('de-DE', { day: '2-digit' }),
    month: d.toLocaleDateString('de-DE', { month: 'short' }),
    weekday: d.toLocaleDateString('de-DE', { weekday: 'short' }),
    full: d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  }
}




function downloadICS(event: EventItem) {
  const d = new Date(event.datum + 'T00:00:00')

  const start: DateArray = event.ganztaegig
    ? [d.getFullYear(), d.getMonth() + 1, d.getDate()]
    : (() => {
        const [hours, minutes] = event.uhrzeit.split(':').map(Number)
        d.setHours(hours || 0, minutes || 0, 0, 0)
        return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()]
      })()

  const { error, value } = createEvent({
    start,
    startInputType: 'local',
    duration: event.ganztaegig ? { days: 1 } : { hours: 2 },
    title: event.titel,
    location: event.ort,
    description: event.beschreibung || undefined,
    uid: `${event.id}@spd-albstadt.de`,
    productId: 'SPD Albstadt//Events//DE',
  })

  if (error || !value) return

  const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${event.titel.replace(/[^a-zA-Z0-9äöüÄÖÜß -]/g, '').replace(/\s+/g, '-')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── CalendarView ──────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const CalendarView = memo(function CalendarView({
  events,
  onSelectEvent,
                                                  onSelectDayEvents,
}: {
  events: EventItem[]
  onSelectEvent: (e: EventItem) => void
  onSelectDayEvents: (events: EventItem[]) => void
}) {
  const [current, setCurrent] = useState(() => {
    const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1)
  })
  const year = current.getFullYear()
  const monthIdx = current.getMonth()

  const todayStr = useMemo(() => toDateStr(new Date()), [])

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {}
    events.forEach(e => { (map[e.datum] ??= []).push(e) })
    return map
  }, [events])

  const cells = useMemo(() => {
    const first = new Date(year, monthIdx, 1)
    const last = new Date(year, monthIdx + 1, 0)
    const offset = (first.getDay() + 6) % 7
    const d = new Date(first)
    d.setDate(d.getDate() - offset)
    const result: Date[] = []
    while (result.length < 42 && (result.length === 0 || d <= last || result.length % 7 !== 0)) {
      result.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return result
  }, [year, monthIdx])

  const monthEvents = useMemo(() =>
    events
      .filter(e => { const d = new Date(e.datum + 'T00:00:00'); return d.getFullYear() === year && d.getMonth() === monthIdx })
      .sort((a, b) => a.datum.localeCompare(b.datum)),
    [events, year, monthIdx]
  )

  const isCurrentMonth = year === new Date().getFullYear() && monthIdx === new Date().getMonth()
  const monthLabel = current.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setCurrent(new Date(year, monthIdx - 1, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-spd-red hover:bg-spd-red/10 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-spd-red" />
          <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <button
              onClick={() => setCurrent(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
              className="text-[11px] font-semibold text-spd-red hover:bg-spd-red/10 px-2 py-1 rounded-lg transition-colors mr-1"
            >
              Heute
            </button>
          )}
          <button
            onClick={() => setCurrent(new Date(year, monthIdx + 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-spd-red hover:bg-spd-red/10 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
          <div key={d} className="py-1.5 sm:py-2 text-center text-[9px] sm:text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
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
              disabled={!hasEvs}
              onClick={() => hasEvs && (dayEvs.length === 1 ? onSelectEvent(dayEvs[0]) : onSelectDayEvents(dayEvs))}
              className={`relative flex flex-col items-center justify-start pt-0.5 sm:pt-1 pb-1 sm:pb-1.5 rounded-lg sm:rounded-xl min-h-9 sm:min-h-11 transition-all
                ${!thisMonth ? 'opacity-20' : ''}
                ${hasEvs ? 'cursor-pointer hover:bg-spd-red/8 dark:hover:bg-spd-red/15' : 'cursor-default'}
              `}
            >
              <span className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[11px] sm:text-[12px] font-semibold leading-none
                ${isToday ? 'bg-spd-red text-white font-black' : thisMonth ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}
              `}>
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
            {monthEvents.length} Termin{monthEvents.length !== 1 ? 'e' : ''} im {current.toLocaleDateString('de-DE', { month: 'long' })}
          </p>
          {monthEvents.map(e => {
            const { day, month: mon, weekday } = formatEventDate(e.datum)
            return (
              <div
                key={e.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectEvent(e)}
                onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onSelectEvent(e) } }}
                className="w-full flex items-center gap-2.5 sm:gap-3 text-left p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group cursor-pointer"
              >
                <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-spd-red text-white flex flex-col items-center justify-center">
                  <span className="text-[10px] sm:text-[11px] font-black leading-none">{day}</span>
                  <span className="text-[6px] sm:text-[7px] uppercase opacity-80 tracking-wide">{mon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-spd-red transition-colors">{e.titel}</p>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 truncate">{weekday} · {e.ganztaegig ? 'Ganztägig' : `${e.uhrzeit} Uhr`}{e.ort ? ` · ${e.ort}` : ''}</p>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  <button
                    onClick={ev => { ev.stopPropagation(); downloadICS(e) }}
                    title="Termin speichern"
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-spd-red hover:bg-spd-red/10 transition-colors"
                  >
                    <CalendarPlus size={11} />
                  </button>
                  <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 group-hover:text-spd-red transition-colors" />
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

function EventDetailContent({ event }: { event: EventItem }) {
  const { day, month, full } = formatEventDate(event.datum)
  return (
    <div>
      {/* Hero */}
      <div className="bg-linear-to-br from-spd-red via-spd-red to-spd-red-dark px-5 sm:px-6 pt-6 sm:pt-8 pb-7 sm:pb-9 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.12),transparent_50%)]" />
        <span className="absolute -right-3 -bottom-4 text-[90px] sm:text-[120px] font-black text-white/6 leading-none select-none pointer-events-none">{day}</span>
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/15 backdrop-blur-sm rounded-full pl-0.5 pr-3 sm:pl-1 sm:pr-4 py-0.5 sm:py-1 mb-3 sm:mb-5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white flex flex-col items-center justify-center">
              <span className="text-xs sm:text-sm font-black text-spd-red leading-none">{day}</span>
              <span className="text-[6px] sm:text-[7px] font-bold text-spd-red/70 uppercase leading-none">{month}</span>
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
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Uhrzeit</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{event.ganztaegig ? 'Ganztägig' : `${event.uhrzeit} Uhr`}</p>
            </div>
          </div>
          {event.ort && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center">
                <MapPin size={15} className="text-spd-red" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ort</p>
                <p className="text-sm text-gray-900 dark:text-white leading-snug" style={{ hyphens: 'none' }}>
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
            <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Beschreibung</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{event.beschreibung}</p>
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

export default function Aktuelles() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const [dayEventsPickerList, setDayEventsPickerList] = useState<EventItem[]>([])
  const itemsPerPage = useItemsPerPage(768, 6, 3)
  const [visibleCount, setVisibleCount] = useState(itemsPerPage)
  useEffect(() => { setVisibleCount(itemsPerPage) }, [itemsPerPage])
  const [activeTag, setActiveTag] = useState<string>('Alle')
  const [searchQuery, setSearchQuery] = useState('')

  // ICS calendar state
  const [icsEvents, setIcsEvents] = useState<ICSEvent[]>([])
  const [icsLoading, setIcsLoading] = useState(false)
  const [icsError, setIcsError] = useState<string | null>(null)
  const [showSubscribeMenu, setShowSubscribeMenu] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchICS = async () => {
      setIcsLoading(true)
      setIcsError(null)
      try {
        const res = await fetch('/api/ics')
        if (!res.ok) {
          if (!cancelled) setIcsError(`Fehler beim Laden: HTTP ${res.status}`)
          return
        }
        const text = await res.text()
        const events = parseICS(text)
        if (!cancelled) {
          if (events.length === 0) {
            setIcsError('Keine Termine im ICS-Feed gefunden.')
          } else {
            setIcsEvents(events)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setIcsError(`Fehler beim Laden: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`)
        }
      } finally {
        if (!cancelled) setIcsLoading(false)
      }
    }
    fetchICS()
    return () => { cancelled = true }
  }, [])


  const {data: newsItems, error: newsError} = useData<NewsItem[]>('/data/news.json')
  const config = useConfig()
  const elfsightAppId = config?.elfsightAppId

  // Lazy-load the Elfsight platform script only when on this page
  useEffect(() => {
    if (!elfsightAppId) return
    const SCRIPT_ID = 'elfsight-platform'
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://elfsightcdn.com/platform.js'
      script.async = true
      document.head.appendChild(script)
    }
  }, [elfsightAppId])

  useHttpErrorRedirect(newsError)

  const allTags = newsItems
    ? ['Alle', ...Array.from(new Set(newsItems.map(n => n.kategorie)))]
    : ['Alle']

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredNews = newsItems
    ? newsItems
        .filter(n => activeTag === 'Alle' || n.kategorie === activeTag)
        .filter(n => {
          if (!normalizedQuery) return true
          return (
            n.titel.toLowerCase().includes(normalizedQuery) ||
            n.zusammenfassung.toLowerCase().includes(normalizedQuery) ||
            n.inhalt.toLowerCase().includes(normalizedQuery) ||
            n.kategorie.toLowerCase().includes(normalizedQuery)
          )
        })
    : null

  const visibleNews = filteredNews?.slice(0, visibleCount)
  const hasMore = filteredNews ? visibleCount < filteredNews.length : false

  function handleTagChange(tag: string) {
    setActiveTag(tag)
    setVisibleCount(itemsPerPage)
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setVisibleCount(itemsPerPage)
  }


  return (
    <section id="aktuelles" className="py-24 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <SectionHeader
          sectionRef={ref}
          isInView={isInView}
          label="Aktuelles"
          title={<>Neuigkeiten <span className="whitespace-nowrap">& Termine</span></>}
          description="Bleiben Sie informiert über aktuelle Themen der SPD Albstadt und kommende Veranstaltungen."
          mb="mb-12"
          descriptionClassName="max-w-2xl"
        />




        {/* ── News Feed ── */}
        <div className="min-w-0 mb-16">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center">
              <Tag size={15} className="text-spd-red" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Neuigkeiten</h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {filteredNews?.length ?? 0} Beitrag{(filteredNews?.length ?? 0) !== 1 ? 'e' : ''}
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="relative mb-4"
          >
            <label htmlFor="news-search" className="sr-only">Neuigkeiten durchsuchen</label>
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
            />
            <input
              id="news-search"
              type="search"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Neuigkeiten durchsuchen…"
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-spd-red/50 focus:ring-2 focus:ring-spd-red/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                aria-label="Suche zurücksetzen"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-spd-red hover:bg-spd-red/10 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center gap-2 mb-6"
          >
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagChange(tag)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 ${
                  activeTag === tag
                    ? 'bg-spd-red text-white border-spd-red shadow-sm'
                    : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-spd-red/50 hover:text-spd-red'
                }`}
              >
                {tag === 'Alle' ? tag : (<><Tag size={10} className="inline mr-1" />{tag}</>)}
              </button>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visibleNews?.map(news => (
              <article
                key={news.id}
                onClick={() => setSelectedNews(news)}
                className="group bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 cursor-pointer border border-gray-100 dark:border-gray-800 hover:border-spd-red/30 hover:shadow-xl hover:shadow-spd-red/5 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  {(news.bildUrls?.length || news.bildUrl) && (
                    <img
                        src={news.bildUrl || news.bildUrls?.[0]}
                      alt={news.titel}
                      loading="lazy"
                      className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-200 dark:bg-gray-800 object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[news.kategorie] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        <Tag size={10} className="inline mr-1" />
                        {news.kategorie}
                      </span>
                      <time className="text-xs text-gray-400 dark:text-gray-500">{formatDate(news.datum)}</time>
                    </div>
                    <h4 className="text-gray-900 dark:text-white font-bold text-base leading-snug mb-1.5 group-hover:text-spd-red transition-colors line-clamp-2">
                      {news.titel}
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-2 whitespace-pre-line">
                      {news.zusammenfassung}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-spd-red text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Weiterlesen <ChevronRight size={15} />
                </div>
              </article>
            ))}
          </div>

          {!newsItems && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-36 animate-pulse" />
              ))}
            </div>
          )}

          {filteredNews && filteredNews.length === 0 && (
            <div className="text-center py-10 text-gray-400 dark:text-gray-600">
              {normalizedQuery ? (
                <>
                  <Search size={28} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Keine Beiträge für „{searchQuery}"</p>
                </>
              ) : (
                <>
                  <Tag size={28} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Keine Beiträge für diese Kategorie</p>
                </>
              )}
            </div>
          )}

          {/* Pagination */}
          {filteredNews && filteredNews.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-6">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {Math.min(visibleCount, filteredNews.length)} von {filteredNews.length} Beiträgen
              </span>
              <div className="flex gap-2">
                {visibleCount > itemsPerPage && (
                  <button
                    onClick={() => setVisibleCount(v => Math.max(itemsPerPage, v - itemsPerPage))}
                    className="text-xs font-semibold text-gray-400 hover:text-spd-red transition-colors px-3 py-1.5 rounded-lg hover:bg-spd-red/5"
                  >
                    ↑ Weniger
                  </button>
                )}
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount(v => v + itemsPerPage)}
                    className="text-xs font-semibold text-spd-red border border-spd-red/30 hover:bg-spd-red hover:text-white transition-all px-3 py-1.5 rounded-lg"
                  >
                    Mehr laden ↓
                  </button>
                )}
              </div>
            </div>
          )}
        </div>


        {/* ── ICS Calendar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-16"
        >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center">
                  <Calendar size={15} className="text-spd-red" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Kalenderansicht</h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Alle Termine auf einen Blick</p>
                </div>
              </div>
              {config?.icsUrl && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowSubscribeMenu(v => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-spd-red/25 px-3 py-1.5 text-xs font-semibold text-spd-red hover:bg-spd-red hover:text-white transition-colors"
                  >
                    <Rss size={12} /> Abonnieren
                  </button>
                  {showSubscribeMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSubscribeMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 z-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden min-w-56">
                        <div className="px-3 pt-3 pb-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Kalender abonnieren</p>
                        </div>
                        <a
                          href={config.icsUrl.replace(/^https?:\/\//, 'webcal://')}
                          onClick={() => setShowSubscribeMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center shrink-0">
                            <Calendar size={13} className="text-spd-red" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">Apple / Outlook</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Kalender-App öffnen</p>
                          </div>
                        </a>
                        <a
                          href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(config.icsUrl)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setShowSubscribeMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <ExternalLink size={13} className="text-blue-500" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">Google Calendar</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Im Browser öffnen</p>
                          </div>
                        </a>
                        <div className="px-3 pb-3 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                          <a
                            href={config.icsUrl}
                            download
                            onClick={() => setShowSubscribeMenu(false)}
                            className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 hover:text-spd-red transition-colors"
                          >
                            <Rss size={10} /> ICS-Datei herunterladen
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {icsLoading && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-spd-red/20 dark:border-spd-red/30 border-t-spd-red rounded-full animate-spin" />
                <span className="text-sm text-gray-400 dark:text-gray-500">Termine werden geladen…</span>
              </div>
            )}

            {icsError && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">{icsError}</p>
              </div>
            )}

            {!icsLoading && icsEvents.length > 0 && (
              <CalendarView
                events={icsEvents.map(e => ({
                  id: e.id,
                  datum: e.datum,
                  uhrzeit: e.uhrzeit,
                  ganztaegig: e.ganztaegig,
                  titel: e.titel,
                  ort: e.ort,
                  beschreibung: e.beschreibung,
                }))}
                onSelectEvent={setSelectedEvent}
                onSelectDayEvents={setDayEventsPickerList}
              />
            )}
        </motion.div>

        {/* ── Instagram (Elfsight) ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mt-14"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center">
                <Camera size={15} className="text-spd-red" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Instagram</h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Neueste Beiträge von @{INSTAGRAM_USERNAME}</p>
              </div>
            </div>
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-spd-red/25 px-3 py-1.5 text-xs font-semibold text-spd-red hover:bg-spd-red hover:text-white transition-colors"
            >
              Folgen <ExternalLink size={12} />
            </a>
          </div>
          {elfsightAppId && (
            <div
              className={`elfsight-app-${elfsightAppId}`}
              data-elfsight-app-lazy
              data-elfsight-app-theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
            />
          )}
        </motion.div>
      </div>

      {/* News detail sheet */}
      <Sheet open={!!selectedNews} onClose={() => setSelectedNews(null)} size="lg">
        {selectedNews && (
          <div>
            {(selectedNews.bildUrls?.length || selectedNews.bildUrl) && (
              <PhotoGallery
                  images={[...(selectedNews.bildUrl ? [selectedNews.bildUrl] : []), ...(selectedNews.bildUrls || [])].filter(Boolean)}
                  captions={[...(selectedNews.bildUrl ? [selectedNews.bildBeschreibung || ''] : []), ...(selectedNews.bildBeschreibungen || [])]}
                alt={selectedNews.titel}
              />
            )}
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[selectedNews.kategorie] || ''}`}>
                  {selectedNews.kategorie}
                </span>
                <time className="text-sm text-gray-400">{formatDate(selectedNews.datum)}</time>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight mb-4">
                {selectedNews.titel}
              </h3>
              <div className="w-10 h-0.5 bg-spd-red rounded-full mb-5" />
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base whitespace-pre-line">
                {selectedNews.inhalt}
              </p>
            </div>
          </div>
        )}
      </Sheet>


      {/* Day events picker sheet (multiple events on one day) */}
      <Sheet open={dayEventsPickerList.length > 0} onClose={() => setDayEventsPickerList([])}>
        {dayEventsPickerList.length > 0 && (
            <div>
              <div
                  className="bg-linear-to-br from-spd-red via-spd-red to-spd-red-dark px-5 sm:px-6 pt-6 sm:pt-8 pb-5 sm:pb-6 relative overflow-hidden">
                <div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.12),transparent_50%)]"/>
                <div className="relative">
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">
                    {formatEventDate(dayEventsPickerList[0].datum).full}
                  </p>
                  <h3 className="font-black text-white text-lg sm:text-xl leading-tight">
                    {dayEventsPickerList.length} Termine an diesem Tag
                  </h3>
                </div>
              </div>
              <div className="px-3 sm:px-5 py-4 sm:py-5 space-y-2.5">
                {dayEventsPickerList.map(e => {
                  const {day, month: mon} = formatEventDate(e.datum)
                  return (
                      <div
                          key={e.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setDayEventsPickerList([]);
                            setSelectedEvent(e)
                          }}
                          onKeyDown={ev => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault();
                              setDayEventsPickerList([]);
                              setSelectedEvent(e)
                            }
                          }}
                          className="w-full flex items-center gap-3 sm:gap-4 text-left p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/40 hover:border-spd-red/40 hover:shadow-lg hover:shadow-spd-red/5 transition-all duration-200 group cursor-pointer"
                      >
                        <div
                            className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-spd-red text-white flex flex-col items-center justify-center shadow-sm shadow-spd-red/20">
                          <span className="text-xs sm:text-sm font-black leading-none">{day}</span>
                          <span className="text-[7px] sm:text-[8px] uppercase opacity-80 tracking-wide">{mon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-spd-red transition-colors">{e.titel}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock size={10} className="text-gray-400 dark:text-gray-500 shrink-0"/>
                            <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 truncate">{e.ganztaegig ? 'Ganztägig' : `${e.uhrzeit} Uhr`}{e.ort ? ` · ${e.ort}` : ''}</p>
                          </div>
                        </div>
                        <div
                            className="shrink-0 w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-spd-red/40 group-hover:bg-spd-red/5 transition-all">
                          <ChevronRight size={13}
                                        className="text-gray-300 dark:text-gray-600 group-hover:text-spd-red transition-colors"/>
                        </div>
                      </div>
                  )
                })}
              </div>
            </div>
        )}
      </Sheet>

      {/* Event detail sheet (shared by both calendars) */}
      <Sheet open={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
        {selectedEvent && <EventDetailContent event={selectedEvent} />}
      </Sheet>
    </section>
  )
}

