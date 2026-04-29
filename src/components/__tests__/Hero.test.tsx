import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Hero from '../../components/Hero'

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  )
}

describe('Hero - Accessibility', () => {
  it('has aria-hidden on decorative SVG pattern', () => {
    const { container } = renderHero()
    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })

  it('navigation pill buttons have minimum 44px touch target', () => {
    const { container } = renderHero()
    // Check that nav buttons have min-h-[44px] class
    const navButtons = container.querySelectorAll('button.bg-white\\/12')
    navButtons.forEach(btn => {
      expect(btn.className).toContain('min-h-[44px]')
    })
  })

  it('scroll indicator has adequate touch target', () => {
    renderHero()
    const scrollBtn = screen.getByLabelText('Zu Aktuelles')
    expect(scrollBtn.className).toContain('min-h-[44px]')
    expect(scrollBtn.className).toContain('min-w-[44px]')
  })

  it('renders the SPD heading', () => {
    renderHero()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
