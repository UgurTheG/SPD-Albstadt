import { useState } from 'react'

/**
 * Minimal sheet/modal state: tracks what's open, provides open (set) and close helpers.
 * Pass the "closed" sentinel as the initial value — null for single-type sheets,
 * { type: 'none' } for discriminated-union multi-type sheets.
 */
export function useSheetState<S>(closed: S) {
  const [state, setState] = useState<S>(closed)
  return { state, set: setState, close: () => setState(closed) }
}
