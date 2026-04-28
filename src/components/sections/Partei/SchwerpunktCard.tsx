import { ChevronRight, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { personCardItemVariants } from '@/components/personCardVariants'
import type { Schwerpunkt } from './types'
import { ICONS } from './icons'

export function SchwerpunktCard({ s, onClick }: { s: Schwerpunkt; onClick: () => void }) {
  const Icon = ICONS[s.icon] || Users

  return (
    <motion.div
      variants={personCardItemVariants}
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer
                 bg-white dark:bg-gray-800/60
                 border border-gray-100 dark:border-gray-800/80
                 shadow-sm dark:shadow-black/20
                 hover:shadow-lg hover:-translate-y-1
                 transition-all duration-500"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="w-11 h-11 bg-spd-red/8 dark:bg-spd-red/12 rounded-xl flex items-center justify-center transition-all duration-300">
            <Icon size={20} className="text-spd-red" />
          </div>
          <ChevronRight
            size={14}
            className="text-gray-200 dark:text-gray-700 group-hover:text-spd-red transition-colors mt-1 shrink-0"
          />
        </div>
        <h4 className="font-bold text-gray-900 dark:text-white mb-2 leading-snug">{s.titel}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
          {s.beschreibung}
        </p>
      </div>
    </motion.div>
  )
}
