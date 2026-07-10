import { useEffect } from 'react'

/**
 * Shared dismiss behaviour for admin modals: closes on Escape and locks body
 * scroll while mounted, restoring the previous overflow value on unmount.
 */
export function useModalDismiss(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])
}
