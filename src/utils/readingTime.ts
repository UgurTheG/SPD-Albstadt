const WORDS_PER_MINUTE = 200

/** Estimated reading time in whole minutes (at least 1) for the given texts. */
export function readingMinutes(...texts: string[]): number {
  const words = texts
    .join(' ')
    .split(/\s+/)
    .filter(token => /[\p{L}\p{N}]/u.test(token)).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}
