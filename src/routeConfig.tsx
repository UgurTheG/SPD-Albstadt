/* eslint-disable react-refresh/only-export-components */
import { lazy, type ReactNode } from 'react'

const Aktuelles = lazy(() => import('./components/sections/Aktuelles'))
const Partei = lazy(() => import('./components/sections/Partei'))
const Fraktion = lazy(() => import('./components/sections/Fraktion'))
const Historie = lazy(() => import('./components/sections/Historie'))
const Kommunalpolitik = lazy(() => import('./components/sections/Kommunalpolitik'))
const Kontakt = lazy(() => import('./components/sections/Kontakt'))
const Datenschutz = lazy(() => import('./components/sections/Datenschutz'))
const Impressum = lazy(() => import('./components/sections/Impressum'))
const ErrorPage = lazy(() => import('./components/sections/ErrorPage'))

// ── Route configuration ────────────────────────────────────────────────────────
// Single source of truth for paths, page titles, animation depth, and elements.
// Adding a new page = adding one entry here.

export interface RouteEntry {
  path: string
  title: string
  /** 0 = home, 1 = section pages. Used for slide-direction animation. */
  depth: number
  element: ReactNode
}

const ERROR_CODES = [400, 401, 403, 405, 408, 429, 500, 502, 503, 504] as const

export const ROUTES: RouteEntry[] = [
  { path: '/aktuelles', title: 'SPD Albstadt / Aktuelles', depth: 1, element: <Aktuelles /> },
  { path: '/partei', title: 'SPD Albstadt / Partei', depth: 1, element: <Partei /> },
  { path: '/fraktion', title: 'SPD Albstadt / Fraktion', depth: 1, element: <Fraktion /> },
  {
    path: '/kommunalpolitik',
    title: 'SPD Albstadt / Kommunalpolitik',
    depth: 1,
    element: <Kommunalpolitik />,
  },
  { path: '/historie', title: 'SPD Albstadt / Historie', depth: 1, element: <Historie /> },
  { path: '/kontakt', title: 'SPD Albstadt / Kontakt', depth: 1, element: <Kontakt /> },
  {
    path: '/datenschutz',
    title: 'SPD Albstadt / Datenschutz',
    depth: 1,
    element: <Datenschutz />,
  },
  { path: '/impressum', title: 'SPD Albstadt / Impressum', depth: 1, element: <Impressum /> },
  // Error pages
  ...ERROR_CODES.map(
    (code): RouteEntry => ({
      path: `/${code}`,
      title: `SPD Albstadt / ${code}`,
      depth: 1,
      element: <ErrorPage code={code} />,
    }),
  ),
]

/** Catch-all 404 route — rendered outside the config loop. */
export const CATCH_ALL_ROUTE: RouteEntry = {
  path: '*',
  title: 'SPD Albstadt / 404',
  depth: 1,
  element: <ErrorPage code={404} />,
}

// ── Derived lookup maps ─────────────────────────────────────────────────────

export const PAGE_TITLES: Record<string, string> = { '/': 'SPD Albstadt' }
export const DEPTH: Record<string, number> = { '/': 0 }

for (const r of ROUTES) {
  PAGE_TITLES[r.path] = r.title
  DEPTH[r.path] = r.depth
}
