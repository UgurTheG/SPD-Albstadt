/**
 * Calendar utilities shared between CalendarView, EventDetailSheet,
 * DayPickerSheet and the ICS download button.
 */
import { createEvent, type DateArray } from 'ics'
import type { ICSEvent } from './icsParser'

/** Converts a JS Date to a YYYY-MM-DD string in local time. */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns localised day/month/weekday/full labels for a YYYY-MM-DD date string. */
export function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: d.toLocaleDateString('de-DE', { day: '2-digit' }),
    month: d.toLocaleDateString('de-DE', { month: 'short' }),
    weekday: d.toLocaleDateString('de-DE', { weekday: 'short' }),
    full: d.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }
}

/** Triggers a browser download of an .ics file for the given event. */
export function downloadICS(event: ICSEvent): void {
  const d = new Date(event.datum + 'T00:00:00')

  const start: DateArray = event.ganztaegig
    ? [d.getFullYear(), d.getMonth() + 1, d.getDate()]
    : (() => {
        const [hours, minutes] = event.uhrzeit.split(':').map(Number)
        d.setHours(hours || 0, minutes || 0, 0, 0)
        return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()]
      })()

  const { error, value } = createEvent({
    start,
    startInputType: 'local',
    duration: event.ganztaegig ? { days: 1 } : { hours: 2 },
    title: event.titel,
    location: event.ort,
    description: event.beschreibung || undefined,
    uid: `${event.id}@spd-albstadt.de`,
    productId: 'SPD Albstadt//Events//DE',
  })

  if (error || !value) return

  const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${event.titel.replace(/[^a-zA-Z0-9äöüÄÖÜß -]/g, '').replace(/\s+/g, '-')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
