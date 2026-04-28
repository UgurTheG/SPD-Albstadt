import { X } from 'lucide-react'
import {
  animate,
  AnimatePresence,
  motion,
  type PanInfo,
  useDragControls,
  useMotionValue,
} from 'framer-motion'
import { type ReactNode, useEffect, useRef } from 'react'
import { lockScroll } from '../utils/scrollLock'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg'
}

export default function Sheet({ open, onClose, children, size = 'md' }: SheetProps) {
  const maxW = size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
  const dragControls = useDragControls()
  const sheetY = useMotionValue(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      sheetY.set(0)
      return lockScroll()
    }
  }, [open, sheetY])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 80 || info.velocity.y > 500) {
      onClose()
    } else {
      animate(sheetY, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
  }

  // Native touch handler for swipe-to-dismiss from anywhere on the sheet.
  // Uses non-passive touchmove so we can preventDefault() and stop the browser
  // from scrolling when the user pulls down from the top of the sheet.
  useEffect(() => {
    if (!open || !sheetRef.current) return
    const el = sheetRef.current

    let startY = 0
    let dismissing = false

    const onTouchStart = (e: TouchEvent) => {
      const isInteractive = (e.target as HTMLElement).closest(
        'button, a, input, textarea, select, [role="button"]',
      )
      if (isInteractive) return
      startY = e.touches[0].clientY
      dismissing = false
    }

    const onTouchMove = (e: TouchEvent) => {
      const isInteractive = (e.target as HTMLElement).closest(
        'button, a, input, textarea, select, [role="button"]',
      )
      if (isInteractive) return

      const currentY = e.touches[0].clientY
      const deltaY = currentY - startY

      // Determine drag axis on first significant movement
      if (!dismissing && el.scrollTop <= 1 && deltaY > 5) {
        // Don't dismiss if the touch originated inside a nested scrollable
        // element that is scrolled below its own top (user is scrolling that panel up)
        let node: HTMLElement | null = e.target as HTMLElement
        let insideNestedScroll = false
        while (node && node !== el) {
          const ov = getComputedStyle(node).overflowY
          if ((ov === 'auto' || ov === 'scroll') && node.scrollTop > 1) {
            insideNestedScroll = true
            break
          }
          node = node.parentElement
        }
        if (!insideNestedScroll) {
          dismissing = true
          startY = currentY
        }
      }

      if (dismissing) {
        e.preventDefault() // prevent native scroll — only works because listener is non-passive
        sheetY.set(Math.max(0, currentY - startY))
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!dismissing) return
      const deltaY = e.changedTouches[0].clientY - startY
      if (deltaY > 80) {
        onClose()
      } else {
        animate(sheetY, 0, { type: 'spring', stiffness: 400, damping: 40 })
      }
      dismissing = false
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [open, onClose, sheetY])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 touch-none"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%', scale: 0.98, opacity: 0 }}
            animate={{
              y: 0,
              scale: 1,
              opacity: 1,
              transition: { type: 'spring', damping: 42, stiffness: 260, mass: 1.2 },
            }}
            exit={{
              y: '100%',
              scale: 0.98,
              opacity: 0,
              transition: { type: 'tween', duration: 0.3, ease: [0.4, 0, 1, 1] },
            }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.15 }}
            style={{ y: sheetY }}
            onDragEnd={handleDragEnd}
            onClick={e => e.stopPropagation()}
            className={`relative bg-white dark:bg-gray-900 w-full ${maxW}
                        rounded-t-[28px] sm:rounded-3xl
                        max-h-[92vh] landscape-compact:h-[92vh]
                        overflow-y-auto overscroll-contain no-scrollbar
                        shadow-[0_0_50px_rgba(0,0,0,0.25)]`}
          >
            {/* Mobile drag handle — large touch target to initiate swipe-down-to-dismiss */}
            <div
              className="sm:hidden flex justify-center pt-5 pb-4 touch-none select-none cursor-grab active:cursor-grabbing"
              onPointerDown={e => {
                e.stopPropagation()
                dragControls.start(e)
              }}
            >
              <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Floating controls — zero-height, overlays content */}
            <div className="sticky top-0 z-30 h-0 pointer-events-none">
              <div className="flex items-center justify-between px-4 pt-3">
                <div className="hidden sm:block" />
                <button
                  onClick={onClose}
                  className="ml-auto pointer-events-auto flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9
                             rounded-full
                             bg-black/20 dark:bg-black/40
                             backdrop-blur-xl
                             text-white/90
                             shadow-lg shadow-black/20
                             hover:bg-black/30 dark:hover:bg-black/50
                             hover:scale-110
                             active:scale-90
                             transition-all duration-200"
                  aria-label="Schließen"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
