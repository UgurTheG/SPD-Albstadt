import { memo, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'
import type { MergedItem, TimelineEntry, Persoenlichkeit } from './types'
import { TIMELINE_TYPE_META } from './types'
import { EventCard } from './EventCard'
import { PersonlichkeitCard } from './PersonlichkeitCard'

// ─── Animation variants — defined at module scope so they are not recreated on every render ──

const SHOW = {
  opacity: 1,
  x: 0,
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
}
const HIDE_LEFT = {
  opacity: 0,
  x: 30,
  transition: { duration: 0.4, ease: [0.42, 0, 1, 1] as const },
}
const HIDE_RIGHT = {
  opacity: 0,
  x: -30,
  transition: { duration: 0.4, ease: [0.42, 0, 1, 1] as const },
}

// ─── Render-map ───────────────────────────────────────────────────────────────
// Adding a new MergedItem type only requires a new entry here — no if/else chains.

type Handlers = {
  onOpenEvent: (e: TimelineEntry) => void
  onOpenPerson: (p: Persoenlichkeit) => void
}

const CARD_RENDERERS: {
  [K in MergedItem['type']]: (
    item: Extract<MergedItem, { type: K }>,
    isLeft: boolean,
    handlers: Handlers,
  ) => ReactNode
} = {
  event: (item, isLeft, { onOpenEvent }) => (
    <EventCard entry={item.data} isLeft={isLeft} onOpen={() => onOpenEvent(item.data)} />
  ),
  person: (item, _isLeft, { onOpenPerson }) => (
    <PersonlichkeitCard p={item.data} onOpen={() => onOpenPerson(item.data)} />
  ),
}

// ─── Dot styles are now part of TIMELINE_TYPE_META in types.ts ───────────────

function renderCard(item: MergedItem, isLeft: boolean, handlers: Handlers): ReactNode {
  // Cast needed because TypeScript can't narrow the generic through the map index.
  return (CARD_RENDERERS[item.type] as (i: MergedItem, l: boolean, h: Handlers) => ReactNode)(
    item,
    isLeft,
    handlers,
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export const TimelineRow = memo(function TimelineRow({
  item,
  index,
  onOpenEvent,
  onOpenPerson,
}: {
  item: MergedItem
  index: number
  onOpenEvent: (e: TimelineEntry) => void
  onOpenPerson: (p: Persoenlichkeit) => void
}) {
  const ref = useRef(null)
  // once: false is intentional — cards animate back out when scrolled away,
  // reinforcing the chronological "journey through time" feel.
  const isInView = useInView(ref, { margin: '-20px', once: false })
  const isLeft = index % 2 === 0
  const handlers: Handlers = useMemo(
    () => ({ onOpenEvent, onOpenPerson }),
    [onOpenEvent, onOpenPerson],
  )

  const dot = TIMELINE_TYPE_META[item.type].rowDotClass

  return (
    <div ref={ref} className="relative flex items-start gap-0 md:gap-8">
      {/* Desktop left slot */}
      <div className={`hidden md:flex flex-1 ${isLeft ? 'justify-end' : 'justify-start'}`}>
        {isLeft ? (
          <motion.div
            initial={HIDE_LEFT}
            animate={isInView ? SHOW : HIDE_LEFT}
            className="w-full max-w-sm"
          >
            {renderCard(item, isLeft, handlers)}
          </motion.div>
        ) : (
          <div />
        )}
      </div>

      {/* Dot */}
      <div className="relative flex flex-col items-center shrink-0 w-4 md:w-auto">
        <motion.div
          initial={{ scale: 0 }}
          animate={
            isInView
              ? { scale: 1, transition: { duration: 0.4, type: 'spring', stiffness: 400 } }
              : { scale: 0, transition: { duration: 0.3 } }
          }
          className={`${dot} rounded-full shadow-md relative z-10`}
        />
      </div>

      {/* Desktop right slot */}
      <div className="flex-1">
        {!isLeft ? (
          <motion.div
            initial={HIDE_RIGHT}
            animate={isInView ? SHOW : HIDE_RIGHT}
            className="hidden md:block w-full max-w-sm"
          >
            {renderCard(item, isLeft, handlers)}
          </motion.div>
        ) : (
          <div />
        )}

        {/* Mobile — always show, isLeft is always false on mobile */}
        <motion.div
          initial={HIDE_RIGHT}
          animate={isInView ? SHOW : HIDE_RIGHT}
          className="md:hidden pl-4"
        >
          {renderCard(item, false, handlers)}
        </motion.div>
      </div>
    </div>
  )
})
