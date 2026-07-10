/**
 * Tests for useOrphanGate — the orphan-image confirmation flow shared by the
 * per-tab publish (useTabPublisher) and publish-all (AdminApp) paths.
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOrphanGate } from '../../admin/hooks/useOrphanGate'

describe('useOrphanGate', () => {
  it('publishes immediately when no orphans are found', () => {
    const publish = vi.fn()
    const { result } = renderHook(() => useOrphanGate(() => [], publish))
    act(() => result.current.start())
    expect(publish).toHaveBeenCalledWith()
    expect(result.current.orphans).toBeNull()
  })

  it('exposes orphans instead of publishing when the scan finds some', () => {
    const publish = vi.fn()
    const { result } = renderHook(() => useOrphanGate(() => ['/images/alt.webp'], publish))
    act(() => result.current.start())
    expect(publish).not.toHaveBeenCalled()
    expect(result.current.orphans).toEqual(['/images/alt.webp'])
  })

  it('confirm publishes with the selected deletions and clears the list', () => {
    const publish = vi.fn()
    const { result } = renderHook(() => useOrphanGate(() => ['/images/alt.webp'], publish))
    act(() => result.current.start())
    act(() => result.current.confirm(['/images/alt.webp']))
    expect(publish).toHaveBeenCalledWith(['/images/alt.webp'])
    expect(result.current.orphans).toBeNull()
  })

  it('confirm with an empty selection publishes without deletions', () => {
    const publish = vi.fn()
    const { result } = renderHook(() => useOrphanGate(() => ['/images/alt.webp'], publish))
    act(() => result.current.start())
    act(() => result.current.confirm([]))
    expect(publish).toHaveBeenCalledWith(undefined)
  })

  it('keep publishes without deletions; cancel publishes nothing', () => {
    const publish = vi.fn()
    const { result } = renderHook(() => useOrphanGate(() => ['/images/alt.webp'], publish))
    act(() => result.current.start())
    act(() => result.current.keep())
    expect(publish).toHaveBeenCalledWith()
    expect(result.current.orphans).toBeNull()

    publish.mockClear()
    act(() => result.current.start())
    act(() => result.current.cancel())
    expect(publish).not.toHaveBeenCalled()
    expect(result.current.orphans).toBeNull()
  })
})
