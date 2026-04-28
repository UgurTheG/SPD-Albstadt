import { memo } from 'react'
import { ChevronRight } from 'lucide-react'
import Avatar from '@/components/Avatar'
import type { Persoenlichkeit } from './types'

// Named PersonlichkeitCard to avoid shadowing the shared PersonCard component
// used by Partei and Fraktion (different props shape).
export const PersonlichkeitCard = memo(function PersonlichkeitCard({
  p,
  onOpen,
}: {
  p: Persoenlichkeit
  onOpen: () => void
}) {
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
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
            {p.jahre}
          </p>
          <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-snug group-hover:text-spd-red transition-colors duration-300">
            {p.name}
          </h4>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
            {p.rolle}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mt-1.5 whitespace-pre-line">
            {p.beschreibung}
          </p>
        </div>
        <ChevronRight
          size={14}
          className="text-gray-300 dark:text-gray-600 group-hover:text-spd-red group-hover:translate-x-0.5 transition-all shrink-0 mt-4"
        />
      </div>
    </button>
  )
})
