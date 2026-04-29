import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useNavigateTo } from '../useNavigateTo'

const wrapper = ({ children }: { children: ReactNode }) => <BrowserRouter>{children}</BrowserRouter>

describe('useNavigateTo', () => {
  it('navigates to / for "home"', () => {
    const { result } = renderHook(() => useNavigateTo(), { wrapper })
    const navigateTo = result.current

    // Should not throw
    expect(() => navigateTo('home')).not.toThrow()
    expect(window.location.pathname).toBe('/')
  })

  it('navigates to /aktuelles for "aktuelles"', () => {
    const { result } = renderHook(() => useNavigateTo(), { wrapper })
    const navigateTo = result.current

    navigateTo('aktuelles')
    expect(window.location.pathname).toBe('/aktuelles')
  })

  it('navigates to /partei for "partei"', () => {
    const { result } = renderHook(() => useNavigateTo(), { wrapper })
    const navigateTo = result.current

    navigateTo('partei')
    expect(window.location.pathname).toBe('/partei')
  })
})
