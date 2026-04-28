import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SectionIconBadge from '../SectionIconBadge'

describe('SectionIconBadge', () => {
  it('renders its children', () => {
    render(
      <SectionIconBadge>
        <span data-testid="icon">★</span>
      </SectionIconBadge>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders a wrapping div', () => {
    const { container } = render(
      <SectionIconBadge>
        <span>x</span>
      </SectionIconBadge>,
    )
    expect(container.firstChild?.nodeName).toBe('DIV')
  })
})
