import { Users } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import Sheet from '@/components/Sheet'
import { slugify } from '@/utils/slugify'
import type { Schwerpunkt } from './types'
import { ICONS } from './icons'

const BASE_URL = 'https://www.spd-albstadt.de'

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
          <Helmet>
            <title>{item.titel} – SPD Albstadt</title>
            <meta name="description" content={item.beschreibung} />
            <link rel="canonical" href={`${BASE_URL}/partei/${slugify(item.titel)}`} />
            <meta property="og:type" content="article" />
            <meta property="og:url" content={`${BASE_URL}/partei/${slugify(item.titel)}`} />
            <meta property="og:title" content={`${item.titel} – SPD Albstadt`} />
            <meta property="og:description" content={item.beschreibung} />
            <meta property="og:locale" content="de_DE" />
            <meta property="og:site_name" content="SPD Albstadt" />
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content={`${item.titel} – SPD Albstadt`} />
            <meta name="twitter:description" content={item.beschreibung} />
          </Helmet>
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
                <p className="prose-justify text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
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
