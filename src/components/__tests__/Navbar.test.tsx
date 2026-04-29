import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../../components/Navbar'

function renderNavbar(path = '/aktuelles') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  )
}

describe('Navbar - Accessibility', () => {
  it('has aria-label on nav element', () => {
    const { container } = renderNavbar()
    const nav = container.querySelector('nav')
    expect(nav).toHaveAttribute('aria-label', 'Hauptnavigation')
  })

  it('hamburger button has aria-expanded=false initially', () => {
    renderNavbar()
    const hamburger = screen.getByLabelText('Menü öffnen')
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
  })

  it('hamburger button has aria-expanded=true when menu opens', async () => {
    const user = userEvent.setup()
    renderNavbar()
    const hamburger = screen.getByLabelText('Menü öffnen')

    await user.click(hamburger)

    // After click, label changes to "Menü schließen"
    const closeButton = screen.getByLabelText('Menü schließen')
    expect(closeButton).toHaveAttribute('aria-expanded', 'true')
  })

  it('active nav item has aria-current="page"', () => {
    renderNavbar('/aktuelles')
    // Look for any button with aria-current="page"
    const current = screen
      .getAllByRole('button')
      .find(btn => btn.getAttribute('aria-current') === 'page')
    expect(current).toBeDefined()
    expect(current?.textContent).toBe('Aktuelles')
  })
})
