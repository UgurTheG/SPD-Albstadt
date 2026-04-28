import { useEffect } from 'react'

const SCRIPT_ID = 'elfsight-platform'
const SCRIPT_SRC = 'https://elfsightcdn.com/platform.js'

/**
 * Lazily injects the Elfsight platform script into <head> once per page load.
 * Does nothing when `appId` is falsy.
 */
export function useElfsightScript(appId: string | undefined) {
  useEffect(() => {
    if (!appId) return
    if (document.getElementById(SCRIPT_ID)) return

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    document.head.appendChild(script)
  }, [appId])
}
