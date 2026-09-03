/**
 * Returns the URL if it is safe to place in an `href`, otherwise `undefined`.
 *
 * Content editors type link targets into JSON fields, and React only warns
 * about `javascript:` URLs — it does not block them. Only http(s) links and
 * site-relative paths are accepted; everything else (javascript:, data:,
 * vbscript:, protocol-relative, …) is dropped so the link renders inert.
 */
export function safeHref(url: string | undefined | null): string | undefined {
  if (typeof url !== 'string') return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  // Site-relative path (but not protocol-relative "//evil.example")
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? trimmed : undefined
  } catch {
    return undefined
  }
}
