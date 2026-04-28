import { useEffect, useState } from 'react'
import { Calendar, ExternalLink, Rss } from 'lucide-react'

interface Props {
  icsUrl: string
}

/**
 * Dropdown that lets users subscribe to the calendar feed via Apple/Outlook,
 * Google Calendar, or a direct ICS download.
 */
export default function CalendarSubscribeButton({ icsUrl }: Props) {
  const [open, setOpen] = useState(false)

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-spd-red/25 px-3 py-1.5 text-xs font-semibold text-spd-red hover:bg-spd-red hover:text-white transition-colors"
      >
        <Rss size={12} /> Abonnieren
      </button>

      {open && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 z-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden min-w-56">
            <div className="px-3 pt-3 pb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Kalender abonnieren
              </p>
            </div>

            <a
              href={icsUrl.replace(/^https?:\/\//, 'webcal://')}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-spd-red/10 dark:bg-spd-red/15 flex items-center justify-center shrink-0">
                <Calendar size={13} className="text-spd-red" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  Apple / Outlook
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Kalender-App öffnen</p>
              </div>
            </a>

            <a
              href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsUrl)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <ExternalLink size={13} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  Google Calendar
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Im Browser öffnen</p>
              </div>
            </a>

            <div className="px-3 pb-3 pt-1.5 border-t border-gray-100 dark:border-gray-800">
              <a
                href={icsUrl}
                download
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 hover:text-spd-red transition-colors"
              >
                <Rss size={10} /> ICS-Datei herunterladen
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
