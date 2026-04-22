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

const noStore: RequestInit = {
  cache: 'no-store',
}

export async function fetchData<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, noStore)
  if (!res.ok) throw new HttpError(res.status, `Fehler beim Laden: ${res.status}`)
  return res.json() as Promise<T>
}

export function useData<T>(url: string): UseDataResult<T> {
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
