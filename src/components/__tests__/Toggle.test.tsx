import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toggle from '../Toggle'

describe('Toggle', () => {
  it('renders with role="switch"', () => {
    render(<Toggle value={false} onChange={() => {}} />)
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('sets aria-checked to false when value is false', () => {
    render(<Toggle value={false} onChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('sets aria-checked to true when value is true', () => {
    render(<Toggle value={true} onChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('shows "Inaktiv" label when value is false (default labels)', () => {
    render(<Toggle value={false} onChange={() => {}} />)
    expect(screen.getByText('Inaktiv')).toBeInTheDocument()
  })

  it('shows "Aktiv" label when value is true (default labels)', () => {
    render(<Toggle value={true} onChange={() => {}} />)
    expect(screen.getByText('Aktiv')).toBeInTheDocument()
  })

  it('calls onChange with the toggled boolean when clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Toggle value={false} onChange={onChange} />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with false when currently true and clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Toggle value={true} onChange={onChange} />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('accepts custom labels', () => {
    render(<Toggle value={true} onChange={() => {}} label={{ on: 'Ja', off: 'Nein' }} />)
    expect(screen.getByText('Ja')).toBeInTheDocument()
  })

  it('uses the custom off-label when value is false', () => {
    render(<Toggle value={false} onChange={() => {}} label={{ on: 'Ja', off: 'Nein' }} />)
    expect(screen.getByText('Nein')).toBeInTheDocument()
  })

  it('associates with an external label via id prop', () => {
    render(
      <>
        <label htmlFor="my-toggle">Toggle me</label>
        <Toggle id="my-toggle" value={false} onChange={() => {}} />
      </>,
    )
    expect(screen.getByRole('switch')).toHaveAttribute('id', 'my-toggle')
  })
})
