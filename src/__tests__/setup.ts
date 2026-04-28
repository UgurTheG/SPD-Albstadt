import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Fetch interceptor
// ---------------------------------------------------------------------------
// Components using useData('/data/something.json') cause real HTTP requests in
// tests because happy-dom resolves relative paths to http://localhost:3000/…
// and no dev server is running. Intercept those requests here so they return
// empty data silently instead of flooding the console with ECONNREFUSED errors.
// Tests that need specific fetch behaviour can still use vi.spyOn(globalThis, 'fetch')
// as usual — the regular function below is spyable and fully restorable.
const _realFetch = globalThis.fetch
globalThis.fetch = async function fetchInterceptor(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input)
  // Relative paths and localhost requests are data-file fetches that resolve to
  // http://localhost:3000/… in happy-dom. Return empty JSON instead of hitting
  // the network (which would ECONNREFUSED since no dev server is running).
  if (/^(\/|https?:\/\/localhost[:/])/.test(url)) {
    return new Response(JSON.stringify(null), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return _realFetch(input, init)
} as typeof fetch

// happy-dom doesn't implement window.matchMedia — provide a minimal stub so
// any module that reads it during import (e.g. uiSlice dark-mode detection) doesn't throw.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
