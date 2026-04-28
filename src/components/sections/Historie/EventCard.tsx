import { memo } from 'react'
import { ChevronRight, Images } from 'lucide-react'
import type { TimelineEntry } from './types'

export const EventCard = memo(function EventCard({
  entry,
  isLeft,
  onOpen,
}: {
  entry: TimelineEntry
  isLeft: boolean
  onOpen: () => void
}) {
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
      <span className="text-3xl font-black text-spd-red leading-none block mb-2">{entry.jahr}</span>
      <h4 className="font-bold text-gray-900 dark:text-white mb-1.5 text-base group-hover:text-spd-red transition-colors duration-300">
        {entry.titel}
      </h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
        {entry.beschreibung}
      </p>
      <span
        className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-spd-red/70 group-hover:text-spd-red transition-colors ${isLeft ? 'flex-row-reverse' : ''}`}
      >
        Mehr lesen{' '}
        <ChevronRight
          size={13}
          className={`transition-transform ${isLeft ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`}
        />
        {entry.bilder && entry.bilder.length > 0 && (
          <span className="flex items-center gap-0.5 ml-1 text-gray-400">
            <Images size={12} />
            {entry.bilder.length}
          </span>
        )}
      </span>
    </button>
  )
})
