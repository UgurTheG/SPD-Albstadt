import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderTextContent } from '../renderTextContent'

// Helper – render the ReactNode returned by renderTextContent inside a <div>
function renderContent(text: string) {
  const Wrapper = () => <div>{renderTextContent(text)}</div>
  return render(<Wrapper />)
}

describe('renderTextContent', () => {
  it('renders plain text with no links', () => {
    renderContent('Hello World')
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('auto-links http URLs', () => {
    renderContent('Visit https://spd-albstadt.de for more.')
    const link = screen.getByRole('link', { name: 'https://spd-albstadt.de' })
    expect(link).toHaveAttribute('href', 'https://spd-albstadt.de')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('auto-links email addresses with a mailto: href', () => {
    renderContent('Write to info@spd-albstadt.de please.')
    const link = screen.getByRole('link', { name: 'info@spd-albstadt.de' })
    expect(link).toHaveAttribute('href', 'mailto:info@spd-albstadt.de')
    expect(link).not.toHaveAttribute('target')
  })

  it('inserts a <br> between lines', () => {
    const { container } = renderContent('Line 1\nLine 2')
    expect(container.querySelector('br')).not.toBeNull()
  })

  it('renders multiple lines correctly', () => {
    const { container } = renderContent('Foo\nBar\nBaz')
    // The text nodes are split by <br> elements — check textContent of the wrapper
    expect(container.textContent).toContain('Foo')
    expect(container.textContent).toContain('Bar')
    expect(container.textContent).toContain('Baz')
  })

  it('renders multiple links on the same line', () => {
    renderContent('https://a.de and https://b.de')
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
  })

  it('renders surrounding text around a link', () => {
    const { container } = renderContent('See https://example.com for info.')
    expect(container.textContent).toContain('See ')
    expect(container.textContent).toContain(' for info.')
  })
})
