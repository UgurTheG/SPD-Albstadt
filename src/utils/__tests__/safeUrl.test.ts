import { describe, expect, it } from 'vitest'
import { safeHref } from '../safeUrl'

describe('safeHref', () => {
  it('accepts absolute http and https URLs', () => {
    expect(safeHref('https://www.spd.de')).toBe('https://www.spd.de')
    expect(safeHref('http://example.org/page?x=1')).toBe('http://example.org/page?x=1')
  })

  it('accepts site-relative paths', () => {
    expect(safeHref('/documents/kommunalpolitik/programm.pdf')).toBe(
      '/documents/kommunalpolitik/programm.pdf',
    )
  })

  it('trims surrounding whitespace', () => {
    expect(safeHref('  https://spd-albstadt.de  ')).toBe('https://spd-albstadt.de')
  })

  it('rejects javascript:, data: and vbscript: URLs', () => {
    expect(safeHref('javascript:alert(1)')).toBeUndefined()
    expect(safeHref('JavaScript:alert(1)')).toBeUndefined()
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeUndefined()
    expect(safeHref('vbscript:msgbox')).toBeUndefined()
  })

  it('rejects protocol-relative URLs', () => {
    expect(safeHref('//evil.example/x')).toBeUndefined()
  })

  it('rejects mailto and tel here (they have dedicated render paths)', () => {
    expect(safeHref('mailto:info@spd-albstadt.de')).toBeUndefined()
    expect(safeHref('tel:+49123')).toBeUndefined()
  })

  it('returns undefined for empty, whitespace-only, null and undefined input', () => {
    expect(safeHref('')).toBeUndefined()
    expect(safeHref('   ')).toBeUndefined()
    expect(safeHref(null)).toBeUndefined()
    expect(safeHref(undefined)).toBeUndefined()
  })

  it('returns undefined for unparsable input', () => {
    expect(safeHref('not a url')).toBeUndefined()
    expect(safeHref('www.spd.de')).toBeUndefined()
  })
})
