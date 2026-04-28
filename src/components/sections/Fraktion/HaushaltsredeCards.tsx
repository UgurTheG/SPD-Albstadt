import { FileDown } from 'lucide-react'
import { haushaltsPdfUrl } from '@/hooks/useHaushaltsreden'

/** A PDF download tile for a year that has a file available. */
export function HaushaltsredeCard({ year }: { year: number }) {
  return (
    <a
      href={haushaltsPdfUrl(year)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-2.5 p-4
                 bg-white dark:bg-gray-800/60 rounded-2xl
                 border border-gray-100 dark:border-gray-800/80
                 shadow-sm dark:shadow-black/20
                 hover:shadow-lg hover:-translate-y-0.5
                 transition-all duration-400"
    >
      <div className="w-10 h-10 bg-spd-red/8 dark:bg-spd-red/12 rounded-xl flex items-center justify-center">
        <FileDown size={18} className="text-spd-red" />
      </div>
      <div className="text-center">
        <p className="font-black text-gray-900 dark:text-white text-sm">{year}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium uppercase tracking-wider">
          PDF
        </p>
      </div>
    </a>
  )
}

/** A placeholder tile for a year whose PDF is not yet available. */
export function HaushaltsredePlaceholder({ year }: { year: number }) {
  return (
    <div
      className="flex flex-col items-center gap-2.5 p-4
                 bg-gray-50 dark:bg-gray-800/30 rounded-2xl
                 border border-dashed border-gray-200 dark:border-gray-800
                 select-none"
    >
      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800/60 rounded-xl flex items-center justify-center">
        <FileDown size={18} className="text-gray-300 dark:text-gray-600" />
      </div>
      <div className="text-center">
        <p className="font-black text-gray-300 dark:text-gray-600 text-sm">{year}</p>
        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5 font-medium uppercase tracking-wider">
          Demnächst
        </p>
      </div>
    </div>
  )
}
