import { useState } from 'react'
import type { NewsItem } from '../types/news'
import { useItemsPerPage } from './useItemsPerPage'
import { usePagination } from './usePagination'

export interface UseNewsFilterResult {
  allTags: string[]
  activeTag: string
  setActiveTag: (tag: string) => void
  searchQuery: string
  normalizedQuery: string
  setSearchQuery: (q: string) => void
  filteredNews: NewsItem[] | null
  visibleNews: NewsItem[] | undefined
  hasMore: boolean
  visibleCount: number
  itemsPerPage: number
  loadMore: () => void
  loadLess: () => void
}

/**
 * Encapsulates all filtering, searching and pagination logic for the NewsFeed.
 *
 * Pagination delegates to `usePagination` which uses an "extra pages"
 * multiplier so the visible window self-adjusts when the breakpoint (and
 * therefore itemsPerPage) changes — no setState-inside-effect needed.
 */
export function useNewsFilter(newsItems: NewsItem[] | null): UseNewsFilterResult {
  const itemsPerPage = useItemsPerPage(768, 6, 3)
  const [activeTag, setActiveTagState] = useState<string>('Alle')
  const [searchQuery, setSearchQueryState] = useState('')

  const allTags = newsItems
    ? ['Alle', ...Array.from(new Set(newsItems.map(n => n.kategorie).filter(Boolean)))]
    : ['Alle']

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredNews = newsItems
    ? newsItems
        .filter(n => activeTag === 'Alle' || n.kategorie === activeTag)
        .filter(n => {
          if (!normalizedQuery) return true
          return (
            n.titel.toLowerCase().includes(normalizedQuery) ||
            n.zusammenfassung.toLowerCase().includes(normalizedQuery) ||
            n.inhalt.toLowerCase().includes(normalizedQuery) ||
            n.kategorie.toLowerCase().includes(normalizedQuery)
          )
        })
    : null

  const {
    visibleItems: visibleNews,
    visibleCount,
    hasMore,
    loadMore,
    loadLess,
    reset,
  } = usePagination(filteredNews, itemsPerPage)

  function setActiveTag(tag: string) {
    setActiveTagState(tag)
    reset()
  }

  function setSearchQuery(value: string) {
    setSearchQueryState(value)
    reset()
  }

  return {
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
  }
}
