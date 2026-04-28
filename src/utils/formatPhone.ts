/**
 * Converts a display phone number like "07431 / 123 456"
 * to a tel: href value like "+49731123456".
 */
export function toTelLink(telefon: string): string {
  return '+49' + telefon.replace(/[^0-9]/g, '').replace(/^0/, '')
}
