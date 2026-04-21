import useSWR from 'swr'

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

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new HttpError(res.status, `Fehler beim Laden: ${res.status}`)
  return res.json()
}

export function useData<T>(url: string): UseDataResult<T> {
  // Pass null when url is empty to skip fetching (e.g. feature toggle is off)
  const { data, error, isLoading } = useSWR<T>(url || null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  return {
    data: data ?? null,
    loading: isLoading,
    error: error instanceof HttpError ? error : error ? new HttpError(0, (error as Error).message) : null,
  }
}
