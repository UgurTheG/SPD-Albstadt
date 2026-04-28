import { describe, it, expect } from 'vitest'
import { formatDate, isoToDE, deToISO } from '../formatDate'

describe('isoToDE', () => {
  it('converts YYYY-MM-DD to DD.MM.YYYY', () => {
    expect(isoToDE('2026-04-28')).toBe('28.04.2026')
  })

  it('preserves leading zeros', () => {
    expect(isoToDE('2024-01-05')).toBe('05.01.2024')
  })

  it('returns empty string for empty input', () => {
    expect(isoToDE('')).toBe('')
  })

  it('handles single-digit day and month from ISO', () => {
    expect(isoToDE('2024-12-31')).toBe('31.12.2024')
  })
})

describe('deToISO', () => {
  it('converts DD.MM.YYYY to YYYY-MM-DD', () => {
    expect(deToISO('28.04.2026')).toBe('2026-04-28')
  })

  it('pads single-digit day and month', () => {
    expect(deToISO('5.1.2024')).toBe('2024-01-05')
  })

  it('returns empty string for invalid input', () => {
    expect(deToISO('not-a-date')).toBe('')
    expect(deToISO('')).toBe('')
    expect(deToISO('28-04-2026')).toBe('') // wrong separator
    expect(deToISO('2026.04.28')).toBe('') // ISO format not accepted
  })

  it('round-trips with isoToDE', () => {
    const iso = '2025-07-14'
    expect(deToISO(isoToDE(iso))).toBe(iso)
  })
})

describe('formatDate', () => {
  it('returns a non-empty German-formatted string', () => {
    const result = formatDate('2026-04-28')
    // The exact output depends on locale, but should contain "2026" and "April"
    expect(result).toContain('2026')
    expect(result).toContain('April')
  })

  it('returns a string for a valid date', () => {
    expect(typeof formatDate('2024-01-01')).toBe('string')
  })
})
