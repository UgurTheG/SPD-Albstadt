/**
 * Shared news types and constants used by both the frontend (Aktuelles section)
 * and the admin panel (tabs config, field renderers).
 */

export interface NewsItem {
  id: string
  datum: string
  titel: string
  zusammenfassung: string
  inhalt: string
  kategorie: NewsCategory
  bildUrl?: string
  bildBeschreibung?: string
  bildUrls?: string[]
  bildBeschreibungen?: string[]
}

/**
 * Single source of truth for all news categories.
 * Used by the admin select field and the frontend filter tags.
 */
export const NEWS_CATEGORIES = [
  'Gemeinderat',
  'Veranstaltung',
  'Haushalt',
  'Ortsverein',
  'Wahl',
] as const

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

/**
 * Returns deduplicated image URLs and matching captions for a news item,
 * merging the legacy single-image fields with the newer multi-image arrays.
 */
export function getNewsImages(news: NewsItem): { urls: string[]; captions: string[] } {
  const urls = Array.from(
    new Set([...(news.bildUrl ? [news.bildUrl] : []), ...(news.bildUrls ?? [])]),
  ).filter(Boolean)
  const captions = [
    ...(news.bildUrl ? [news.bildBeschreibung ?? ''] : []),
    ...(news.bildBeschreibungen ?? []),
  ]
  return { urls, captions }
}

/**
 * Fallback colour used when a news item's kategorie is not in CATEGORY_COLORS
 * (e.g. stale JSON produced before a new category was added to the type).
 */
export const CATEGORY_COLOR_FALLBACK =
  'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300'

/**
 * Tailwind colour classes per category.
 * Typed as Record<NewsCategory, string> so a missing entry is a compile error.
 */
export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  Gemeinderat: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Veranstaltung: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Haushalt: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Ortsverein: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Wahl: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
}
