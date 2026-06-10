import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import ImageField from '../fields/ImageField'

const field = { key: 'bild', label: 'Bild', type: 'image' as const, imageDir: 'news' }

// Controlled harness — mirrors how FieldRenderer feeds the store value back as a prop.
// A plain mocked onChange would never update `value` and miss sync-block regressions.
function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <ImageField field={field} value={value} onChange={setValue} />
}

const urlInput = () => screen.queryByPlaceholderText('/images/... oder https://...')

describe('ImageField — manual URL entry (controlled)', () => {
  it('keeps the URL input open while the user types', () => {
    render(<Harness />)
    const input = urlInput()
    expect(input).not.toBeNull()
    fireEvent.change(input!, { target: { value: '/i' } })
    expect(urlInput()).not.toBeNull()
    fireEvent.change(urlInput()!, { target: { value: '/images/news/foto.webp' } })
    expect(urlInput()).not.toBeNull()
    expect((urlInput() as HTMLInputElement).value).toBe('/images/news/foto.webp')
  })

  it('still resets the URL input on external value changes (item switch)', () => {
    const { rerender } = render(
      <ImageField field={field} value="/images/news/a.webp" onChange={() => {}} />,
    )
    expect(urlInput()).toBeNull()
    rerender(<ImageField field={field} value="" onChange={() => {}} />)
    expect(urlInput()).not.toBeNull()
  })
})
