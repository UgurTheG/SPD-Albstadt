/**
 * Tests for config/tabs.ts
 */
import { describe, it, expect } from 'vitest'
import { TABS } from '../../admin/config/tabs'

describe('TABS config', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(TABS)).toBe(true)
    expect(TABS.length).toBeGreaterThan(0)
  })

  it('every tab has key, label, type', () => {
    for (const tab of TABS) {
      expect(typeof tab.key).toBe('string')
      expect(typeof tab.label).toBe('string')
      expect(typeof tab.type).toBe('string')
    }
  })

  it('includes kommunalpolitik and haushaltsreden tabs', () => {
    const keys = TABS.map(t => t.key)
    expect(keys).toContain('kommunalpolitik')
    expect(keys).toContain('haushaltsreden')
  })

  it('haushaltsreden has null file and ghPath', () => {
    const h = TABS.find(t => t.key === 'haushaltsreden')
    expect(h?.file).toBeNull()
    expect(h?.ghPath).toBeNull()
  })
})
