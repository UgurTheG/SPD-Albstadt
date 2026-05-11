import { FileText } from 'lucide-react'
import LegalPage from '@/components/LegalPage'

export default function Impressum() {
  return (
    <LegalPage
      icon={<FileText size={22} />}
      title="Impressum"
      category="Rechtliches"
      dataUrl="/data/impressum.json"
      descriptionFallback="Angaben gemäß § 5 TMG sowie weitere rechtliche Hinweise."
    />
  )
}
