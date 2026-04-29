/**
 * All state and async logic for the Haushaltsreden editor, extracted from
 * HaushaltsredenEditor.tsx so the component file is a thin render-only layer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAdminStore } from '../store'
import {
  commitBinaryFile,
  commitFile,
  deleteFile,
  getFileContent,
  listDirectory,
} from '../lib/github'
import { fileToBase64 } from '../lib/images'

export interface HaushaltsredenEditorState {
  existingMap: Record<number, string>
  disabledYears: Set<number>
  loading: boolean
  loadError: boolean
  busy: number | null
  confirmDeleteYear: number | null
  allYears: number[]
  totalAvail: number
  /** Open the delete-confirm dialog for a year. */
  requestDelete: (year: number) => void
  /** Dismiss the delete-confirm dialog without deleting. */
  cancelDelete: () => void
  reload: () => void
  toggleYear: (year: number) => void
  uploadPdf: (year: number, file: File) => Promise<void>
  deletePdf: (year: number) => Promise<void>
}

export function useHaushaltsredenEditor(): HaushaltsredenEditorState {
  const ensureAuthenticated = useAdminStore(s => s.ensureAuthenticated)
  const setStatus = useAdminStore(s => s.setStatus)

  const [existingMap, setExistingMap] = useState<Record<number, string>>({})
  const [disabledYears, setDisabledYears] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const [confirmDeleteYear, setConfirmDeleteYear] = useState<number | null>(null)

  // Ref so toggleYear's queued closures always read the latest disabled set.
  const toggleQueue = useRef(Promise.resolve())
  const latestDisabled = useRef(disabledYears)
  // Guard so queued async callbacks won't call setState after the component unmounts.
  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )
  useEffect(() => {
    latestDisabled.current = disabledYears
  }, [disabledYears])

  // ─── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(
    async (opts: { silent?: boolean; signal?: { cancelled: boolean } } = {}) => {
      const { silent = false, signal } = opts
      try {
        const [files, config] = await Promise.all([
          listDirectory('public/documents/fraktion/haushaltsreden'),
          getFileContent('public/data/haushaltsreden.json'),
        ])
        if (signal?.cancelled) return
        const map: Record<number, string> = {}
        for (const f of files) {
          const m = f.name.match(/^(\d{4})\.pdf$/i)
          if (m) map[parseInt(m[1])] = f.sha
        }
        setExistingMap(map)
        if (config?.disabledYears) setDisabledYears(new Set(config.disabledYears))
        if (!silent) {
          setLoadError(false)
          setLoading(false)
        }
      } catch {
        if (signal?.cancelled) return
        if (silent) {
          // Surface background-refresh failures as a non-blocking toast instead
          // of silently leaving the grid with potentially stale data.
          setStatus('Aktualisierung fehlgeschlagen — Ansicht möglicherweise veraltet.', 'error')
        } else {
          setLoadError(true)
          setLoading(false)
        }
      }
    },
    [setStatus],
  )

  useEffect(() => {
    const signal = { cancelled: false }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load({ signal })
    return () => {
      signal.cancelled = true
    }
  }, [load])

  const reload = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    void load()
  }, [load])

  // ─── Save config ─────────────────────────────────────────────────────────────

  // Memoized so toggleYear's useCallback dependency stays stable across renders.
  const saveConfig = useCallback(async (disabled: Set<number>) => {
    const body = { disabledYears: [...disabled].sort((a, b) => a - b) }
    await commitFile(
      'public/data/haushaltsreden.json',
      JSON.stringify(body, null, 2) + '\n',
      'admin: Haushaltsreden-Konfiguration aktualisiert',
    )
  }, [])

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const toggleYear = useCallback(
    (year: number) => {
      toggleQueue.current = toggleQueue.current.then(async () => {
        if (!mounted.current) return
        const prev = latestDisabled.current
        const next = new Set(prev)
        if (next.has(year)) next.delete(year)
        else next.add(year)
        setDisabledYears(next)
        latestDisabled.current = next
        setBusy(year)
        try {
          await saveConfig(next)
          if (!mounted.current) return
          setStatus(
            `${year} ${next.has(year) ? 'ausgeblendet' : 'eingeblendet'} & gespeichert`,
            'success',
          )
        } catch (e) {
          if (!mounted.current) return
          setDisabledYears(prev)
          latestDisabled.current = prev
          setStatus('Fehler: ' + (e as Error).message, 'error')
        } finally {
          if (mounted.current) setBusy(null)
        }
      })
    },
    [saveConfig, setStatus],
  )

  const uploadPdf = useCallback(
    async (year: number, file: File) => {
      setBusy(year)
      try {
        await ensureAuthenticated()
        const result = await commitBinaryFile(
          `public/documents/fraktion/haushaltsreden/${year}.pdf`,
          await fileToBase64(file),
          `admin: Haushaltsrede ${year}.pdf hochgeladen`,
        )
        const sha: string = result?.content?.sha ?? 'pending'
        setExistingMap(prev => ({ ...prev, [year]: sha }))
        setStatus(`${year}.pdf erfolgreich hochgeladen!`, 'success')
        void load({ silent: true })
      } catch (e) {
        setStatus('Fehler: ' + (e as Error).message, 'error')
      } finally {
        setBusy(null)
      }
    },
    [ensureAuthenticated, load, setStatus],
  )

  const deletePdf = useCallback(
    async (year: number) => {
      setBusy(year)
      try {
        await ensureAuthenticated()
        await deleteFile(
          `public/documents/fraktion/haushaltsreden/${year}.pdf`,
          `admin: Haushaltsrede ${year}.pdf gelöscht`,
        )
        setExistingMap(prev => {
          const next = { ...prev }
          delete next[year]
          return next
        })
        setStatus(`${year}.pdf gelöscht`, 'success')
        void load({ silent: true })
      } catch (e) {
        setStatus('Fehler: ' + (e as Error).message, 'error')
      } finally {
        setBusy(null)
      }
    },
    [ensureAuthenticated, load, setStatus],
  )

  // Intent-based delete dialog actions — hides the raw state setter from callers.
  const requestDelete = useCallback((year: number) => setConfirmDeleteYear(year), [])
  const cancelDelete = useCallback(() => setConfirmDeleteYear(null), [])

  // ─── Derived values ───────────────────────────────────────────────────────────

  // Stable for the lifetime of the session — no need to recompute on every render.
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const allYears = useMemo(
    () => Array.from({ length: currentYear + 1 - 2010 }, (_, i) => currentYear - i),
    [currentYear],
  )
  const totalAvail = useMemo(
    () => allYears.filter(y => y in existingMap).length,
    [allYears, existingMap],
  )

  return {
    existingMap,
    disabledYears,
    loading,
    loadError,
    busy,
    confirmDeleteYear,
    allYears,
    totalAvail,
    requestDelete,
    cancelDelete,
    reload,
    toggleYear,
    uploadPdf,
    deletePdf,
  }
}
