/**
 * Locks scroll without any visual jump.
 * Reference-counted so nested locks (e.g. Sheet + lightbox) work correctly.
 */
let lockCount = 0
let savedPaddingRight = ''

export function lockScroll(): () => void {
  lockCount++
  if (lockCount === 1) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    savedPaddingRight = document.body.style.paddingRight
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }
  let released = false
  return () => {
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.body.style.paddingRight = savedPaddingRight
    }
  }
}
