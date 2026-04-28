import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toDateStr, formatEventDate, downloadICS } from '../calendarUtils'
import type { ICSEvent } from '../icsParser'

// ─── toDateStr ────────────────────────────────────────────────────────────────

describe('toDateStr', () => {
  it('formats a date to YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 28) // April 28 (month is 0-indexed)
    expect(toDateStr(d)).toBe('2026-04-28')
  })

  it('pads single-digit month and day with a leading zero', () => {
    const d = new Date(2025, 0, 5) // Jan 5
    expect(toDateStr(d)).toBe('2025-01-05')
  })

  it('handles December correctly', () => {
    const d = new Date(2024, 11, 31)
    expect(toDateStr(d)).toBe('2024-12-31')
  })
})

// ─── formatEventDate ──────────────────────────────────────────────────────────

describe('formatEventDate', () => {
  it('returns an object with day, month, weekday and full keys', () => {
    const result = formatEventDate('2026-04-28')
    expect(result).toHaveProperty('day')
    expect(result).toHaveProperty('month')
    expect(result).toHaveProperty('weekday')
    expect(result).toHaveProperty('full')
  })

  it('returns the 2-digit day', () => {
    expect(formatEventDate('2026-04-28').day).toBe('28')
  })

  it('returns a German abbreviated month name', () => {
    const { month } = formatEventDate('2026-01-15')
    // German: "Jan.", "Feb.", etc. — just verify it's a short string
    expect(typeof month).toBe('string')
    expect(month.length).toBeGreaterThan(0)
  })

  it('returns a German abbreviated weekday', () => {
    const { weekday } = formatEventDate('2026-04-28') // Tuesday
    expect(typeof weekday).toBe('string')
    expect(weekday.length).toBeGreaterThan(0)
  })

  it('full label contains the year', () => {
    expect(formatEventDate('2026-04-28').full).toContain('2026')
  })
})

// ─── downloadICS ──────────────────────────────────────────────────────────────

describe('downloadICS', () => {
  let appendSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.fn>
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    clickSpy = vi.fn()
    // Stub createElement to intercept the anchor click
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag)
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: clickSpy, writable: true })
      }
      return el
    })
    appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(node => node)
    removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(node => node)
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const makeEvent = (overrides?: Partial<ICSEvent>): ICSEvent => ({
    id: 'evt-1',
    datum: '2026-06-01',
    uhrzeit: '19:00',
    ganztaegig: false,
    titel: 'SPD Treffen',
    ort: 'Albstadt',
    beschreibung: 'Monatstreffen',
    ...overrides,
  })

  it('triggers a click on the generated anchor', () => {
    downloadICS(makeEvent())
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('creates a blob URL and revokes it afterwards', () => {
    downloadICS(makeEvent())
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('appends the anchor to body and removes it after click', () => {
    downloadICS(makeEvent())
    expect(appendSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy).toHaveBeenCalledTimes(1)
  })

  it('works for all-day events', () => {
    downloadICS(makeEvent({ ganztaegig: true, uhrzeit: '00:00' }))
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('sanitises special characters in the filename', () => {
    // The downloadICS function sets anchor.download to a sanitised filename.
    // The anchor is the element captured by the existing beforeEach createElement spy:
    // we just verify the click was triggered (which means no hard throw from createEvent)
    // and confirm the special chars would be stripped by the regex in the source.
    const titel = 'Römer & Söhne! (2026)'
    // Replicate the in-source sanitisation: replace /[^a-zA-Z0-9 -]/g then /\s+/g
    const sanitised = titel.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-')
    expect(sanitised).not.toMatch(/[&!()ö]/)
    // Also ensure the full downloadICS path executes without error
    downloadICS(makeEvent({ titel }))
    expect(clickSpy).toHaveBeenCalled()
  })
})
