import { describe, it, expect } from 'vitest'
import { readingMinutes } from '../readingTime'

const words = (n: number) => Array.from({ length: n }, () => 'Wort').join(' ')

describe('readingMinutes', () => {
  it('returns at least one minute', () => {
    expect(readingMinutes('')).toBe(1)
    expect(readingMinutes('Kurz.')).toBe(1)
  })

  it('rounds to the nearest minute at 200 words per minute', () => {
    expect(readingMinutes(words(500))).toBe(3)
    expect(readingMinutes(words(649))).toBe(3)
    expect(readingMinutes(words(700))).toBe(4)
  })

  it('adds up all given texts', () => {
    expect(readingMinutes(words(300), words(300))).toBe(3)
  })

  it('ignores formatting markers that are not words', () => {
    // 299 real words round down to one minute; counting the markers would tip it to two
    expect(readingMinutes(`## ${words(150)}\n- ${words(149)}\n> ** –`)).toBe(1)
  })
})
