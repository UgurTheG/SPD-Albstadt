import { Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Sheet from '@/components/Sheet'
import ArticleMeta from '@/components/ArticleMeta'
import SheetHero from '@/components/SheetHero'
import { slugify } from '@/utils/slugify'
import { useData } from '@/hooks/useData'
import { formatDate } from '@/utils/formatDate'
import { CATEGORY_COLORS, CATEGORY_COLOR_FALLBACK, findRelatedNews } from '@/types/news'
import type { NewsItem } from '@/types/news'
import type { Schwerpunkt } from './types'
import { ICONS } from './icons'

const STATUS_STYLES: Record<string, string> = {
  'In Planung': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  'Im Gemeinderat beantragt': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'In Umsetzung': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Erreicht: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

function RelatedNewsSection({ schlagwort }: { schlagwort: string }) {
  const { data } = useData<NewsItem[]>('/data/news.json')
  const related = data ? findRelatedNews(data, schlagwort) : []
  if (related.length === 0) return null

  return (
    <div className="pt-2">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Verwandte Artikel
        </span>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="space-y-2">
        {related.map(n => (
          <Link
            key={n.uuid ?? n.id}
            to={`/aktuelles/${n.uuid ?? n.id}`}
            className="group block rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3 hover:border-spd-red/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[n.kategorie] ?? CATEGORY_COLOR_FALLBACK}`}
              >
                {n.kategorie}
              </span>
              <time className="text-xs text-gray-400">{formatDate(n.datum)}</time>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug group-hover:text-spd-red transition-colors">
              {n.titel}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {n.zusammenfassung}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function SchwerpunktSheet({
  item,
  onClose,
}: {
  item: Schwerpunkt | null
  onClose: () => void
}) {
  const Icon = (item ? ICONS[item.icon] : null) || Users
  const statusStyle = item?.status
    ? (STATUS_STYLES[item.status] ??
      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300')
    : null

  return (
    <Sheet open={!!item} onClose={onClose}>
      {item && (
        <div>
          <ArticleMeta
            title={item.titel}
            description={item.beschreibung}
            path={`/partei/${slugify(item.titel)}`}
          />

          <SheetHero className="pt-6 pb-8">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <Icon size={22} className="text-white" />
            </div>
            <h3 className="font-black text-white text-xl sm:text-2xl leading-tight">
              {item.titel}
            </h3>
          </SheetHero>

          <div className="px-5 sm:px-6 pt-5 pb-8 space-y-5">
            {/* Status chip */}
            {item.status && statusStyle && (
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${statusStyle}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                  {item.status}
                </span>
              </div>
            )}

            {/* Short description with red border */}
            <p className="border-l-2 border-spd-red pl-4 text-gray-700 dark:text-gray-200 font-medium leading-relaxed text-[0.95rem] sm:text-lg italic">
              {item.beschreibung}
            </p>

            {/* Full text */}
            {item.inhalt && (
              <p className="prose-justify text-gray-700 dark:text-gray-300 leading-relaxed text-base whitespace-pre-line">
                {item.inhalt}
              </p>
            )}

            {/* Forderungen */}
            {item.forderungen && item.forderungen.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Unsere Forderungen
                  </span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                </div>
                <ul className="space-y-2">
                  {item.forderungen.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-spd-red/10 flex items-center justify-center shrink-0">
                        <svg
                          viewBox="0 0 12 12"
                          className="w-3 h-3 text-spd-red"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="2,6 5,9 10,3" />
                        </svg>
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quote */}
            {item.zitat && (
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 p-4 flex gap-4 items-start">
                {item.zitatBildUrl ? (
                  <img
                    src={item.zitatBildUrl}
                    alt={item.zitatPerson ?? ''}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-spd-red/10 flex items-center justify-center shrink-0">
                    <Users size={20} className="text-spd-red" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 italic leading-relaxed">
                    „{item.zitat}"
                  </p>
                  {item.zitatPerson && (
                    <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      — {item.zitatPerson}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Related news */}
            {item.newsSchlagwort && <RelatedNewsSection schlagwort={item.newsSchlagwort} />}
          </div>
        </div>
      )}
    </Sheet>
  )
}
