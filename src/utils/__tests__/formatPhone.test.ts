import { describe, it, expect } from 'vitest'
import { toTelLink } from '../formatPhone'

describe('toTelLink', () => {
  it('converts a display phone number to a tel link', () => {
    // 07431 / 123 456 → strip non-numeric → 07431123456 → drop leading 0 → 7431123456 → prefix +49
    expect(toTelLink('07431 / 123 456')).toBe('+497431123456')
  })

  it('removes hyphens and spaces', () => {
    expect(toTelLink('0731 123-456')).toBe('+49731123456')
  })

  it('replaces the leading 0 with the +49 prefix', () => {
    expect(toTelLink('0800 000 0000')).toBe('+498000000000')
  })

  it('strips all non-numeric characters', () => {
    // (0)7123 / 45.67 → digits: 071234567 → drop leading 0 → 71234567 → +4971234567
    expect(toTelLink('(0)7123 / 45.67')).toBe('+4971234567')
  })

  it('handles a number already without separators', () => {
    expect(toTelLink('07001234567')).toBe('+497001234567')
  })
})
