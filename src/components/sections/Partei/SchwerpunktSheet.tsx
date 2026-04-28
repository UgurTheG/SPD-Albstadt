import { Users } from 'lucide-react'
import Sheet from '@/components/Sheet'
import type { Schwerpunkt } from './types'
import { ICONS } from './icons'

export function SchwerpunktSheet({
  item,
  onClose,
}: {
  item: Schwerpunkt | null
  onClose: () => void
}) {
  const Icon = (item ? ICONS[item.icon] : null) || Users
  return (
    <Sheet open={!!item} onClose={onClose}>
      {item && (
        <div>
          <div className="bg-linear-to-br from-spd-red via-spd-red to-spd-red-dark px-5 sm:px-6 pt-6 pb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.12),transparent_50%)]" />
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="font-black text-white text-xl sm:text-2xl leading-tight">
                {item.titel}
              </h3>
            </div>
          </div>
          <div className="px-5 sm:px-6 pt-5 pb-8 space-y-4">
            {item.inhalt && (
              <div className="pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                  {item.inhalt}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
