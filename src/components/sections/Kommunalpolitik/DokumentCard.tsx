import { FileDown } from 'lucide-react'
import type { Dokument } from './types'

/** A generic document download tile used in the Kommunalpolitik documents grid. */
export function DokumentCard({ dok }: { dok: Dokument }) {
  return (
    <a
      href={dok.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-2.5 p-4
                 bg-white dark:bg-gray-800/60 rounded-2xl
                 border border-gray-100 dark:border-gray-800/80
                 shadow-sm dark:shadow-black/20
                 hover:shadow-lg hover:-translate-y-0.5
                 transition-all duration-300"
    >
      <div className="w-10 h-10 bg-spd-red/8 dark:bg-spd-red/12 rounded-xl flex items-center justify-center">
        <FileDown size={18} className="text-spd-red" />
      </div>
      <div className="text-center">
        <p className="font-black text-gray-900 dark:text-white text-sm leading-tight line-clamp-2">
          {dok.titel}
        </p>
      </div>
    </a>
  )
}
