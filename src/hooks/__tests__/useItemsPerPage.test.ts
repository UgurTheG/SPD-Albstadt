import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useItemsPerPage, useItemsPerPageMulti } from '../useItemsPerPage'

// happy-dom sets window.innerWidth to 1024 by default.

describe('useItemsPerPage', () => {
  it('returns the "above" value when window.innerWidth >= breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
    const { result } = renderHook(() => useItemsPerPage(768, 9, 4))
    expect(result.current).toBe(9)
  })

  it('returns the "below" value when window.innerWidth < breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 600 })
    const { result } = renderHook(() => useItemsPerPage(768, 9, 4))
    expect(result.current).toBe(4)
  })

  it('updates when a resize event fires', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
    const { result } = renderHook(() => useItemsPerPage(768, 9, 4))
    expect(result.current).toBe(9)

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      })
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current).toBe(4)
  })
})

describe('useItemsPerPageMulti', () => {
  it('returns the value for the first matching breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 })
    const { result } = renderHook(() =>
      useItemsPerPageMulti(
        [
          [1024, 10],
          [768, 8],
          [640, 6],
        ],
        4,
      ),
    )
    expect(result.current).toBe(10)
  })

  it('returns the second breakpoint value when width is between them', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 900 })
    const { result } = renderHook(() =>
      useItemsPerPageMulti(
        [
          [1024, 10],
          [768, 8],
          [640, 6],
        ],
        4,
      ),
    )
    expect(result.current).toBe(8)
  })

  it('returns the fallback when no breakpoint matches', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 320 })
    const { result } = renderHook(() =>
      useItemsPerPageMulti(
        [
          [1024, 10],
          [768, 8],
          [640, 6],
        ],
        4,
      ),
    )
    expect(result.current).toBe(4)
  })

  it('updates on resize', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 })
    const { result } = renderHook(() =>
      useItemsPerPageMulti(
        [
          [1024, 10],
          [768, 8],
          [640, 6],
        ],
        4,
      ),
    )
    expect(result.current).toBe(10)

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 300,
      })
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current).toBe(4)
  })

  it('updates to a matching breakpoint value on resize (covers setCount(val)+return branch)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 })
    const { result } = renderHook(() =>
      useItemsPerPageMulti(
        [
          [1024, 10],
          [768, 8],
          [640, 6],
        ],
        4,
      ),
    )
    expect(result.current).toBe(4) // initial: below all breakpoints

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900,
      })
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current).toBe(8) // hits [768, 8] branch inside resize handler
  })
})
