import { useState, useEffect } from 'react'

export function useItemsPerPage(breakpoint: number, above: number, below: number): number {
  const get = () => (typeof window !== 'undefined' && window.innerWidth >= breakpoint ? above : below)
  const [count, setCount] = useState(get)
  useEffect(() => {
    const handler = () => setCount(get())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return count
}

/**
 * Returns a page size based on multiple breakpoints.
 * `breakpoints` must be sorted in descending order of min-width.
 * Example: [[1024, 10], [768, 8], [640, 6]] with fallback 4
 */
export function useItemsPerPageMulti(
  breakpoints: Array<[number, number]>,
  fallback: number,
): number {
  const get = () => {
    if (typeof window === 'undefined') return fallback
    const w = window.innerWidth
    for (const [min, val] of breakpoints) {
      if (w >= min) return val
    }
    return fallback
  }
  const [count, setCount] = useState(get)
  useEffect(() => {
    const handler = () => setCount(get())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return count
}

