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
 */
export function parseICS(icsText: string): ICSEvent[] {
  const parsed = ICAL.parse(icsText)
  const comp = new ICAL.Component(parsed)
  const vevents = comp.getAllSubcomponents('vevent')

  const events: ICSEvent[] = []

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent)

    const startDate = event.startDate
    if (!startDate) continue

    const jsDate = startDate.toJSDate()
    const pad = (n: number) => String(n).padStart(2, '0')

    const datum = `${jsDate.getFullYear()}-${pad(jsDate.getMonth() + 1)}-${pad(jsDate.getDate())}`

    // For all-day events startDate.isDate is true, show 00:00
    const uhrzeit = startDate.isDate
      ? '00:00'
      : `${pad(jsDate.getHours())}:${pad(jsDate.getMinutes())}`

    events.push({
      id: event.uid || `ics-${events.length}-${datum}`,
      datum,
      uhrzeit,
      titel: event.summary || 'Ohne Titel',
      ort: event.location || '',
      beschreibung: event.description || '',
    })
  }

  // Sort by date, then time
  events.sort((a, b) => a.datum.localeCompare(b.datum) || a.uhrzeit.localeCompare(b.uhrzeit))

  return events
}
