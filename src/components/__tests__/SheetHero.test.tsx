import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SheetHero from '../SheetHero'

describe('SheetHero', () => {
  it('renders content above the gradient and merges padding overrides', () => {
    const { container } = render(
      <SheetHero className="pt-6 pb-8" decoration={<span data-testid="deco">12</span>}>
        <h3>Titel</h3>
      </SheetHero>,
    )

    const root = container.firstElementChild
    expect(root).toHaveClass('bg-linear-to-br', 'from-spd-red', 'pt-6', 'pb-8')
    expect(screen.getByTestId('deco')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Titel' }).parentElement).toHaveClass('relative')
  })
})
