import { useData } from './useData'
import { useHttpErrorRedirect } from './useHttpErrorRedirect'
import { useSectionView } from './useSectionView'

export function useSectionPage<T>(url: string) {
  const { ref, isInView } = useSectionView()
  const { data, loading, error } = useData<T>(url)
  useHttpErrorRedirect(error)
  return { ref, isInView, data, loading }
}
