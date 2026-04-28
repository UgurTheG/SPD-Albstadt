import { useData } from './useData'
import { NAV_ITEMS } from '../shared/navigation'

/**
 * Returns filtered NAV_ITEMS — hides "Kommunalpolitik" when the
 * corresponding JSON flag `sichtbar` is not `true`.
 *
 * Shared by Hero and Navbar so the visibility logic lives in one place.
 * SWR deduplicates the underlying fetch automatically.
 */
export function useNavItems() {
  const { data: kpData } = useData<{ sichtbar?: boolean }>('/data/kommunalpolitik.json')
  return NAV_ITEMS.filter(item => item.id !== 'kommunalpolitik' || kpData?.sichtbar === true)
}
