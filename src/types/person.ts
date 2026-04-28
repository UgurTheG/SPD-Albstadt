/**
 * Canonical display type accepted by PersonSheet.
 *
 * Every person-related section (Partei, Fraktion, Historie, Kommunalpolitik)
 * passes its section-specific data object directly — TypeScript's structural
 * typing keeps them compatible as long as any field they provide exists here.
 *
 * Adding a new displayable field? Add it here first; the compile error in
 * PersonSheet will guide the remaining changes.
 *
 * Section field mapping:
 *   Partei  (Mitglied)       → rolle, email, phone, address, place, bildUrl, bio
 *   Partei  (Abgeordneter)   → rolle, wahlkreis, email, website, bildUrl, bio
 *   Fraktion(Gemeinderat)    → beruf, seit, address, zipCode, email, ausschuesse, bildUrl, bio
 *   Historie(Persoenlichkeit)→ rolle, jahre, beschreibung, bildUrl, bildUrls
 *   Kommunalpolitik          → rolle, listenplatz, stadt, bildUrl, bio
 */
export interface PersonSheetData {
  name: string
  bildUrl?: string
  bildUrls?: string[]

  /** Role / title label (Partei, Historie, Kommunalpolitik) */
  rolle?: string
  /** Occupation label when rolle is absent (Fraktion – Gemeinderat) */
  beruf?: string
  /** Electoral district (Partei – Abgeordneter) */
  wahlkreis?: string
  /** Years in office e.g. "1972–1984" (Historie – Persoenlichkeit) */
  jahre?: string
  /** Member-since year (Fraktion – Gemeinderat) */
  seit?: string

  /** Biographical text (Partei, Fraktion) */
  bio?: string
  /** Description text (Historie) */
  beschreibung?: string

  // contact rows
  email?: string
  phone?: string
  address?: string
  /** City / place name (Partei – Mitglied) */
  place?: string
  /** Postal / zip code (Fraktion – Gemeinderat) */
  zipCode?: string
  website?: string

  /** Committee memberships (Fraktion – Gemeinderat) */
  ausschuesse?: string[]

  /** List position on ballot (Kommunalpolitik) */
  listenplatz?: string | number
  /** City / district (Kommunalpolitik) */
  stadt?: string
}
