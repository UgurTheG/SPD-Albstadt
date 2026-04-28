export interface Gemeinderat {
  name: string
  beruf?: string
  bildUrl: string
  seit: string
  address?: string
  zipCode?: string
  email?: string
  ausschuesse: string[]
  bio?: string
}

export interface FraktionData {
  beschreibung: string
  gemeinderaete: Gemeinderat[]
  kreisraete: Gemeinderat[]
}
