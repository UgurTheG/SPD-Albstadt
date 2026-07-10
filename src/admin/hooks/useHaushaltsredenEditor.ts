/**
 * All state and async logic for the Haushaltsreden editor, extracted from
 * HaushaltsredenEditor.tsx so the component file is a thin render-only layer.
 *
 * Visibility toggles now go through the normal store → dirty-tracking →
 * Veröffentlichen flow, exactly like every other tab. PDF uploads/deletes
 * remain immediate operations (binary files committed directly).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAdminStore } from '../store'
import { commitBinaryFile, deleteFile, listDirectory } from '../lib/github'
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
  const storeData = useAdminStore(
    s => s.state['haushaltsreden'] as { disabledYears?: number[] } | null,
  )
  const updateState = useAdminStore(s => s.updateState)

  const [existingMap, setExistingMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const [confirmDeleteYear, setConfirmDeleteYear] = useState<number | null>(null)

  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )

  // Derive disabledYears from store state so dirty-tracking and revert work automatically.
  const disabledYears = useMemo(() => new Set<number>(storeData?.disabledYears ?? []), [storeData])

  // ─── Load ────────────────────────────────────────────────────────────────────
  // Only fetches the PDF directory list — the config JSON is loaded by the store.

  const load = useCallback(
    async (opts: { silent?: boolean; signal?: { cancelled: boolean } } = {}) => {
      const { silent = false, signal } = opts
      try {
        const files = await listDirectory('public/documents/fraktion/haushaltsreden')
        if (signal?.cancelled) return
        const map: Record<number, string> = {}
        for (const f of files) {
          const m = f.name.match(/^(\d{4})\.pdf$/i)
          if (m) map[parseInt(m[1])] = f.sha
        }
        setExistingMap(map)
        if (!silent) {
          setLoadError(false)
          setLoading(false)
        }
      } catch {
        if (signal?.cancelled) return
        if (silent) {
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

  // ─── Actions ─────────────────────────────────────────────────────────────────

  // Toggle marks the tab dirty via the store instead of committing immediately.
  // The user must click "Veröffentlichen" to persist the change, exactly like
  // every other admin tab.
  const toggleYear = useCallback(
    (year: number) => {
      const prev = new Set<number>(storeData?.disabledYears ?? [])
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      updateState('haushaltsreden', { disabledYears: [...next].sort((a, b) => a - b) })
    },
    [storeData, updateState],
  )

  // Direct binary commits advance the branch tip — move the store's
  // conflict-detection baseline along with it, otherwise the next publish of
  // any tab hits the conflict guard and runs a needless auto-merge round trip.
  const advanceBaseCommit = useCallback((result: { commit?: { sha?: string } } | null) => {
    const commitSha = result?.commit?.sha
    if (commitSha) useAdminStore.setState({ baseCommitSha: commitSha })
  }, [])

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
        advanceBaseCommit(result)
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
    [advanceBaseCommit, ensureAuthenticated, load, setStatus],
  )

  const deletePdf = useCallback(
    async (year: number) => {
      setBusy(year)
      try {
        await ensureAuthenticated()
        const result = await deleteFile(
          `public/documents/fraktion/haushaltsreden/${year}.pdf`,
          `admin: Haushaltsrede ${year}.pdf gelöscht`,
        )
        advanceBaseCommit(result)
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
    [advanceBaseCommit, ensureAuthenticated, load, setStatus],
  )

  const requestDelete = useCallback((year: number) => setConfirmDeleteYear(year), [])
  const cancelDelete = useCallback(() => setConfirmDeleteYear(null), [])

  // ─── Derived values ───────────────────────────────────────────────────────────

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
