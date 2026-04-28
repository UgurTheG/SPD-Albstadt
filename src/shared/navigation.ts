/** Navigation items shown in Hero pills and Navbar links. */
export const NAV_ITEMS = [
  { id: 'aktuelles', label: 'Aktuelles' },
  { id: 'partei', label: 'Partei' },
  { id: 'fraktion', label: 'Fraktion' },
  { id: 'kommunalpolitik', label: 'Kommunalpolitik' },
  { id: 'historie', label: 'Historie' },
  { id: 'kontakt', label: 'Kontakt' },
] as const

/**
 * Breadcrumb labels for all pages (including pages that don't appear
 * in the main nav like Datenschutz / Impressum).
 */
export const SECTION_LABELS: Record<string, string> = {
  ...Object.fromEntries(NAV_ITEMS.map(i => [i.id, i.label])),
  datenschutz: 'Datenschutz',
  impressum: 'Impressum',
}
