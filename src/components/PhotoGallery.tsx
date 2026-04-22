import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {ChevronLeft, ChevronRight} from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import 'yet-another-react-lightbox/plugins/captions.css'


// ── PhotoGallery ─────────────────────────────────────────────────────────────

const MAX_VISIBLE_DOTS = 7

interface PhotoGalleryProps {
  images: string[]
  captions?: string[]
  alt: string
  /** Extra wrapper classes (e.g. margin). Defaults to nothing. */
  className?: string
}

export default function PhotoGallery({ images, captions, alt, className = '' }: PhotoGalleryProps) {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const lastNavTime = useRef(0)
  const tappedRef = useRef(false)
  const THROTTLE_MS = 300
  const total = images.length

  // Touch swipe state
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartY = useRef(0)
  const isHorizontalDrag = useRef<boolean | null>(null)

  const go = useCallback(
    (to: number) => {
      const now = Date.now()
      if (now - lastNavTime.current < THROTTLE_MS) return
      lastNavTime.current = now
      const next = ((to % total) + total) % total
      setDirection(next > active ? 1 : -1)
      setActive(next)
    },
    [active, total],
  )

  // Keyboard navigation
  useEffect(() => {
    if (total <= 1) return
    const handler = (e: KeyboardEvent) => {
      if (lightboxOpen) return
      if (e.key === 'ArrowLeft') go(active - 1)
      if (e.key === 'ArrowRight') go(active + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, go, lightboxOpen, total])

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  }

  if (images.length === 0) return null

  const slides = images.map((src, i) => ({
    src,
    description: captions?.[i] || undefined,
  }))

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, a, [role="button"]')) return
    isDragging.current = true
    isHorizontalDrag.current = null
    tappedRef.current = false
    dragStartX.current = e.touches[0].clientX
    dragStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || total <= 1) return
    const dx = e.touches[0].clientX - dragStartX.current
    const dy = e.touches[0].clientY - dragStartY.current

    // Determine drag axis on first significant movement
    if (isHorizontalDrag.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontalDrag.current = Math.abs(dx) > Math.abs(dy)
    }

    // Prevent vertical scroll when swiping horizontally
    if (isHorizontalDrag.current) {
      e.stopPropagation()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    const dx = e.changedTouches[0].clientX - dragStartX.current
    const dy = e.changedTouches[0].clientY - dragStartY.current

    if (total > 1 && isHorizontalDrag.current && Math.abs(dx) > 50) {
      go(active + (dx > 0 ? -1 : 1))
    } else if (!isHorizontalDrag.current && Math.abs(dy) < 10 && Math.abs(dx) < 10) {
      // It was a tap — open lightbox, and suppress the subsequent click
      if (!(e.target as HTMLElement).closest('button, a, [role="button"]')) {
        tappedRef.current = true
        setLightboxOpen(true)
      }
    }
    isHorizontalDrag.current = null
  }

  const handleClick = () => {
    // On touch devices the tap is already handled in handleTouchEnd
    if (tappedRef.current) {
      tappedRef.current = false
      return
    }
    setLightboxOpen(true)
  }

  // Compute visible dot window for large galleries
  const dotRange = useMemo(() => {
    if (total <= MAX_VISIBLE_DOTS) return {start: 0, end: total}
    const half = Math.floor(MAX_VISIBLE_DOTS / 2)
    let start = active - half
    let end = active + half + 1
    if (start < 0) {
      start = 0;
      end = MAX_VISIBLE_DOTS
    }
    if (end > total) {
      end = total;
      start = total - MAX_VISIBLE_DOTS
    }
    return {start, end}
  }, [active, total])

  return (
    <div className={className}>
      {/* Inline slideshow */}
      <div
        className="relative rounded-2xl overflow-hidden bg-gray-900 select-none cursor-zoom-in touch-pan-y"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative aspect-video overflow-hidden max-h-[55vh]">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.img
              key={active}
              src={images[active]}
              alt={`${alt} – Foto ${active + 1}`}
              loading={active === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 w-full h-full object-contain"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              draggable={false}
            />
          </AnimatePresence>
        </div>

        {/* Prev / Next arrows */}
        {total > 1 && (
          <>
            <button
              onClick={e => {
                e.stopPropagation()
                go(active - 1)
              }}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full
                         bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-white
                         shadow-lg shadow-black/20 backdrop-blur-sm
                         flex items-center justify-center
                         hover:bg-white hover:scale-110 active:scale-95
                         transition-all duration-200 z-10"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={e => {
                e.stopPropagation()
                go(active + 1)
              }}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full
                         bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-white
                         shadow-lg shadow-black/20 backdrop-blur-sm
                         flex items-center justify-center
                         hover:bg-white hover:scale-110 active:scale-95
                         transition-all duration-200 z-10"
              aria-label="Nächstes Bild"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Counter badge */}
        {total > 1 && (
          <span className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full z-10">
            {active + 1} / {total}
          </span>
        )}
      </div>

      {/* Dot indicators */}
      {total > 1 && (
          <div className="flex justify-center items-center gap-1.5 mt-3">
            {dotRange.start > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"/>
            )}
            {images.slice(dotRange.start, dotRange.end).map((_, idx) => {
              const i = dotRange.start + idx
              return (
                  <button
                      key={i}
                      onClick={() => go(i)}
                      className={`rounded-full transition-all duration-300 ${
                          i === active
                              ? 'w-6 h-2 bg-spd-red'
                              : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                      }`}
                      aria-label={`Bild ${i + 1}`}
                  />
              )
            })}
            {dotRange.end < total && (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"/>
            )}
        </div>
      )}

      {/* Fullscreen lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={slides}
        index={active}
        on={{ view: ({ index }) => setActive(index) }}
        plugins={[Counter, Captions, Zoom]}
        captions={{descriptionTextAlign: 'center'}}
        carousel={{ finite: total <= 1 }}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
          pinchZoomDistanceFactor: 50,
        }}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
        }}
      />
    </div>
  )
}
