/**
 * Formats a date string (YYYY-MM-DD) to a localised German long date,
 * e.g. "23. April 2026".
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

/**
 * Converts an ISO date string (YYYY-MM-DD) to a German display string (DD.MM.YYYY).
 * Returns an empty string for falsy input.
 */
export function isoToDE(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/**
 * Parses a German date string (DD.MM.YYYY or D.M.YYYY) back to ISO format (YYYY-MM-DD).
 * Returns an empty string if the input does not match the expected pattern.
 */
export function deToISO(de: string): string {
  const match = de.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : ''
}
