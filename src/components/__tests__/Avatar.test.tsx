import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Avatar from '../Avatar'

describe('Avatar', () => {
  describe('with imageUrl', () => {
    it('renders an img element', () => {
      render(<Avatar name="Alice Müller" imageUrl="/images/alice.webp" />)
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    it('uses the name as alt text', () => {
      render(<Avatar name="Alice Müller" imageUrl="/images/alice.webp" />)
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Alice Müller')
    })

    it('sets src to the provided imageUrl', () => {
      render(<Avatar name="Alice Müller" imageUrl="/images/alice.webp" />)
      expect(screen.getByRole('img')).toHaveAttribute('src', '/images/alice.webp')
    })
  })

  describe('without imageUrl — initials fallback', () => {
    it('does not render an img element', () => {
      render(<Avatar name="Alice Müller" />)
      expect(screen.queryByRole('img')).toBeNull()
    })

    it('shows the first two initials in uppercase', () => {
      render(<Avatar name="Alice Müller" />)
      expect(screen.getByText('AM')).toBeInTheDocument()
    })

    it('handles single-word name (one initial)', () => {
      render(<Avatar name="Alice" />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('handles three-word name (uses only first two)', () => {
      render(<Avatar name="Alice B Müller" />)
      expect(screen.getByText('AB')).toBeInTheDocument()
    })
  })

  describe('size classes', () => {
    it('applies xs size class', () => {
      const { container } = render(<Avatar name="A B" size="xs" />)
      expect(container.firstChild).toHaveClass('w-7', 'h-7')
    })

    it('applies sm size class', () => {
      const { container } = render(<Avatar name="A B" size="sm" />)
      expect(container.firstChild).toHaveClass('w-10', 'h-10')
    })

    it('applies md size class (default)', () => {
      const { container } = render(<Avatar name="A B" />)
      expect(container.firstChild).toHaveClass('w-14', 'h-14')
    })

    it('applies lg size class', () => {
      const { container } = render(<Avatar name="A B" size="lg" />)
      expect(container.firstChild).toHaveClass('w-20', 'h-20')
    })
  })

  describe('className prop', () => {
    it('forwards className to the root element (initials variant)', () => {
      const { container } = render(<Avatar name="A B" className="ring-2 ring-gray-200" />)
      expect(container.firstChild).toHaveClass('ring-2', 'ring-gray-200')
    })

    it('forwards className to the img element (image variant)', () => {
      render(<Avatar name="A B" imageUrl="/img.webp" className="ring-2" />)
      expect(screen.getByRole('img')).toHaveClass('ring-2')
    })
  })
})
