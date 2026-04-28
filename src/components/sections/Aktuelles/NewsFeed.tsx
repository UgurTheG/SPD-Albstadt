import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ChevronRight, Search, Tag, X } from 'lucide-react'
import type { NewsItem } from '@/types/news'
import { CATEGORY_COLOR_FALLBACK, CATEGORY_COLORS, getNewsImages } from '@/types/news'
import { useNewsFilter } from '@/hooks/useNewsFilter'
import { formatDate } from '@/utils/formatDate'
import SubsectionHeading from '@/components/SubsectionHeading'
import { SkeletonGrid } from '@/components/SkeletonGrid'

interface Props {
  newsItems: NewsItem[] | null
  onSelectNews: (item: NewsItem) => void
}

export default function NewsFeed({ newsItems, onSelectNews }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const {
    allTags,
    activeTag,
    setActiveTag,
    searchQuery,
    normalizedQuery,
    setSearchQuery,
    filteredNews,
    visibleNews,
    hasMore,
    visibleCount,
    itemsPerPage,
    loadMore,
    loadLess,
  } = useNewsFilter(newsItems)

  return (
    <div className="min-w-0 mb-16" ref={ref}>
      <SubsectionHeading
        icon={<Tag size={15} className="text-spd-red" />}
        title="Neuigkeiten"
        subtitle={`${filteredNews?.length ?? 0} Beitrag${(filteredNews?.length ?? 0) !== 1 ? 'e' : ''}`}
      />

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.2 }}
        className="relative mb-4"
      >
        <label htmlFor="news-search" className="sr-only">
          Neuigkeiten durchsuchen
        </label>
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
        />
        <input
          id="news-search"
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Neuigkeiten durchsuchen…"
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-spd-red/50 focus:ring-2 focus:ring-spd-red/20 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Suche zurücksetzen"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-spd-red hover:bg-spd-red/10 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </motion.div>

      {/* Tag filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.25 }}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        {allTags.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTag(tag)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 ${
              activeTag === tag
                ? 'bg-spd-red text-white border-spd-red shadow-sm'
                : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-spd-red/50 hover:text-spd-red'
            }`}
          >
            {tag === 'Alle' ? (
              tag
            ) : (
              <>
                <Tag size={10} className="inline mr-1" />
                {tag}
              </>
            )}
          </button>
        ))}
      </motion.div>

      {/* News grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {visibleNews?.map((news, i) => (
          <button
            key={news.id ?? i}
            type="button"
            onClick={() => onSelectNews(news)}
            className="group w-full text-left bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 cursor-pointer border border-gray-100 dark:border-gray-800 hover:border-spd-red/30 hover:shadow-xl hover:shadow-spd-red/5 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              {getNewsImages(news).urls[0] && (
                <img
                  src={getNewsImages(news).urls[0]}
                  alt={news.titel}
                  loading="lazy"
                  className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-200 dark:bg-gray-800 object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[news.kategorie] ?? CATEGORY_COLOR_FALLBACK}`}
                  >
                    <Tag size={10} className="inline mr-1" />
                    {news.kategorie}
                  </span>
                  <time className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(news.datum)}
                  </time>
                </div>
                <h4 className="text-gray-900 dark:text-white font-bold text-base leading-snug mb-1.5 group-hover:text-spd-red transition-colors line-clamp-2">
                  {news.titel}
                </h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-2 whitespace-pre-line">
                  {news.zusammenfassung}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-spd-red text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Weiterlesen <ChevronRight size={15} />
            </div>
          </button>
        ))}
      </div>

      {/* Skeleton while loading */}
      {!newsItems && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SkeletonGrid count={itemsPerPage} itemClassName="h-36" />
        </div>
      )}

      {/* Empty state */}
      {filteredNews && filteredNews.length === 0 && (
        <div className="text-center py-10 text-gray-400 dark:text-gray-600">
          {normalizedQuery ? (
            <>
              <Search size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Keine Beiträge für „{searchQuery}"</p>
            </>
          ) : (
            <>
              <Tag size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Keine Beiträge für diese Kategorie</p>
            </>
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredNews && filteredNews.length > itemsPerPage && (
        <div className="flex items-center justify-between pt-6">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {Math.min(visibleCount, filteredNews.length)} von {filteredNews.length} Beiträgen
          </span>
          <div className="flex gap-2">
            {visibleCount > itemsPerPage && (
              <button
                type="button"
                onClick={loadLess}
                className="text-xs font-semibold text-gray-400 hover:text-spd-red transition-colors px-3 py-1.5 rounded-lg hover:bg-spd-red/5"
              >
                ↑ Weniger
              </button>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                className="text-xs font-semibold text-spd-red border border-spd-red/30 hover:bg-spd-red hover:text-white transition-all px-3 py-1.5 rounded-lg"
              >
                Mehr laden ↓
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
