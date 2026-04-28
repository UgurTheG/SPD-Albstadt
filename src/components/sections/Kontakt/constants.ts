/** Subject options for the contact form — add/remove topics here. */
export const BETREFF_OPTIONS = [
  'Allgemeine Anfrage',
  'Mitglied werden',
  'Presseanfrage',
  'Veranstaltungen',
  'Sonstiges',
] as const

/** Fallback contact details shown when config.json has no kontakt block. */
export const DEFAULT_ADRESSE = 'SPD Albstadt\nStadtgarten 1\n72458 Albstadt-Ebingen'
export const DEFAULT_EMAIL = 'info@spd-albstadt.de'
export const DEFAULT_TELEFON = '07431 / 000 000'

/** Fallback office hours shown when config.json has no buerozeiten block. */
export const DEFAULT_BUEROZEITEN = [
  { tage: 'Montag – Freitag', zeit: '10:00 – 16:00' },
  { tage: 'Samstag', zeit: 'Nach Vereinbarung' },
]
