import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useShare } from '../useShare'

const target = { title: 'Titel – SPD Albstadt', text: 'Kurzfassung', url: 'https://x.test/a' }

function stubNavigator(overrides: Record<string, unknown>) {
  for (const [key, value] of Object.entries(overrides)) {
    Object.defineProperty(navigator, key, { value, configurable: true })
  }
}

afterEach(() => {
  vi.useRealTimers()
  stubNavigator({ share: undefined, clipboard: undefined })
})

describe('useShare', () => {
  it('uses the Web Share API when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share })
    const { result } = renderHook(() => useShare(target))

    await act(() => result.current.share())

    expect(share).toHaveBeenCalledWith(target)
    expect(result.current.copied).toBe(false)
  })

  it('ignores a cancelled share sheet', async () => {
    stubNavigator({ share: vi.fn().mockRejectedValue(new DOMException('', 'AbortError')) })
    const { result } = renderHook(() => useShare(target))

    await act(() => result.current.share())

    expect(result.current.copied).toBe(false)
  })

  it('copies the URL and resets "copied" after two seconds without Web Share', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share: undefined, clipboard: { writeText } })
    const { result } = renderHook(() => useShare(target))

    await act(() => result.current.share())

    expect(writeText).toHaveBeenCalledWith('https://x.test/a')
    expect(result.current.copied).toBe(true)
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.copied).toBe(false)
  })

  it('stays silent when the clipboard is unavailable', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    stubNavigator({ share: undefined, clipboard: { writeText } })
    const { result } = renderHook(() => useShare(target))

    await act(() => result.current.share())

    expect(result.current.copied).toBe(false)
  })
})
