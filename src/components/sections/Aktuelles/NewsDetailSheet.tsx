import type { NewsItem } from '@/types/news'
import { CATEGORY_COLORS, getNewsImages } from '@/types/news'
import { formatDate } from '@/utils/formatDate'
import PhotoGallery from '@/components/PhotoGallery'

interface Props {
  news: NewsItem
}

export default function NewsDetailSheet({ news }: Props) {
  const { urls, captions } = getNewsImages(news)

  return (
    <div>
      {urls.length > 0 && <PhotoGallery images={urls} captions={captions} alt={news.titel} />}
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[news.kategorie]}`}
          >
            {news.kategorie}
          </span>
          <time className="text-sm text-gray-400">{formatDate(news.datum)}</time>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight mb-4">
          {news.titel}
        </h3>
        <div className="w-10 h-0.5 bg-spd-red rounded-full mb-5" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base whitespace-pre-line">
          {news.inhalt}
        </p>
      </div>
    </div>
  )
}
