import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HttpError } from './useData'

/** HTTP status codes that should redirect to their error page */
const REDIRECT_CODES = new Set([401, 403, 408, 429, 500, 502, 503, 504])

/**
 * Redirects to the corresponding error page when a critical HTTP error occurs.
 * Pass one or more HttpError values (from useData). Ignores null/undefined.
 */
export function useHttpErrorRedirect(...errors: (HttpError | null | undefined)[]) {
  const navigate = useNavigate()

  useEffect(() => {
    for (const err of errors) {
      if (err && REDIRECT_CODES.has(err.status)) {
        navigate(`/${err.status}`, { replace: true })
        return
      }
    }
  }, [errors, navigate])
}
