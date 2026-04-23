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
