import { useEffect, useState } from 'react'
import { type ICSEvent, parseICS } from '../utils/icsParser'

interface UseICSEventsResult {
  events: ICSEvent[]
  loading: boolean
  error: string | null
}

/**
 * Base URL for API calls. When deployed on Hostinger (no serverless),
 * set VITE_API_BASE_URL to your Vercel deployment (e.g. "https://spd-albstadt.vercel.app")
 * so that /api/ics requests are proxied through Vercel.
 * On Vercel itself this can be left empty (defaults to same-origin).
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Fetches and parses the ICS calendar feed from /api/ics.
 * Pass `enabled=false` to skip the fetch entirely (e.g. when no ICS URL is configured).
 * Handles loading / error state and cancels stale fetches on unmount.
 */
export function useICSEvents(enabled = true): UseICSEventsResult {
  const [events, setEvents] = useState<ICSEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    const fetchICS = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/ics`)
        if (!res.ok) {
          if (!cancelled) setError(`Fehler beim Laden: HTTP ${res.status}`)
          return
        }
        const text = await res.text()
        const parsed = parseICS(text)
        if (!cancelled) {
          if (parsed.length === 0) {
            setError('Keine Termine im ICS-Feed gefunden.')
          } else {
            setEvents(parsed)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            `Fehler beim Laden: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchICS()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { events, loading, error }
}
