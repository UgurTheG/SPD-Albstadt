import { Mail, MapPin, Phone } from 'lucide-react'

export function ContactInfoPanel({
  adresseLines,
  email,
  telefon,
  telefonLink,
}: {
  adresseLines: string[]
  email: string
  telefon: string
  telefonLink: string
}) {
  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
      <h4 className="text-gray-900 dark:text-white font-bold mb-5 text-lg">Kontaktdaten</h4>
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 bg-spd-red/10 dark:bg-white/15 rounded-xl flex items-center justify-center shrink-0">
            <MapPin size={16} className="text-spd-red dark:text-white" />
          </div>
          <div>
            <p className="text-gray-900 dark:text-white font-semibold text-sm">Anschrift</p>
            <p className="text-gray-500 dark:text-white/60 text-sm mt-0.5 leading-relaxed">
              {adresseLines.map((line, index) => (
                <span key={index}>
                  {line}
                  {index < adresseLines.length - 1 && <br />}
                </span>
              ))}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 bg-spd-red/10 dark:bg-white/15 rounded-xl flex items-center justify-center shrink-0">
            <Mail size={16} className="text-spd-red dark:text-white" />
          </div>
          <div>
            <p className="text-gray-900 dark:text-white font-semibold text-sm">E-Mail</p>
            <a
              href={`mailto:${email}`}
              className="text-gray-500 dark:text-white/60 text-sm hover:text-spd-red dark:hover:text-white transition-colors mt-0.5 block"
            >
              {email}
            </a>
          </div>
        </div>
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 bg-spd-red/10 dark:bg-white/15 rounded-xl flex items-center justify-center shrink-0">
            <Phone size={16} className="text-spd-red dark:text-white" />
          </div>
          <div>
            <p className="text-gray-900 dark:text-white font-semibold text-sm">Telefon</p>
            <a
              href={`tel:${telefonLink}`}
              className="text-gray-500 dark:text-white/60 text-sm hover:text-spd-red dark:hover:text-white transition-colors mt-0.5 block"
            >
              {telefon}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
