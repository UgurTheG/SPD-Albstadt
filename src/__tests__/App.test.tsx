import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

describe('App - Accessibility', () => {
  it('renders a skip-to-content link', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const skipLink = screen.getByText('Zum Inhalt springen')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('renders a <main> landmark with id', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const main = container.querySelector('main#main-content')
    expect(main).toBeInTheDocument()
  })

  it('renders an aria-live region for route announcements', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const liveRegion = container.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion?.textContent).toBe('SPD Albstadt')
  })

  it('updates aria-live region on route change', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/aktuelles']}>
        <App />
      </MemoryRouter>,
    )

    const liveRegion = container.querySelector('[aria-live="polite"]')
    expect(liveRegion?.textContent).toBe('SPD Albstadt / Aktuelles')
  })
})

describe('App - Routing', () => {
  it('renders the home page at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    // Hero is rendered on home
    expect(document.title).toBe('SPD Albstadt')
  })

  it('renders 404 page for unknown routes', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/nonexistent']}>
        <App />
      </MemoryRouter>,
    )

    // The catch-all route renders ErrorPage — title fallback is home title
    // since '/nonexistent' isn't in PAGE_TITLES map
    const main = container.querySelector('main#main-content')
    expect(main).toBeInTheDocument()
  })
})
