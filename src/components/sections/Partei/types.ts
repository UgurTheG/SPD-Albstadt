/** Shared fields between Mitglied and Abgeordneter. */
interface PersonBase {
  name: string
  rolle: string
  email: string
  bildUrl: string
  bio: string
}

export const SCHWERPUNKT_STATUS = [
  'In Planung',
  'Im Gemeinderat beantragt',
  'In Umsetzung',
  'Erreicht',
] as const

export type SchwerpunktStatus = (typeof SCHWERPUNKT_STATUS)[number]

export interface Schwerpunkt {
  titel: string
  beschreibung: string
  icon: string
  inhalt?: string
  forderungen?: string[]
  status?: string
  zitat?: string
  zitatPerson?: string
  zitatBildUrl?: string
  newsSchlagwort?: string
}

export interface Mitglied extends PersonBase {
  phone?: string
  address?: string
  place?: string
}

export interface Abgeordneter extends PersonBase {
  wahlkreis: string
  website?: string
}

export interface PartyData {
  beschreibung: string
  schwerpunkte: Schwerpunkt[]
  vorstand: Mitglied[]
  abgeordnete: Abgeordneter[]
}
