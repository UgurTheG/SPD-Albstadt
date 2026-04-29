import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDarkMode } from '../useDarkMode'

describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('defaults to system preference (light)', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList)

    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(false)
  })

  it('defaults to system preference (dark)', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList)

    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(true)
  })

  it('reads saved preference from localStorage', () => {
    localStorage.setItem('spd-darkmode', 'true')
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList)

    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(true)
  })

  it('toggles dark mode and persists', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList)

    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(false)

    act(() => {
      result.current.toggleDarkMode()
    })

    expect(result.current.darkMode).toBe(true)
    expect(localStorage.getItem('spd-darkmode')).toBe('true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggling back removes dark class', () => {
    localStorage.setItem('spd-darkmode', 'true')
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList)

    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(true)

    act(() => {
      result.current.toggleDarkMode()
    })

    expect(result.current.darkMode).toBe(false)
    expect(localStorage.getItem('spd-darkmode')).toBe('false')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
