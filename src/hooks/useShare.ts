import { useEffect, useRef, useState } from 'react'

interface ShareTarget {
  title: string
  text?: string
  url: string
}

/**
 * Shares via the Web Share API where available and otherwise copies the URL
 * to the clipboard; `copied` stays true for two seconds after a copy.
 */
export function useShare(target: ShareTarget) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share(target)
      } catch {
        // user cancelled the share sheet
      }
      return
    }
    try {
      await navigator.clipboard.writeText(target.url)
    } catch {
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return { share, copied }
}
