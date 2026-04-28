import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SubsectionHeading from '../SubsectionHeading'

describe('SubsectionHeading', () => {
  const defaultProps = {
    icon: <span data-testid="icon">★</span>,
    title: 'Nachrichten',
    subtitle: '3 Beiträge',
  }

  it('renders the title', () => {
    render(<SubsectionHeading {...defaultProps} />)
    expect(screen.getByText('Nachrichten')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    render(<SubsectionHeading {...defaultProps} />)
    expect(screen.getByText('3 Beiträge')).toBeInTheDocument()
  })

  it('renders the icon', () => {
    render(<SubsectionHeading {...defaultProps} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders an optional action element when provided', () => {
    render(
      <SubsectionHeading
        {...defaultProps}
        action={<button data-testid="action-btn">Subscribe</button>}
      />,
    )
    expect(screen.getByTestId('action-btn')).toBeInTheDocument()
  })

  it('does not render an action element when not provided', () => {
    const { queryByTestId } = render(<SubsectionHeading {...defaultProps} />)
    expect(queryByTestId('action-btn')).toBeNull()
  })

  it('applies a custom mb class to the wrapper', () => {
    const { container } = render(<SubsectionHeading {...defaultProps} mb="mb-10" />)
    expect(container.firstChild).toHaveClass('mb-10')
  })
})
