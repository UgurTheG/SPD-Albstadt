import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RichText from '../RichText'

describe('RichText', () => {
  it('renders each paragraph as its own <p>', () => {
    const { container } = render(<RichText text={'Erster Absatz.\n\nZweiter Absatz.'} />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[1]).toHaveTextContent('Zweiter Absatz.')
  })

  it('keeps single line breaks as <br>', () => {
    const { container } = render(<RichText text={'Zeile eins\nZeile zwei'} />)
    expect(container.querySelectorAll('p br')).toHaveLength(1)
  })

  it('renders subheadings, lists and quotes', () => {
    render(
      <RichText
        text={'## Wohnen\n- Mietspiegel\n- Sozialwohnungen\n\n1. Erstens\n2. Zweitens\n\n> Zitat'}
      />,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Wohnen' })).toBeInTheDocument()
    const [bullets, numbers] = screen.getAllByRole('list')
    expect(bullets.tagName).toBe('UL')
    expect(bullets.children).toHaveLength(2)
    expect(numbers.tagName).toBe('OL')
    expect(numbers).toHaveAttribute('start', '1')
    expect(screen.getByText('Zitat').closest('blockquote')).not.toBeNull()
  })

  it('renders bold text and opens external links in a new tab', () => {
    render(<RichText text={'**Wichtig:** [Programm](https://spd.de) oder [Partei](/partei)'} />)
    expect(screen.getByText('Wichtig:').tagName).toBe('STRONG')
    const external = screen.getByRole('link', { name: 'Programm' })
    expect(external).toHaveAttribute('href', 'https://spd.de')
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noopener noreferrer')
    const internal = screen.getByRole('link', { name: 'Partei' })
    expect(internal).toHaveAttribute('href', '/partei')
    expect(internal).not.toHaveAttribute('target')
  })

  it('never renders an unsafe link target', () => {
    render(<RichText text={'[Klick](javascript:alert(1))'} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/Klick/)).toBeInTheDocument()
  })
})
