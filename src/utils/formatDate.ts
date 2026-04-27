/**
 * Formats a date string (YYYY-MM-DD) to a localised German long date,
 * e.g. "23. April 2026".
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}
