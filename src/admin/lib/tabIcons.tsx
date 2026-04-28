import {
  Building2,
  FileText,
  House,
  Landmark,
  MapPin,
  Newspaper,
  Phone,
  ScrollText,
  Settings,
  Shield,
  Users,
} from 'lucide-react'

/**
 * Returns the icon element for a given admin tab key.
 * Lazy function — no module-level JSX, safe for React Fast Refresh.
 */
export function getTabIcon(key: string, size = 18): React.ReactNode {
  switch (key) {
    case 'startseite':
      return <House size={size} />
    case 'news':
      return <Newspaper size={size} />
    case 'party':
      return <Users size={size} />
    case 'fraktion':
      return <Building2 size={size} />
    case 'kommunalpolitik':
      return <MapPin size={size} />
    case 'haushaltsreden':
      return <ScrollText size={size} />
    case 'history':
      return <Landmark size={size} />
    case 'kontakt':
      return <Phone size={size} />
    case 'impressum':
      return <FileText size={size} />
    case 'datenschutz':
      return <Shield size={size} />
    case 'config':
      return <Settings size={size} />
    default:
      return null
  }
}
