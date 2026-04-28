import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SkeletonGrid } from '../SkeletonGrid'

describe('SkeletonGrid', () => {
  it('renders the correct number of skeleton items', () => {
    const { container } = render(<SkeletonGrid count={5} />)
    // Each item is a <div> — they are direct children of the Fragment
    expect(container.querySelectorAll('div')).toHaveLength(5)
  })

  it('renders zero items when count is 0', () => {
    const { container } = render(<SkeletonGrid count={0} />)
    expect(container.querySelectorAll('div')).toHaveLength(0)
  })

  it('applies the default itemClassName (h-40)', () => {
    const { container } = render(<SkeletonGrid count={1} />)
    expect(container.querySelector('div')).toHaveClass('h-40')
  })

  it('applies a custom itemClassName', () => {
    const { container } = render(<SkeletonGrid count={1} itemClassName="h-64" />)
    expect(container.querySelector('div')).toHaveClass('h-64')
  })

  it('applies the animate-pulse class to each item', () => {
    const { container } = render(<SkeletonGrid count={3} />)
    container.querySelectorAll('div').forEach(el => {
      expect(el).toHaveClass('animate-pulse')
    })
  })
})
