import { describe, it, expect } from 'vitest'
import { parseInline, parseRichText } from '../richText'

describe('parseRichText', () => {
  it('splits plain text into paragraphs at blank lines', () => {
    expect(parseRichText('Erster Absatz.\n\nZweiter Absatz.')).toEqual([
      { type: 'paragraph', lines: ['Erster Absatz.'] },
      { type: 'paragraph', lines: ['Zweiter Absatz.'] },
    ])
  })

  it('keeps single line breaks inside a paragraph', () => {
    expect(parseRichText('Zeile eins\nZeile zwei')).toEqual([
      { type: 'paragraph', lines: ['Zeile eins', 'Zeile zwei'] },
    ])
  })

  it('normalises Windows line endings and surrounding whitespace', () => {
    expect(parseRichText('  Absatz  \r\n\r\n\r\nNoch einer')).toEqual([
      { type: 'paragraph', lines: ['Absatz'] },
      { type: 'paragraph', lines: ['Noch einer'] },
    ])
  })

  it('returns no blocks for empty text', () => {
    expect(parseRichText('')).toEqual([])
    expect(parseRichText('\n \n')).toEqual([])
  })

  it('turns "#" lines into headings regardless of level', () => {
    expect(parseRichText('## Talgangbahn\nText dazu\n### Ausblick')).toEqual([
      { type: 'heading', text: 'Talgangbahn' },
      { type: 'paragraph', lines: ['Text dazu'] },
      { type: 'heading', text: 'Ausblick' },
    ])
  })

  it('leaves hashtags without a space as text', () => {
    expect(parseRichText('#SPD #Albstadt')).toEqual([
      { type: 'paragraph', lines: ['#SPD #Albstadt'] },
    ])
  })

  it('groups bullet lines into one list, even directly after a paragraph', () => {
    expect(parseRichText('Unsere Forderungen:\n- Wohnraum\n* ÖPNV\n• Klimaschutz')).toEqual([
      { type: 'paragraph', lines: ['Unsere Forderungen:'] },
      { type: 'list', ordered: false, start: 1, items: ['Wohnraum', 'ÖPNV', 'Klimaschutz'] },
    ])
  })

  it('builds ordered lists and keeps the starting number', () => {
    expect(parseRichText('3. Drittens\n4. Viertens')).toEqual([
      { type: 'list', ordered: true, start: 3, items: ['Drittens', 'Viertens'] },
    ])
  })

  it('does not turn a single numbered line such as a date into a list', () => {
    expect(parseRichText('1. Mai: Kundgebung auf dem Marktplatz.')).toEqual([
      { type: 'paragraph', lines: ['1. Mai: Kundgebung auf dem Marktplatz.'] },
    ])
  })

  it('starts a new list when switching between bullets and numbers', () => {
    expect(parseRichText('- a\n1. b\n2. c')).toEqual([
      { type: 'list', ordered: false, start: 1, items: ['a'] },
      { type: 'list', ordered: true, start: 1, items: ['b', 'c'] },
    ])
  })

  it('ends a list at the next plain line', () => {
    expect(parseRichText('- a\nDanach Text')).toEqual([
      { type: 'list', ordered: false, start: 1, items: ['a'] },
      { type: 'paragraph', lines: ['Danach Text'] },
    ])
  })

  it('joins consecutive quote lines and drops empty quotes', () => {
    expect(parseRichText('> Erste Zeile\n>\n> Zweite Zeile\n\n>')).toEqual([
      { type: 'quote', lines: ['Erste Zeile', 'Zweite Zeile'] },
    ])
  })
})

describe('parseInline', () => {
  it('returns plain text unchanged', () => {
    expect(parseInline('Nur Text')).toEqual([{ type: 'text', text: 'Nur Text' }])
  })

  it('parses **bold** text', () => {
    expect(parseInline('Über **90 %** Förderung')).toEqual([
      { type: 'text', text: 'Über ' },
      { type: 'bold', children: [{ type: 'text', text: '90 %' }] },
      { type: 'text', text: ' Förderung' },
    ])
  })

  it('leaves gender-star spellings untouched', () => {
    expect(parseInline('Bürger*innen und Kandidat*innen')).toEqual([
      { type: 'text', text: 'Bürger*innen und Kandidat*innen' },
    ])
  })

  it('parses Markdown links and marks http links as external', () => {
    expect(parseInline('[Programm](https://spd.de/programm) und [Partei](/partei)')).toEqual([
      { type: 'link', href: 'https://spd.de/programm', text: 'Programm', external: true },
      { type: 'text', text: ' und ' },
      { type: 'link', href: '/partei', text: 'Partei', external: false },
    ])
  })

  it('accepts mailto and tel link targets', () => {
    expect(parseInline('[Mail](mailto:info@spd-albstadt.de) [Anruf](tel:+497431123)')).toEqual([
      { type: 'link', href: 'mailto:info@spd-albstadt.de', text: 'Mail', external: false },
      { type: 'text', text: ' ' },
      { type: 'link', href: 'tel:+497431123', text: 'Anruf', external: false },
    ])
  })

  it('renders unsafe link targets as plain text', () => {
    expect(parseInline('[Klick](javascript:alert(1))')).toEqual([
      { type: 'text', text: 'Klick' },
      { type: 'text', text: ')' },
    ])
    expect(parseInline('[Klick](//evil.example)')).toEqual([{ type: 'text', text: 'Klick' }])
  })

  it('auto-links bare URLs without trailing punctuation', () => {
    expect(parseInline('Mehr unter https://spd-albstadt.de/partei.')).toEqual([
      { type: 'text', text: 'Mehr unter ' },
      {
        type: 'link',
        href: 'https://spd-albstadt.de/partei',
        text: 'https://spd-albstadt.de/partei',
        external: true,
      },
      { type: 'text', text: '.' },
    ])
  })

  it('strips an unbalanced closing parenthesis from bare URLs', () => {
    expect(parseInline('(siehe https://spd.de)')).toEqual([
      { type: 'text', text: '(siehe ' },
      { type: 'link', href: 'https://spd.de', text: 'https://spd.de', external: true },
      { type: 'text', text: ')' },
    ])
  })

  it('auto-links email addresses', () => {
    expect(parseInline('Schreiben Sie an info@spd-albstadt.de.')).toEqual([
      { type: 'text', text: 'Schreiben Sie an ' },
      {
        type: 'link',
        href: 'mailto:info@spd-albstadt.de',
        text: 'info@spd-albstadt.de',
        external: false,
      },
      { type: 'text', text: '.' },
    ])
  })

  it('parses links inside bold text', () => {
    expect(parseInline('**Jetzt [mitmachen](/kontakt)**')).toEqual([
      {
        type: 'bold',
        children: [
          { type: 'text', text: 'Jetzt ' },
          { type: 'link', href: '/kontakt', text: 'mitmachen', external: false },
        ],
      },
    ])
  })
})
