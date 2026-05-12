import { Users } from 'lucide-react'
import Sheet from '@/components/Sheet'
import { slugify } from '@/utils/slugify'
import type { Schwerpunkt } from './types'
import { ICONS } from './icons'
import { DetailHelmet } from '@/components/DetailHelmet'
import { SheetHero } from '@/components/SheetHero'

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
          <DetailHelmet
            title={item.titel}
            description={item.beschreibung}
            url={`/partei/${slugify(item.titel)}`}
          />
          <SheetHero pb="pb-8">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <Icon size={22} className="text-white" />
            </div>
            <h3 className="font-black text-white text-xl sm:text-2xl leading-tight">
              {item.titel}
            </h3>
          </SheetHero>
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
