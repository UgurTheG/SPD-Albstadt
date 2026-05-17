export interface KommunalpolitikPerson {
  name: string
  rolle?: string
  bildUrl?: string
  email?: string
  bio?: string
  stadt?: string
}

export interface Dokument {
  id: string
  titel: string
  url: string
}

export interface KommunalpolitikJahr {
  id: string
  jahr: string
  aktiv: boolean
  gemeinderaete: KommunalpolitikPerson[]
  kreisraete: KommunalpolitikPerson[]
  dokumente?: Dokument[]
}

export interface KommunalpolitikData {
  sichtbar: boolean
  beschreibung: string
  jahre: KommunalpolitikJahr[]
}
