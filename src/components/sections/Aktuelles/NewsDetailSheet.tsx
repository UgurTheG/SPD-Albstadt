import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import type { NewsItem } from '@/types/news'
import { CATEGORY_COLORS, getNewsImages } from '@/types/news'
import { formatDate } from '@/utils/formatDate'
import PhotoGallery from '@/components/PhotoGallery'
import DeepLinkHead from '@/components/DeepLinkHead'
import { newsSEO } from '@/seoConfig'

interface Props {
  news: NewsItem
}

export default function NewsDetailSheet({ news }: Props) {
  const { urls, captions } = getNewsImages(news)
  const seo = newsSEO(news)
  const shareUrl = `${window.location.origin}${seo.path}`

  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${news.titel} – SPD Albstadt`,
          text: news.zusammenfassung,
          url: shareUrl,
        })
      } catch {
        // user cancelled or error — no action needed
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div>
      <DeepLinkHead seo={seo} />
      {urls.length > 0 && <PhotoGallery images={urls} captions={captions} alt={news.titel} />}
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-3">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[news.kategorie]}`}
          >
            {news.kategorie}
          </span>
          <time className="text-sm text-gray-400 flex-1">{formatDate(news.datum)}</time>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Beitrag teilen"
            className="w-8 h-8 rounded-lg bg-spd-red/10 hover:bg-spd-red flex items-center justify-center text-spd-red hover:text-white transition-all duration-200 active:scale-[0.95] shrink-0"
          >
            {copied ? <Check size={15} /> : <Share2 size={15} />}
          </button>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight mb-4">
          {news.titel}
        </h3>
        <p className="border-l-2 border-spd-red pl-4 text-gray-700 dark:text-gray-200 font-medium leading-relaxed text-[0.95rem] sm:text-lg italic mb-6">
          {news.zusammenfassung}
        </p>
        <p className="prose-justify text-gray-700 dark:text-gray-300 leading-relaxed text-base whitespace-pre-line">
          {news.inhalt}
        </p>
      </div>
    </div>
  )
}
