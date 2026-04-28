import { useEffect, useMemo, useState } from 'react'
import { fetchData } from './useData'

/** Returns the public path to a Haushaltsreden PDF for a given year. */
export const haushaltsPdfUrl = (year: number) => `/documents/fraktion/haushaltsreden/${year}.pdf`

interface UseHaushaltsredenResult {
  /** All years from current year down to startYear, newest first. */
  alleJahre: number[]
  /**
   * Set of years for which a PDF actually exists on the server.
   * `null` while the HEAD-check requests are still in flight.
   */
  availableYears: Set<number> | null
  /**
   * Years explicitly hidden by the admin via /data/haushaltsreden.json.
   * Empty set until the config is loaded.
   * A year is hidden only if it is in disabledYears AND has no PDF.
   */
  disabledYears: Set<number>
}

/**
 * Fetches the list of available Haushaltsreden PDFs by firing HEAD requests
 * and reads the admin-controlled disabled-years list.
 *
 * Visibility rule for a year:
 *   - Always show while loading (availableYears === null)
 *   - Show if the PDF exists (availableYears.has(year))
 *   - Show as "Demnächst" placeholder if the year is NOT in disabledYears
 *   - Hide only when: no PDF AND explicitly disabled
 */
export function useHaushaltsreden(startYear = 2010): UseHaushaltsredenResult {
  const alleJahre = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let y = currentYear; y >= startYear; y--) years.push(y)
    return years
  }, [startYear])

  const [availableYears, setAvailableYears] = useState<Set<number> | null>(null)
  const [disabledYears, setDisabledYears] = useState<Set<number>>(new Set())

  useEffect(() => {
    let cancelled = false

    const checkPdfs = async () => {
      const results = await Promise.all(
        alleJahre.map(async year => {
          try {
            const r = await fetch(haushaltsPdfUrl(year), { method: 'HEAD' })
            const ct = r.headers.get('content-type') ?? ''
            // In dev, Vite's SPA fallback returns 200 + text/html for missing files.
            // Real PDFs return application/pdf. In production, missing files → 404.
            return r.ok && !ct.includes('text/html') ? year : null
          } catch {
            return null
          }
        }),
      )
      if (!cancelled) {
        setAvailableYears(new Set(results.filter((y): y is number => y !== null)))
      }
    }

    checkPdfs()

    fetchData<{ disabledYears?: number[] }>('/data/haushaltsreden.json')
      .then(data => {
        if (!cancelled && data?.disabledYears) setDisabledYears(new Set(data.disabledYears))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [alleJahre])

  return { alleJahre, availableYears, disabledYears }
}
