/**
 * Tests for React-based lib files: socialIcons.tsx and tabIcons.tsx
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

// ─── socialIcons.tsx ──────────────────────────────────────────────────────────

import { FieldIcon } from '../../admin/lib/socialIcons'

describe('FieldIcon', () => {
  it('renders facebook icon', () => {
    const { container } = render(<FieldIcon iconKey="facebook" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders instagram icon', () => {
    const { container } = render(<FieldIcon iconKey="instagram" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders calendar icon', () => {
    const { container } = render(<FieldIcon iconKey="calendar" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders link icon', () => {
    const { container } = render(<FieldIcon iconKey="link" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders mail icon', () => {
    const { container } = render(<FieldIcon iconKey="mail" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders phone icon', () => {
    const { container } = render(<FieldIcon iconKey="phone" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

// ─── tabIcons.tsx ─────────────────────────────────────────────────────────────

import { getTabIcon } from '../../admin/lib/tabIcons'

const keys = [
  'startseite',
  'news',
  'party',
  'fraktion',
  'kommunalpolitik',
  'haushaltsreden',
  'history',
  'kontakt',
  'impressum',
  'datenschutz',
  'config',
]

describe('getTabIcon', () => {
  for (const key of keys) {
    it(`renders icon for "${key}"`, () => {
      const icon = getTabIcon(key)
      expect(icon).not.toBeNull()
      const { container } = render(<>{icon}</>)
      expect(container.querySelector('svg')).not.toBeNull()
    })
  }

  it('returns null for unknown key', () => {
    expect(getTabIcon('unknown')).toBeNull()
  })

  it('applies custom size', () => {
    // Just ensure it doesn't throw
    expect(() => getTabIcon('news', 24)).not.toThrow()
  })
})
