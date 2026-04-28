import { ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { personCardItemVariants } from '@/components/personCardVariants'
import type { Abgeordneter } from './types'

export function AbgeordneterCard({ a, onClick }: { a: Abgeordneter; onClick: () => void }) {
  return (
    <motion.div
      variants={personCardItemVariants}
      onClick={onClick}
      className="group flex rounded-2xl overflow-hidden cursor-pointer
                 bg-white dark:bg-gray-900
                 border border-gray-100 dark:border-gray-800/80
                 shadow-sm dark:shadow-black/40
                 hover:shadow-xl
                 transition-all duration-500 hover:-translate-y-1"
    >
      {/* Image column */}
      <div className="relative w-32 sm:w-60 landscape-compact:w-32 shrink-0 overflow-hidden bg-gray-950 self-stretch">
        <img
          src={a.bildUrl}
          alt={a.name}
          loading="lazy"
          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between p-4 sm:p-7 landscape-compact:p-4 min-h-45 sm:min-h-65 landscape-compact:min-h-0">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">
            {a.rolle}
          </p>
          <h4 className="font-extrabold text-gray-900 dark:text-white text-lg sm:text-2xl leading-tight">
            {a.name}
          </h4>
          <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1 sm:mt-1.5">
            {a.wahlkreis}
          </p>
          <p className="hidden sm:block landscape-compact:hidden text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-4 line-clamp-4 whitespace-pre-line">
            {a.bio}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          {a.website && (
            <a
              href={a.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-spd-red hover:underline"
            >
              <ExternalLink size={12} /> Website
            </a>
          )}
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-600 group-hover:text-spd-red transition-colors duration-300 ml-auto">
            Mehr anzeigen →
          </span>
        </div>
      </div>
    </motion.div>
  )
}
