import { describe, it, expect } from 'vitest'
import { parseICS } from '../icsParser'

// Minimal helpers to build valid ICS text
const wrapVCalendar = (vevents: string) => `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
${vevents}
END:VCALENDAR`

const makeVEvent = (fields: Record<string, string>) => {
  const lines = Object.entries(fields)
    .map(([k, v]) => `${k}:${v}`)
    .join('\n')
  return `BEGIN:VEVENT\n${lines}\nEND:VEVENT`
}

describe('parseICS', () => {
  it('returns an empty array for a calendar with no events', () => {
    const ics = wrapVCalendar('')
    expect(parseICS(ics)).toEqual([])
  })

  it('parses a single timed VEVENT', () => {
    const ics = wrapVCalendar(
      makeVEvent({
        UID: 'meeting-1@test',
        DTSTART: '20260428T190000',
        DTEND: '20260428T210000',
        SUMMARY: 'SPD Treffen',
        LOCATION: 'Albstadt',
        DESCRIPTION: 'Monatstreffen',
      }),
    )
    const events = parseICS(ics)
    expect(events).toHaveLength(1)
    const ev = events[0]
    expect(ev.datum).toBe('2026-04-28')
    expect(ev.titel).toBe('SPD Treffen')
    expect(ev.ort).toBe('Albstadt')
    expect(ev.beschreibung).toBe('Monatstreffen')
    expect(ev.ganztaegig).toBe(false)
  })

  it('parses an all-day VEVENT (VALUE=DATE)', () => {
    const ics = wrapVCalendar(
      makeVEvent({
        UID: 'allday-1@test',
        'DTSTART;VALUE=DATE': '20260501',
        'DTEND;VALUE=DATE': '20260502',
        SUMMARY: 'Tag der Arbeit',
      }),
    )
    const events = parseICS(ics)
    expect(events).toHaveLength(1)
    expect(events[0].ganztaegig).toBe(true)
    expect(events[0].datum).toBe('2026-05-01')
    expect(events[0].uhrzeit).toBe('00:00')
  })

  it('expands a multi-day all-day event into one entry per day', () => {
    const ics = wrapVCalendar(
      makeVEvent({
        UID: 'multiday-1@test',
        'DTSTART;VALUE=DATE': '20260601',
        'DTEND;VALUE=DATE': '20260604', // exclusive end → covers 1, 2, 3
        SUMMARY: 'Konferenz',
      }),
    )
    const events = parseICS(ics)
    expect(events).toHaveLength(3)
    expect(events[0].datum).toBe('2026-06-01')
    expect(events[1].datum).toBe('2026-06-02')
    expect(events[2].datum).toBe('2026-06-03')
  })

  it('sorts events by date ascending', () => {
    const ics = wrapVCalendar(
      [
        makeVEvent({ UID: 'b@test', DTSTART: '20261201T090000', SUMMARY: 'December' }),
        makeVEvent({ UID: 'a@test', DTSTART: '20260101T090000', SUMMARY: 'January' }),
      ].join('\n'),
    )
    const events = parseICS(ics)
    expect(events[0].titel).toBe('January')
    expect(events[1].titel).toBe('December')
  })

  it('falls back to "Ohne Titel" when SUMMARY is missing', () => {
    const ics = wrapVCalendar(
      makeVEvent({
        UID: 'notitle@test',
        DTSTART: '20260428T100000',
        DTEND: '20260428T110000',
      }),
    )
    const events = parseICS(ics)
    expect(events[0].titel).toBe('Ohne Titel')
  })

  it('generates a stable id per occurrence', () => {
    const ics = wrapVCalendar(
      makeVEvent({
        UID: 'stable-id@test',
        DTSTART: '20260428T150000',
        DTEND: '20260428T160000',
        SUMMARY: 'Meeting',
      }),
    )
    const events = parseICS(ics)
    expect(events[0].id).toContain('stable-id@test')
  })

  it('parses timed event uhrzeit correctly', () => {
    const ics = wrapVCalendar(
      makeVEvent({
        UID: 'time-test@test',
        DTSTART: '20260815T143000',
        DTEND: '20260815T160000',
        SUMMARY: 'Nachmittagstreffen',
      }),
    )
    const events = parseICS(ics)
    expect(events[0].uhrzeit).toBe('14:30')
  })
})

describe('parseICS — recurring events (RRULE)', () => {
  it('expands a weekly recurring event into multiple occurrences', () => {
    // RRULE with COUNT=3 → exactly 3 occurrences
    const ics = wrapVCalendar(
      `BEGIN:VEVENT
UID:weekly-1@test
DTSTART:20260601T100000
DTEND:20260601T110000
RRULE:FREQ=WEEKLY;COUNT=3
SUMMARY:Wöchentliches Meeting
END:VEVENT`,
    )
    const events = parseICS(ics)
    expect(events).toHaveLength(3)
    expect(events[0].datum).toBe('2026-06-01')
    expect(events[1].datum).toBe('2026-06-08')
    expect(events[2].datum).toBe('2026-06-15')
  })

  it('expands a monthly recurring event within the horizon', () => {
    const ics = wrapVCalendar(
      `BEGIN:VEVENT
UID:monthly-1@test
DTSTART:20260601T090000
DTEND:20260601T100000
RRULE:FREQ=MONTHLY;COUNT=4
SUMMARY:Monatstreffen
END:VEVENT`,
    )
    const events = parseICS(ics)
    expect(events).toHaveLength(4)
  })

  it('each recurring occurrence has a unique id', () => {
    const ics = wrapVCalendar(
      `BEGIN:VEVENT
UID:unique-ids@test
DTSTART:20260701T120000
DTEND:20260701T130000
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:Täglich
END:VEVENT`,
    )
    const events = parseICS(ics)
    const ids = events.map(e => e.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('recurring occurrences are not all-day', () => {
    const ics = wrapVCalendar(
      `BEGIN:VEVENT
UID:timed-recur@test
DTSTART:20260601T080000
DTEND:20260601T090000
RRULE:FREQ=WEEKLY;COUNT=2
SUMMARY:Früh auf
END:VEVENT`,
    )
    const events = parseICS(ics)
    events.forEach(ev => expect(ev.ganztaegig).toBe(false))
  })
})
