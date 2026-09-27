import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { loadContentRoutes } from '../contentRoutes'

let root: string

function writeData(file: string, data: unknown) {
  writeFileSync(join(root, 'public/data', file), JSON.stringify(data))
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'content-routes-'))
  mkdirSync(join(root, 'public/data'), { recursive: true })
  writeData('news.json', [
    {
      id: '1',
      uuid: 'a1',
      datum: '2026-01-01',
      titel: 'Neujahrsempfang',
      zusammenfassung: 'Rückblick',
      inhalt: '',
      kategorie: 'Veranstaltung',
    },
  ])
  writeData('party.json', {
    beschreibung: '',
    schwerpunkte: [{ titel: 'Bildung und Jugend', beschreibung: 'Kitas', icon: 'GraduationCap' }],
    vorstand: [],
    abgeordnete: [],
  })
  writeData('history.json', {
    einleitung: '',
    timeline: [{ jahr: '2021–heute', titel: 'Stadtverband', beschreibung: 'Fusion' }],
    persoenlichkeiten: [],
  })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('loadContentRoutes', () => {
  it('returns a deep link for every news item, Schwerpunkt and Historie epoch', () => {
    const routes = loadContentRoutes(root)
    expect(routes.map(r => [r.seo.path, r.chunkName])).toEqual([
      ['/aktuelles/a1', 'Aktuelles'],
      ['/partei/bildung-und-jugend', 'Partei'],
      ['/historie/2021-heute', 'Historie'],
    ])
  })

  it('reads the committed content files', () => {
    const routes = loadContentRoutes()
    expect(routes.length).toBeGreaterThan(0)
    expect(new Set(routes.map(r => r.seo.path)).size).toBe(routes.length)
  })
})
