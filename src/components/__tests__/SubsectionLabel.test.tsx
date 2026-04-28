import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SubsectionLabel from '../SubsectionLabel'

describe('SubsectionLabel', () => {
  it('renders the label text', () => {
    render(<SubsectionLabel label="Dokumente" isInView={true} />)
    expect(screen.getByText('Dokumente')).toBeInTheDocument()
  })

  it('renders the optional title when provided', () => {
    render(<SubsectionLabel label="Fraktion" title="Haushaltsreden" isInView={true} />)
    expect(screen.getByText('Haushaltsreden')).toBeInTheDocument()
  })

  it('does not render a title element when title is omitted', () => {
    const { queryByText } = render(<SubsectionLabel label="Fraktion" isInView={true} />)
    // No second text node other than the label itself
    expect(queryByText('Haushaltsreden')).toBeNull()
  })

  it('applies the default mb class (mb-8)', () => {
    const { container } = render(<SubsectionLabel label="Label" isInView={true} />)
    expect(container.firstChild).toHaveClass('mb-8')
  })

  it('applies a custom mb class', () => {
    const { container } = render(<SubsectionLabel label="Label" isInView={true} mb="mb-4" />)
    expect(container.firstChild).toHaveClass('mb-4')
  })
})
