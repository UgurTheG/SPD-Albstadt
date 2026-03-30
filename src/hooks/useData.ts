import useSWR from 'swr'

interface UseDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fehler beim Laden: ${res.status}`)
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
    error: error ? (error as Error).message : null,
  }
}
