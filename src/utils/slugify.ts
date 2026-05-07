/**
 * Converts a human-readable string into a URL-safe slug.
 *
 * - Replaces German umlauts (ä → ae, ö → oe, ü → ue, ß → ss)
 * - Lowercases everything
 * - Replaces `–`, `—`, spaces, `&`, `/`, `(`, `)`, `+` with `-`
 * - Strips all remaining non-alphanumeric, non-dash characters
 * - Collapses consecutive dashes and trims leading/trailing dashes
 *
 * Examples:
 *   "Bildung und Jugend"       → "bildung-und-jugend"
 *   "Mobilität und ÖPNV"       → "mobilitaet-und-oepnv"
 *   "1890–1918"                → "1890-1918"
 *   "2021–heute"               → "2021-heute"
 */
export function slugify(value: string): string {
  return value
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'ae')
    .replace(/Ö/g, 'oe')
    .replace(/Ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[–—&/+()]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}
