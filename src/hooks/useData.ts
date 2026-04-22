import useSWR from 'swr'

// GitHub is the source of truth. Fetching directly from raw.githubusercontent.com
// lets data changes go live immediately, without waiting for Vercel to rebuild.
// If GitHub is unreachable we fall back to the bundled /data/*.json from the
// last successful deploy, so the site never goes blank.
const GITHUB_RAW = 'https://raw.githubusercontent.com/UgurTheG/SPD-Albstadt/main/public'

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface UseDataResult<T> {
  data: T | null
  loading: boolean
  error: HttpError | null
}

const noStore: RequestInit = {
  cache: 'no-store',
  headers: {'Cache-Control': 'no-cache', 'Pragma': 'no-cache'},
}

export async function fetchData<T = unknown>(url: string): Promise<T> {
  if (url.startsWith('/data/')) {
    try {
      const ghRes = await fetch(`${GITHUB_RAW}${url}?t=${Date.now()}`, noStore)
      if (ghRes.ok) return ghRes.json() as Promise<T>
    } catch {
      // Network error reaching GitHub — fall through to the Vercel copy.
    }
  }
  const res = await fetch(url, noStore)
  if (!res.ok) throw new HttpError(res.status, `Fehler beim Laden: ${res.status}`)
  return res.json() as Promise<T>
}

export function useData<T>(url: string): UseDataResult<T> {
  // Pass null when url is empty to skip fetching (e.g. feature toggle is off)
  const {data, error, isLoading} = useSWR<T>(url || null, fetchData, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  return {
    data: data ?? null,
    loading: isLoading,
    error: error instanceof HttpError ? error : error ? new HttpError(0, (error as Error).message) : null,
  }
}
