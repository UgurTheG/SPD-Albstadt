/** Shared fields between Mitglied and Abgeordneter. */
export interface PersonBase {
  name: string
  rolle: string
  email: string
  bildUrl: string
  bio: string
}

export interface Schwerpunkt {
  titel: string
  beschreibung: string
  icon: string
  inhalt?: string
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
