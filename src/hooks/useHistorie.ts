import { useCallback, useMemo, useReducer } from 'react'
import { useData } from './useData'
import { useHttpErrorRedirect } from './useHttpErrorRedirect'
import type {
  HistoryData,
  MergedItem,
  Persoenlichkeit,
  TimelineEntry,
} from '../components/sections/Historie/types'
import { parseFirstYear } from '../components/sections/Historie/types'

// ---------------------------------------------------------------------------
// Sheet state machine
// ---------------------------------------------------------------------------

type SheetState =
  | { type: 'none' }
  | { type: 'event'; entry: TimelineEntry }
  | { type: 'person'; person: Persoenlichkeit }

type SheetAction =
  | { type: 'openEvent'; entry: TimelineEntry }
  | { type: 'openPerson'; person: Persoenlichkeit }
  | { type: 'close' }

function sheetReducer(_: SheetState, action: SheetAction): SheetState {
  switch (action.type) {
    case 'openEvent':
      return { type: 'event', entry: action.entry }
    case 'openPerson':
      return { type: 'person', person: action.person }
    case 'close':
      return { type: 'none' }
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseHistorieResult {
  data: HistoryData | null
  merged: MergedItem[]
  sheet: SheetState
  openEvent: (entry: TimelineEntry) => void
  openPerson: (person: Persoenlichkeit) => void
  closeSheet: () => void
}

/**
 * Encapsulates all data-fetching, merging and sheet-state logic for the
 * Historie section so the component stays focused on rendering.
 */
export function useHistorie(): UseHistorieResult {
  const { data, error } = useData<HistoryData>('/data/history.json')
  useHttpErrorRedirect(error)

  const [sheet, dispatch] = useReducer(sheetReducer, { type: 'none' })

  const openEvent = useCallback(
    (entry: TimelineEntry) => dispatch({ type: 'openEvent', entry }),
    [],
  )
  const openPerson = useCallback(
    (person: Persoenlichkeit) => dispatch({ type: 'openPerson', person }),
    [],
  )
  const closeSheet = useCallback(() => dispatch({ type: 'close' }), [])

  const merged = useMemo<MergedItem[]>(
    () =>
      [
        ...(data?.timeline ?? []).map(e => ({
          type: 'event' as const,
          year: parseFirstYear(e.jahr),
          data: e,
        })),
        ...(data?.persoenlichkeiten ?? []).map(p => ({
          type: 'person' as const,
          year: parseFirstYear(p.jahre),
          data: p,
        })),
      ].sort((a, b) => a.year - b.year),
    [data],
  )

  return { data, merged, sheet, openEvent, openPerson, closeSheet }
}
