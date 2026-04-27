import {useState, useEffect} from 'react'

export function useItemsPerPage(breakpoint: number, above: number, below: number): number {
    const [count, setCount] = useState(
        () => typeof window !== 'undefined' && window.innerWidth >= breakpoint ? above : below
    )
    useEffect(() => {
        const handler = () => setCount(window.innerWidth >= breakpoint ? above : below)
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [breakpoint, above, below])
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
    const [count, setCount] = useState(() => {
        if (typeof window === 'undefined') return fallback
        const w = window.innerWidth
        for (const [min, val] of breakpoints) {
            if (w >= min) return val
        }
        return fallback
    })
    useEffect(() => {
        const handler = () => {
            const w = window.innerWidth
            for (const [min, val] of breakpoints) {
                if (w >= min) {setCount(val); return}
            }
            setCount(fallback)
        }
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [breakpoints, fallback])
    return count
}
