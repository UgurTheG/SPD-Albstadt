import { useRef, useState, useMemo, useCallback, memo } from 'react'
import { motion, useInView } from 'framer-motion'
import { ChevronRight, Images } from 'lucide-react'
import { useData } from '../../hooks/useData'
import Sheet from '../Sheet'
import PhotoGallery from '../PhotoGallery'

interface TimelineEntry {
  jahr: string
  titel: string
  beschreibung: string
  bilder?: string[]
  bilderBeschreibungen?: string[]
}

interface Persoenlichkeit {
  name: string
  jahre: string
  rolle: string
  beschreibung: string
  bildUrl: string
}

interface HistoryData {
  einleitung: string
  timeline: TimelineEntry[]
  persoenlichkeiten: Persoenlichkeit[]
}

type MergedItem =
  | { type: 'event'; year: number; data: TimelineEntry }
  | { type: 'person'; year: number; data: Persoenlichkeit }

function parseFirstYear(jahre: string): number {
  const matches = jahre.match(/\d{4}/g)
  if (!matches) return 9999
  return Math.min(...matches.map(Number))
}

function Avatar({ name, imageUrl, size = 'md' }: { name: string; imageUrl?: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const sizes = { sm: 'w-10 h-10 text-sm', md: 'w-14 h-14 text-lg', lg: 'w-20 h-20 text-2xl' }
  if (imageUrl) return <img loading="lazy" src={imageUrl} alt={name} className={`${sizes[size]} rounded-full object-cover shrink-0`} />
  return (
    <div className={`${sizes[size]} rounded-full bg-spd-red flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  )
}

// ─── Event card (Chronik) ────────────────────────────────────────────────────

const EventCard = memo(function EventCard({ entry, isLeft, onOpen }: { entry: TimelineEntry; isLeft: boolean; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className={`max-w-sm w-full cursor-pointer group rounded-[18px] p-5
                  bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm
                  shadow-sm dark:shadow-black/20
                  hover:shadow-lg hover:shadow-spd-red/10 dark:hover:shadow-spd-red/15
                  hover:-translate-y-0.5
                  transition-all duration-500
                  ${isLeft ? 'text-right' : 'text-left'}`}
    >
      <span className="text-3xl font-black text-spd-red dark:text-spd-red leading-none block mb-2">
        {entry.jahr}
      </span>
      <h4 className="font-bold text-gray-900 dark:text-white mb-1.5 text-base group-hover:text-spd-red transition-colors duration-300">{entry.titel}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">{entry.beschreibung}</p>
      <span className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-spd-red/70 group-hover:text-spd-red transition-colors ${isLeft ? 'flex-row-reverse' : ''}`}>
        Mehr lesen <ChevronRight size={13} className={`transition-transform ${isLeft ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
        {entry.bilder && entry.bilder.length > 0 && (
          <span className="flex items-center gap-0.5 ml-1 text-gray-400"><Images size={12} />{entry.bilder.length}</span>
        )}
      </span>
    </button>
  )
})

// ─── Person card (Persoenlichkeit) ────────────────────────────────────────────

const PersonCard = memo(function PersonCard({ p, onOpen }: { p: Persoenlichkeit; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-[18px] overflow-hidden
                 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm
                 shadow-sm dark:shadow-black/20
                 hover:shadow-xl hover:shadow-spd-red/10 dark:hover:shadow-spd-red/20
                 hover:-translate-y-0.5
                 transition-all duration-500 group"
    >
      <div className="flex gap-4 p-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 group-hover:ring-spd-red/50 transition-all duration-500">
          <Avatar name={p.name} imageUrl={p.bildUrl || undefined} size="md" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{p.jahre}</p>
          <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-snug group-hover:text-spd-red transition-colors duration-300">{p.name}</h4>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">{p.rolle}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mt-1.5 whitespace-pre-line">
            {p.beschreibung}
          </p>
        </div>
        <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-spd-red group-hover:translate-x-0.5 transition-all shrink-0 mt-4" />
      </div>
    </button>
  )
})

// ─── Unified timeline row ────────────────────────────────────────────────────

const TimelineRow = memo(function TimelineRow({ item, index, onOpenEvent, onOpenPerson }: {
  item: MergedItem
  index: number
  onOpenEvent: (e: TimelineEntry) => void
  onOpenPerson: (p: Persoenlichkeit) => void
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { margin: '-20px', once: false })
  const isLeft = index % 2 === 0

  const show = { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } }
  const hideLeft = { opacity: 0, x: 30, transition: { duration: 0.4, ease: [0.42, 0, 1, 1] as const } }
  const hideRight = { opacity: 0, x: -30, transition: { duration: 0.4, ease: [0.42, 0, 1, 1] as const } }

  // Dot colour: red for events, white-outlined for persons
  const dot = item.type === 'event'
    ? 'w-4 h-4 bg-spd-red border-4 border-white dark:border-gray-900'
    : 'w-3 h-3 bg-white dark:bg-gray-900 border-2 border-spd-red'

  const card = item.type === 'event'
    ? <EventCard entry={item.data} isLeft={isLeft} onOpen={() => onOpenEvent(item.data)} />
    : <PersonCard p={item.data} onOpen={() => onOpenPerson(item.data)} />

  return (
    <div ref={ref} className="relative flex items-start gap-0 md:gap-8">
      {/* Desktop left slot */}
      <div className={`hidden md:flex flex-1 ${isLeft ? 'justify-end' : 'justify-start'}`}>
        {isLeft ? (
          <motion.div initial={hideLeft} animate={isInView ? show : hideLeft}
            className="w-full max-w-sm">
            {card}
          </motion.div>
        ) : <div />}
      </div>

      {/* Dot */}
      <div className="relative flex flex-col items-center shrink-0 w-4 md:w-auto">
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1, transition: { duration: 0.4, type: 'spring', stiffness: 400 } } : { scale: 0, transition: { duration: 0.3 } }}
          className={`${dot} rounded-full shadow-md relative z-10`} />
      </div>

      {/* Desktop right slot */}
      <div className="flex-1">
        {!isLeft ? (
          <motion.div initial={hideRight} animate={isInView ? show : hideRight}
            className="hidden md:block w-full max-w-sm">
            {card}
          </motion.div>
        ) : <div />}

        {/* Mobile — always show */}
        <motion.div initial={hideRight} animate={isInView ? show : hideRight}
          className="md:hidden pl-4">
          {item.type === 'event'
            ? <EventCard entry={item.data} isLeft={false} onOpen={() => onOpenEvent(item.data)} />
            : <PersonCard p={item.data} onOpen={() => onOpenPerson(item.data)} />}
        </motion.div>
      </div>
    </div>
  )
})

// ─── Main section ────────────────────────────────────────────────────────────

export default function Historie() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { data } = useData<HistoryData>('/data/history.json')

  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<Persoenlichkeit | null>(null)

  const handleOpenEvent = useCallback((e: TimelineEntry) => setSelectedEntry(e), [])
  const handleOpenPerson = useCallback((p: Persoenlichkeit) => setSelectedPerson(p), [])

  // Merge both arrays and sort oldest-first
  const merged = useMemo<MergedItem[]>(() => [
    ...(data?.timeline ?? []).map(e => ({ type: 'event' as const, year: parseFirstYear(e.jahr), data: e })),
    ...(data?.persoenlichkeiten ?? []).map(p => ({ type: 'person' as const, year: parseFirstYear(p.jahre), data: p })),
  ].sort((a, b) => a.year - b.year), [data])

  return (
    <section id="historie" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="relative mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1 w-12 bg-spd-red rounded-full" />
            <span className="text-spd-red font-semibold text-sm uppercase tracking-wider">Historie</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-6 text-left">
            Geschichte der SPD Albstadt
          </h2>
          {data && <p className="text-lg text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed">{data.einleitung}</p>}
        </motion.div>

        {/* Legend */}
        {merged.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-6 mb-12 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-spd-red inline-block" /> Ereignis
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-spd-red bg-white dark:bg-gray-900 inline-block" /> Kommunale Persönlichkeit
            </span>
          </motion.div>
        )}

        {/* Unified timeline */}
        {merged.length > 0 && (
          <div className="relative">
            <motion.div initial={{ scaleY: 0 }} animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.3 }}
              style={{ originY: 0 }}
              className="absolute left-2 md:left-1/2 top-0 bottom-0 w-px bg-linear-to-b from-spd-red/60 via-spd-red/50 to-spd-red/30 md:-translate-x-px" />
            <div className="space-y-10 relative">
              {merged.map((item, i) => (
                <TimelineRow
                  key={item.type === 'event' ? `e-${item.data.jahr}` : `p-${item.data.name}`}
                  item={item}
                  index={i}
                  onOpenEvent={handleOpenEvent}
                  onOpenPerson={handleOpenPerson}
                />
              ))}
            </div>
          </div>
        )}

        {!data && (
          <div className="space-y-10">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}
      </div>

      {/* Event detail sheet */}
      <Sheet open={!!selectedEntry} onClose={() => setSelectedEntry(null)} size="lg">
        {selectedEntry && (
          <div>
            <div className="sticky top-0 z-20 px-6 pt-8 pb-8 overflow-hidden bg-gray-950">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(227,0,15,0.08),transparent_50%)]" />
              <span className="absolute -right-4 top-0 text-[120px] font-black text-white/4 leading-none select-none pointer-events-none">
                {selectedEntry.jahr.split('–')[0]}
              </span>
              <div className="relative">
                <div className="w-10 h-0.5 bg-spd-red rounded-full mb-5" />
                <p className="text-spd-red/70 text-xs font-bold uppercase tracking-widest mb-1.5">{selectedEntry.jahr}</p>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">{selectedEntry.titel}</h3>
              </div>
            </div>
            <div className="px-6 pt-6 pb-8">
              {selectedEntry.bilder && selectedEntry.bilder.length > 0 && (
                <div className="mb-8">
                  <PhotoGallery
                    images={selectedEntry.bilder}
                    captions={selectedEntry.bilderBeschreibungen}
                    alt={selectedEntry.titel}
                  />
                </div>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{selectedEntry.beschreibung}</p>
            </div>
          </div>
        )}
      </Sheet>

      {/* Person detail sheet */}
      <Sheet open={!!selectedPerson} onClose={() => setSelectedPerson(null)}>
        {selectedPerson && (
          <div>
            {/* Hero header with full portrait */}
            <div className="relative overflow-hidden bg-gray-900">
              {selectedPerson.bildUrl ? (
                <img
                  src={selectedPerson.bildUrl}
                  alt={selectedPerson.name}
                  loading="lazy"
                  className="w-full block"
                />
              ) : (
                <div className="w-full aspect-square bg-linear-to-br from-spd-red to-spd-red-dark flex items-center justify-center">
                  <span className="text-6xl font-bold text-white/90">
                    {selectedPerson.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/50 to-gray-900/10" />
              {/* Info on overlay */}
              <div className="absolute bottom-0 inset-x-0 px-6 pb-7">
                <p className="text-[11px] font-medium text-gray-400 mb-1">{selectedPerson.rolle}</p>
                <h3 className="font-black text-white text-2xl leading-snug">{selectedPerson.name}</h3>
                <p className="text-sm text-white/60 mt-1">{selectedPerson.jahre}</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pt-6 pb-8">
              <div className="w-8 h-0.5 bg-spd-red/40 rounded-full mb-5" />
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{selectedPerson.beschreibung}</p>
            </div>
          </div>
        )}
      </Sheet>
    </section>
  )
}
