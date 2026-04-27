/**
 * Split a raw location string into display lines by resolving
 * literal newline characters (`\n`) into separate lines.
 */
export function formatLocation(raw: string): string[] {
  if (!raw) return []

  return raw
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
}
