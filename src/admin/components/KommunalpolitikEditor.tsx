import { useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileUp,
  Link as LinkIcon,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAdminStore } from '../store'
import ArrayEditor from './ArrayEditor'
import DiffModal from './DiffModal'
import OrphanModal from './OrphanModal'
import PreviewModal from './PreviewModal'
import PublishConfirmModal from './PublishConfirmModal'
import StickyPublishBar from './StickyPublishBar'
import AdminActionBar from './AdminActionBar'
import AdminWarningBanner from './AdminWarningBanner'
import { CollapsibleSectionHeader } from './CollapsibleSection'
import { fileToBase64 } from '../lib/images'
import { openPendingFile } from '../lib/fileUtils'
import { inputCls } from '../lib/inputCls'
import {
  useKommunalpolitikEditor,
  PERSON_FIELDS,
  type Dokument,
} from '../hooks/useKommunalpolitikEditor'

export default function KommunalpolitikEditor() {
  const {
    data,
    isDirty,
    hasLoadError,
    canUndo,
    canRedo,
    expandedJahrIds,
    collapsedSections,
    publisher,
    update,
    addJahr,
    removeJahr,
    toggleJahrAktiv,
    updateJahrName,
    updateSection,
    updateDokumente,
    toggleExpand,
    toggleSection,
    undo,
    redo,
  } = useKommunalpolitikEditor()

  const loadData = useAdminStore(s => s.loadData)

  return (
    <div className="pb-28">
      {publisher.orphans && (
        <OrphanModal
          orphans={publisher.orphans}
          onConfirm={publisher.handleOrphanConfirm}
          onKeep={publisher.handleOrphanKeep}
          onCancel={publisher.handleOrphanCancel}
        />
      )}
      {publisher.showPreview && (
        <PreviewModal tabKey="kommunalpolitik" onClose={() => publisher.setShowPreview(false)} />
      )}
      {publisher.showPublishConfirm && (
        <PublishConfirmModal
          tabKey="kommunalpolitik"
          onConfirm={publisher.handlePublishConfirmed}
          onCancel={() => publisher.setShowPublishConfirm(false)}
        />
      )}
      {publisher.showDiff && (
        <DiffModal
          tabKey="kommunalpolitik"
          onClose={() => publisher.setShowDiff(false)}
          onRevertAll={publisher.handleRevertAndCloseDiff}
        />
      )}

      {/* Load-error banner */}
      {hasLoadError && (
        <div className="mb-5">
          <AdminWarningBanner>
            Daten für diesen Tab konnten nicht geladen werden. Veröffentlichen ist gesperrt —{' '}
            <button
              type="button"
              onClick={loadData}
              className="underline font-semibold hover:no-underline"
            >
              Erneut versuchen
            </button>
          </AdminWarningBanner>
        </div>
      )}

      {/* Unified action bar */}
      <AdminActionBar
        isDirty={isDirty}
        publishing={publisher.publishing}
        hasLoadError={hasLoadError}
        canUndo={canUndo}
        canRedo={canRedo}
        previewPath="/kommunalpolitik"
        onUndo={undo}
        onRedo={redo}
        onShowPreview={() => publisher.setShowPreview(true)}
        onShowDiff={() => publisher.setShowDiff(true)}
        onDownload={publisher.handleDownload}
        onPublish={publisher.handlePublish}
      />

      {/* Sichtbar toggle */}
      <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Auf der Homepage anzeigen
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Zeigt den Kommunalpolitik-Tab in der Navigation
            </p>
          </div>
          <button
            type="button"
            onClick={() => update({ sichtbar: !data.sichtbar })}
            className={`shrink-0 transition-colors ${data.sichtbar ? 'text-spd-red' : 'text-gray-300 dark:text-gray-600'}`}
            title={data.sichtbar ? 'Ausblenden' : 'Einblenden'}
          >
            {data.sichtbar ? (
              <ToggleRight size={36} strokeWidth={1.5} />
            ) : (
              <ToggleLeft size={36} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Beschreibung */}
      <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-5 mb-6">
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Beschreibung
        </label>
        <textarea
          value={data.beschreibung}
          onChange={e => update({ beschreibung: e.target.value })}
          rows={3}
          placeholder="Kurze Beschreibung der Kommunalpolitik-Seite…"
          className={inputCls + ' resize-none'}
        />
      </div>

      {/* Jahre */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Jahre</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {data.jahre.length} {data.jahre.length === 1 ? 'Jahr' : 'Jahre'} angelegt
            </p>
          </div>
          <button
            type="button"
            onClick={addJahr}
            className="flex items-center gap-1.5 text-xs font-semibold text-spd-red border border-spd-red/30 hover:bg-spd-red hover:text-white transition-all px-3 py-2 rounded-xl"
          >
            <Plus size={13} /> Jahr hinzufügen
          </button>
        </div>

        {data.jahre.length === 0 && (
          <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
            Noch keine Jahre angelegt. Klicke auf „Jahr hinzufügen".
          </div>
        )}

        <AnimatePresence initial={false}>
          {data.jahre.map(jahr => {
            const expanded = expandedJahrIds.has(jahr.id)
            const gemeinderaete = jahr.gemeinderaete ?? []
            const kreisraete = jahr.kreisraete ?? []
            const dokumente = jahr.dokumente ?? []
            const total = gemeinderaete.length + kreisraete.length
            return (
              <motion.div
                key={jahr.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2 }}
                className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl overflow-hidden"
              >
                {/* Year header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleJahrAktiv(jahr.id)}
                    title={jahr.aktiv ? 'Ausblenden' : 'Einblenden'}
                    className={`shrink-0 transition-colors ${jahr.aktiv ? 'text-spd-red' : 'text-gray-300 dark:text-gray-600'}`}
                  >
                    {jahr.aktiv ? (
                      <ToggleRight size={26} strokeWidth={1.5} />
                    ) : (
                      <ToggleLeft size={26} strokeWidth={1.5} />
                    )}
                  </button>

                  <input
                    type="text"
                    value={jahr.jahr}
                    onChange={e => updateJahrName(jahr.id, e.target.value)}
                    placeholder="z.B. 2024"
                    className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 min-w-0"
                    onClick={e => e.stopPropagation()}
                  />

                  <span className="shrink-0 text-[11px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
                    {total} {total !== 1 ? 'Personen' : 'Person'}
                    {dokumente.length > 0 &&
                      ` · ${dokumente.length} ${dokumente.length !== 1 ? 'Dok.' : 'Dok.'}`}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeJahr(jahr.id)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title="Jahr löschen"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(jahr.id)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
                  >
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* Gemeinderäte + Kreisräte editors */}
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden border-t border-gray-200/50 dark:border-gray-700/40"
                    >
                      <div className="p-4 space-y-6">
                        {/* Gemeinderäte */}
                        <div>
                          <CollapsibleSectionHeader
                            label="Gemeinderäte"
                            open={!collapsedSections.has(`${jahr.id}-gemeinderaete`)}
                            count={gemeinderaete.length}
                            variant="subsection"
                            onClick={() => toggleSection(`${jahr.id}-gemeinderaete`)}
                          />
                          <AnimatePresence initial={false}>
                            {!collapsedSections.has(`${jahr.id}-gemeinderaete`) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <ArrayEditor
                                  fields={PERSON_FIELDS}
                                  data={gemeinderaete as unknown as Record<string, unknown>[]}
                                  tabKey="kommunalpolitik"
                                  onStructureChange={p =>
                                    updateSection(jahr.id, 'gemeinderaete', p)
                                  }
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="border-t border-gray-200/50 dark:border-gray-700/40" />

                        {/* Kreisräte */}
                        <div>
                          <CollapsibleSectionHeader
                            label="Kreisräte"
                            open={!collapsedSections.has(`${jahr.id}-kreisraete`)}
                            count={kreisraete.length}
                            variant="subsection"
                            onClick={() => toggleSection(`${jahr.id}-kreisraete`)}
                          />
                          <AnimatePresence initial={false}>
                            {!collapsedSections.has(`${jahr.id}-kreisraete`) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <ArrayEditor
                                  fields={PERSON_FIELDS}
                                  data={kreisraete as unknown as Record<string, unknown>[]}
                                  tabKey="kommunalpolitik"
                                  onStructureChange={p => updateSection(jahr.id, 'kreisraete', p)}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="border-t border-gray-200/50 dark:border-gray-700/40" />

                        {/* Dokumente — toggle + add button share the same row */}
                        <div>
                          <div className="flex items-center mb-3 gap-2">
                            <CollapsibleSectionHeader
                              label="Dokumente"
                              open={!collapsedSections.has(`${jahr.id}-dokumente`)}
                              count={dokumente.length}
                              variant="subsection"
                              onClick={() => toggleSection(`${jahr.id}-dokumente`)}
                            />
                            {!collapsedSections.has(`${jahr.id}-dokumente`) && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateDokumente(jahr.id, [
                                    ...dokumente,
                                    {
                                      id: crypto.randomUUID?.() ?? String(Date.now()),
                                      titel: '',
                                      url: '',
                                    },
                                  ])
                                }
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-spd-red border border-spd-red/30 hover:bg-spd-red hover:text-white transition-all px-2.5 py-1.5 rounded-lg shrink-0"
                              >
                                <Plus size={11} /> Hinzufügen
                              </button>
                            )}
                          </div>
                          <AnimatePresence initial={false}>
                            {!collapsedSections.has(`${jahr.id}-dokumente`) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                {dokumente.length === 0 && (
                                  <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-4">
                                    Noch keine Dokumente hinzugefügt.
                                  </p>
                                )}
                                <div className="space-y-2">
                                  {dokumente.map(dok => (
                                    <DokumentRow
                                      key={dok.id}
                                      dok={dok}
                                      onChange={updated =>
                                        updateDokumente(
                                          jahr.id,
                                          dokumente.map(d => (d.id === dok.id ? updated : d)),
                                        )
                                      }
                                      onRemove={() =>
                                        updateDokumente(
                                          jahr.id,
                                          dokumente.filter(d => d.id !== dok.id),
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <StickyPublishBar
        isDirty={isDirty && !hasLoadError}
        publishing={publisher.publishing}
        onPublish={publisher.handlePublish}
        onShowDiff={() => publisher.setShowDiff(true)}
      />
    </div>
  )
}

// ─── Local sub-components ─────────────────────────────────────────────────────

function DokumentRow({
  dok,
  onChange,
  onRemove,
}: {
  dok: Dokument
  onChange: (d: Dokument) => void
  onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const addPendingUpload = useAdminStore(s => s.addPendingUpload)
  const setStatus = useAdminStore(s => s.setStatus)
  const pendingUploads = useAdminStore(s => s.pendingUploads)
  const [showUrl, setShowUrl] = useState(!dok.url)

  const pendingEntry = dok.url
    ? (pendingUploads.find(u => u.ghPath.replace(/^public/, '') === dok.url) ?? null)
    : null
  const isPending = !!pendingEntry
  const displayName = dok.url ? dok.url.split('/').pop() : null

  const handleFile = async (file: File) => {
    try {
      const base64 = await fileToBase64(file)
      const namePart =
        (dok.titel || 'dokument')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now()
      const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'pdf'
      const ghPath = `public/dokumente/kommunalpolitik/${namePart}.${ext}`
      const publicUrl = `/dokumente/kommunalpolitik/${namePart}.${ext}`
      addPendingUpload({
        ghPath,
        base64,
        message: `admin: Dokument ${namePart}.${ext} hochgeladen`,
      })
      onChange({ ...dok, url: publicUrl })
      setShowUrl(false)
      setStatus('Dokument vorbereitet — wird beim Veröffentlichen hochgeladen', 'success')
    } catch {
      setStatus('Fehler beim Lesen der Datei', 'error')
    }
  }

  const handlePreview = () => {
    if (!dok.url) return
    if (pendingEntry) {
      openPendingFile(pendingEntry.base64, dok.url)
    } else {
      window.open(dok.url, '_blank')
    }
  }

  return (
    <div className="bg-white/50 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-3 space-y-2">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={dok.titel}
          onChange={e => onChange({ ...dok, titel: e.target.value })}
          placeholder="Titel des Dokuments…"
          className={inputCls + ' flex-1 py-2'}
        />
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          title="Entfernen"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-[11px] font-semibold bg-spd-red/10 text-spd-red hover:bg-spd-red/15 px-3 py-1.5 rounded-xl transition-colors"
        >
          <FileUp size={11} /> {displayName ? 'Ersetzen' : 'Datei hochladen'}
        </button>
        {displayName && (
          <button
            type="button"
            onClick={handlePreview}
            title="Dokument öffnen"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-spd-red dark:hover:text-spd-red border border-gray-200/60 dark:border-gray-700/40 hover:border-spd-red/30 px-3 py-1.5 rounded-xl transition-colors"
          >
            <ExternalLink size={11} />
            <span
              className={`font-mono truncate max-w-40 ${isPending ? 'text-amber-600 dark:text-amber-400' : ''}`}
              title={dok.url}
            >
              {isPending ? '⏳ ' : ''}
              {displayName}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowUrl(v => !v)}
          className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          <LinkIcon size={10} /> {showUrl ? 'URL ausblenden' : 'URL eingeben'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf,.doc,.docx"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) void handleFile(e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>
      {showUrl && (
        <input
          type="text"
          className={inputCls + ' font-mono text-xs'}
          placeholder="/dokumente/... oder https://..."
          value={dok.url}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={e => onChange({ ...dok, url: e.target.value })}
        />
      )}
    </div>
  )
}
