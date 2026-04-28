import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Thin wrapper around react-router's `useNavigate` that maps section IDs
 * (e.g. `'aktuelles'`, `'home'`) to route paths (`'/aktuelles'`, `'/'`).
 *
 * Eliminates the need to prop-drill a `navigateTo` callback through the tree.
 */
export function useNavigateTo() {
  const navigate = useNavigate()
  return useCallback((id: string) => navigate(id === 'home' ? '/' : `/${id}`), [navigate])
}
