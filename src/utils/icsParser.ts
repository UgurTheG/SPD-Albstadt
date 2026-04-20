/**
 * ICS parser powered by ical.js (Mozilla).
 * Thin wrapper that maps VEVENT components to a flat event structure
 * compatible with the CalendarView component.
 */
import ICAL from 'ical.js'

export interface ICSEvent {
  id: string
  datum: string      // YYYY-MM-DD
  uhrzeit: string    // HH:MM
  titel: string
  ort: string
  beschreibung: string
}

/**
 * Parse raw ICS text into an array of ICSEvent objects.
 * Recurring events (RRULE) are expanded into individual occurrences
 * up to ~2 years in the future, with EXDATE exclusions and
 * RECURRENCE-ID overrides applied via ical.js.
 */
export function parseICS(icsText: string): ICSEvent[] {
  const parsed = ICAL.parse(icsText)
  const comp = new ICAL.Component(parsed)
  const vevents = comp.getAllSubcomponents('vevent')

  const events: ICSEvent[] = []
  const pad = (n: number) => String(n).padStart(2, '0')

  const now = new Date()
  const horizonStart = ICAL.Time.fromJSDate(
    new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
    false,
  )
  const horizonEnd = ICAL.Time.fromJSDate(
    new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()),
    false,
  )
  // Safety bound against pathological RRULEs. With the 3-year window this
  // comfortably covers a daily series whose DTSTART is up to ~10 years old.
  const MAX_ITERATIONS = 5000

  const pushOccurrence = (
    uid: string,
    index: number,
    jsDate: Date,
    isAllDay: boolean,
    summary: string,
    location: string,
    description: string,
  ) => {
    const datum = `${jsDate.getFullYear()}-${pad(jsDate.getMonth() + 1)}-${pad(jsDate.getDate())}`
    const uhrzeit = isAllDay
      ? '00:00'
      : `${pad(jsDate.getHours())}:${pad(jsDate.getMinutes())}`
    events.push({
      id: `${uid}-${index}-${datum}`,
      datum,
      uhrzeit,
      titel: summary || 'Ohne Titel',
      ort: location,
      beschreibung: description,
    })
  }

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent)
    if (event.isRecurrenceException()) continue

    const startDate = event.startDate
    if (!startDate) continue

    const uid = event.uid || `ics-${events.length}`

    if (!event.isRecurring()) {
      pushOccurrence(
        uid,
        0,
        startDate.toJSDate(),
        startDate.isDate,
        event.summary || '',
        event.location || '',
        event.description || '',
      )
      continue
    }

    const iterator = event.iterator()
    let next = iterator.next()
    let i = 0
    let emitted = 0
    while (next && i < MAX_ITERATIONS) {
      if (next.compare(horizonEnd) > 0) break
      if (next.compare(horizonStart) >= 0) {
        const details = event.getOccurrenceDetails(next)
        pushOccurrence(
          uid,
          emitted,
          details.startDate.toJSDate(),
          details.startDate.isDate,
          details.item.summary || '',
          details.item.location || '',
          details.item.description || '',
        )
        emitted++
      }
      next = iterator.next()
      i++
    }
  }

  // Sort by date, then time
  events.sort((a, b) => a.datum.localeCompare(b.datum) || a.uhrzeit.localeCompare(b.uhrzeit))

  return events
}
