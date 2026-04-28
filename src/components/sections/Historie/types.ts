export interface TimelineEntry {
  jahr: string
  titel: string
  beschreibung: string
  bilder?: string[]
  bilderBeschreibungen?: string[]
}

export interface Persoenlichkeit {
  name: string
  jahre: string
  rolle: string
  beschreibung: string
  bildUrl: string
  bildUrls?: string[]
}

export interface HistoryData {
  einleitung: string
  timeline: TimelineEntry[]
  persoenlichkeiten: Persoenlichkeit[]
}

export type MergedItem =
  | { type: 'event'; year: number; data: TimelineEntry }
  | { type: 'person'; year: number; data: Persoenlichkeit }

/**
 * Single source of truth for every MergedItem type.
 * - legendDotClass  → decorative dot shown in the section legend
 * - rowDotClass     → larger dot rendered on the timeline spine
 *
 * Adding a new MergedItem type means adding one entry here;
 * both Historie/index.tsx (legend) and TimelineRow.tsx (dot) consume it automatically.
 */
export const TIMELINE_TYPE_META: Record<
  MergedItem['type'],
  { label: string; legendDotClass: string; rowDotClass: string }
> = {
  event: {
    label: 'Ereignis',
    legendDotClass: 'w-3 h-3 rounded-full bg-spd-red',
    rowDotClass: 'w-4 h-4 bg-spd-red border-4 border-white dark:border-gray-900',
  },
  person: {
    label: 'Kommunale Persönlichkeit',
    legendDotClass: 'w-2.5 h-2.5 rounded-full border-2 border-spd-red bg-white dark:bg-gray-900',
    rowDotClass: 'w-3 h-3 bg-white dark:bg-gray-900 border-2 border-spd-red',
  },
}

/** Returns the earliest 4-digit year found in a string like "1919–1933" or "1974". */
export function parseFirstYear(jahre: string): number {
  const matches = jahre.match(/\d{4}/g)
  if (!matches) return 9999
  return Math.min(...matches.map(Number))
}
