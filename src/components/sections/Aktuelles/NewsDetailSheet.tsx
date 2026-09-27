import { Helmet } from 'react-helmet-async'
import { Check, Clock, Share2 } from 'lucide-react'
import type { NewsItem } from '@/types/news'
import { CATEGORY_COLORS, getNewsImages } from '@/types/news'
import { formatDate } from '@/utils/formatDate'
import { readingMinutes } from '@/utils/readingTime'
import { useShare } from '@/hooks/useShare'
import PhotoGallery from '@/components/PhotoGallery'
import RichText from '@/components/RichText'

const BASE_URL = 'https://www.spd-albstadt.de'

interface Props {
  news: NewsItem
}

export default function NewsDetailSheet({ news }: Props) {
  const { urls, captions } = getNewsImages(news)
  const ogImage = urls[0]
    ? urls[0].startsWith('http')
      ? urls[0]
      : `${BASE_URL}${urls[0]}`
    : undefined
  const deepId = news.uuid ?? news.id
  const { share, copied } = useShare({
    title: `${news.titel} – SPD Albstadt`,
    text: news.zusammenfassung,
    url: `${window.location.origin}/aktuelles/${deepId}`,
  })
  const ShareIcon = copied ? Check : Share2

  return (
    <article>
      <Helmet>
        <title>{news.titel} – SPD Albstadt</title>
        <meta name="description" content={news.zusammenfassung} />
        <link rel="canonical" href={`${BASE_URL}/aktuelles/${deepId}`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${BASE_URL}/aktuelles/${deepId}`} />
        <meta property="og:title" content={`${news.titel} – SPD Albstadt`} />
        <meta property="og:description" content={news.zusammenfassung} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="SPD Albstadt" />
        <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={`${news.titel} – SPD Albstadt`} />
        <meta name="twitter:description" content={news.zusammenfassung} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
      </Helmet>
      {urls.length > 0 && <PhotoGallery images={urls} captions={captions} alt={news.titel} />}
      <div className="p-6 sm:p-8">
        <header>
          <div className="flex items-start gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 flex-1 min-w-0 text-sm text-gray-500 dark:text-gray-400">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[news.kategorie]}`}
              >
                {news.kategorie}
              </span>
              <time dateTime={news.datum}>{formatDate(news.datum)}</time>
              <span className="inline-flex items-center gap-1">
                <Clock size={13} aria-hidden="true" />
                {readingMinutes(news.zusammenfassung, news.inhalt)} Min. Lesezeit
              </span>
            </div>
            <button
              type="button"
              onClick={share}
              aria-label="Beitrag teilen"
              className="w-8 h-8 rounded-lg bg-spd-red/10 hover:bg-spd-red flex items-center justify-center text-spd-red hover:text-white transition-all duration-200 active:scale-[0.95] shrink-0"
            >
              <ShareIcon size={15} />
            </button>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
            {news.titel}
          </h2>
          {news.zusammenfassung && (
            <p className="mt-4 text-[1.0625rem] sm:text-lg font-medium leading-relaxed text-gray-900 dark:text-gray-100">
              {news.zusammenfassung}
            </p>
          )}
        </header>
        {news.inhalt && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <RichText text={news.inhalt} />
          </div>
        )}
        <footer className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-2 rounded-xl bg-spd-red/10 hover:bg-spd-red px-4 py-2.5 text-sm font-semibold text-spd-red hover:text-white transition-all duration-200 active:scale-[0.98]"
          >
            <ShareIcon size={15} aria-hidden="true" />
            {copied ? 'Link kopiert' : 'Beitrag teilen'}
          </button>
        </footer>
      </div>
    </article>
  )
}
