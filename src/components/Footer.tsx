import { Mail } from 'lucide-react'
import { useConfig } from '../hooks/useConfig'
import { useNavigateTo } from '../hooks/useNavigateTo'

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.988h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12z" />
  </svg>
)

const InstagramIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)

export default function Footer() {
  const navigateTo = useNavigateTo()
  const year = new Date().getFullYear()
  const config = useConfig()
  const email = config?.kontakt?.email || 'info@spd-albstadt.de'
  const facebookUrl = config?.social?.facebookUrl || 'https://www.facebook.com/spdalbstadt'
  const instagramUrl = config?.social?.instagramUrl || 'https://www.instagram.com/spdalbstadt/'
  const beschreibung =
    config?.footerBeschreibung ||
    'Sozialdemokratische Partei Deutschlands, Ortsverein Albstadt. Für eine gerechte, soziale und zukunftsorientierte Stadtpolitik.'

  return (
    <footer className="bg-gray-950 dark:bg-black text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/spd-logo.svg" alt="SPD" className="w-10 h-10 rounded-xl shadow-lg" />
              <span className="font-black text-white text-xl tracking-tight">Albstadt</span>
            </div>
            <p className="text-sm leading-relaxed mb-4 max-w-xs">{beschreibung}</p>
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-5"
            >
              <Mail size={14} />
              {email}
            </a>
            <div className="flex items-center gap-2.5">
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 bg-gray-800 hover:bg-spd-red rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
              >
                <FacebookIcon />
              </a>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 bg-gray-800 hover:bg-spd-red rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
              >
                <InstagramIcon />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-bold text-sm mb-5 uppercase tracking-wide">
              Weitere Links
            </h4>
            <div className="flex flex-col gap-2.5 text-sm">
              <a
                href="https://www.spd.de"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                SPD Bundesverband
              </a>
              <a
                href="https://www.spd-bw.de"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                SPD Baden-Württemberg
              </a>
              <a
                href="https://www.spd.de/unterstuetzen/mitglied-werden"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Mitglied werden
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">© {year} SPD Albstadt. Alle Rechte vorbehalten.</p>
          <div className="flex gap-4 text-xs">
            <button
              onClick={() => navigateTo('impressum')}
              className="hover:text-white transition-colors"
            >
              Impressum
            </button>
            <button
              onClick={() => navigateTo('datenschutz')}
              className="hover:text-white transition-colors"
            >
              Datenschutz
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
