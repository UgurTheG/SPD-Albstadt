import PhotoGallery from '@/components/PhotoGallery'
import type { TimelineEntry } from './types'

/** Detail sheet content for a single timeline event. */
export function EventSheet({ entry }: { entry: TimelineEntry }) {
  return (
    /* Portrait: stacked. Short landscape: two columns — header left, gallery/body right */
    <div
      className="landscape-compact:flex
                 landscape-compact:flex-row
                 landscape-compact:min-h-0
                 landscape-compact:h-full"
    >
      {/* Header */}
      <div
        className="relative overflow-hidden bg-gray-100 dark:bg-gray-950
                   px-6 pt-8 pb-8
                   landscape-compact:px-5
                   landscape-compact:pt-6
                   landscape-compact:pb-6
                   landscape-compact:w-2/5
                   landscape-compact:shrink-0
                   landscape-compact:flex
                   landscape-compact:flex-col
                   landscape-compact:justify-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(227,0,15,0.08),transparent_50%)]" />
        <span className="absolute -right-4 top-0 text-[120px] landscape-compact:text-[72px] font-black text-gray-900/8 dark:text-white/4 leading-none select-none pointer-events-none">
          {entry.jahr.split('–')[0]}
        </span>
        <div className="relative">
          <div className="w-10 h-0.5 bg-spd-red rounded-full mb-4" />
          <p className="text-spd-red/70 text-xs font-bold uppercase tracking-widest mb-1.5 text-left [hyphens:none]">
            {entry.jahr}
          </p>
          <h3 className="text-xl sm:text-2xl landscape-compact:text-lg font-black text-gray-900 dark:text-white leading-snug text-left [hyphens:none]">
            {entry.titel}
          </h3>
        </div>
      </div>

      {/* Body / gallery */}
      <div
        className="px-6 pt-6 pb-8
                   landscape-compact:px-4
                   landscape-compact:py-4
                   landscape-compact:flex-1
                   landscape-compact:overflow-y-auto"
      >
        {entry.bilder && entry.bilder.length > 0 && (
          <div className="mb-6">
            <PhotoGallery
              images={entry.bilder}
              captions={entry.bilderBeschreibungen}
              alt={entry.titel}
            />
            <div className="w-10 h-0.5 bg-spd-red rounded-full mt-6" />
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
          {entry.beschreibung}
        </p>
      </div>
    </div>
  )
}
