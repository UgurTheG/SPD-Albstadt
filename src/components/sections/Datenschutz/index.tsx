import { Shield } from 'lucide-react'
import LegalPage from '@/components/LegalPage'

export default function Datenschutz() {
  return (
    <LegalPage
      icon={<Shield size={22} />}
      title="Datenschutz"
      category="Rechtliches"
      dataUrl="/data/datenschutz.json"
      descriptionFallback="Informationen zum Umgang mit Ihren personenbezogenen Daten gemäß DSGVO."
    />
  )
}
