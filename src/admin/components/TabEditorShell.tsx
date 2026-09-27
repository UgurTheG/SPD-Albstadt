import type { ReactNode } from 'react'
import { useTabEditorState } from '../hooks/useTabEditorState'
import AdminActionBar from './AdminActionBar'
import StickyPublishBar from './StickyPublishBar'
import AdminWarningBanner from './AdminWarningBanner'
import OrphanModal from './OrphanModal'
import PreviewModal from './PreviewModal'
import PublishConfirmModal from './PublishConfirmModal'
import DiffModal from './DiffModal'

interface TabEditorShellProps {
  tabKey: string
  previewPath?: string
  children: ReactNode
}

export default function TabEditorShell({ tabKey, previewPath, children }: TabEditorShellProps) {
  const { isDirty, hasLoadError, canUndo, canRedo, publisher, loadData, undo, redo } =
    useTabEditorState(tabKey)

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
      {publisher.showPublishConfirm && (
        <PublishConfirmModal
          tabKey={tabKey}
          onConfirm={publisher.handlePublishConfirmed}
          onCancel={() => publisher.setShowPublishConfirm(false)}
        />
      )}
      {publisher.showDiff && (
        <DiffModal
          tabKey={tabKey}
          onClose={() => publisher.setShowDiff(false)}
          onRevertAll={publisher.handleRevertAndCloseDiff}
        />
      )}
      {publisher.showPreview && (
        <PreviewModal tabKey={tabKey} onClose={() => publisher.setShowPreview(false)} />
      )}

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

      <AdminActionBar
        isDirty={isDirty}
        publishing={publisher.publishing}
        hasLoadError={hasLoadError}
        canUndo={canUndo}
        canRedo={canRedo}
        previewPath={previewPath}
        onUndo={undo}
        onRedo={redo}
        onShowPreview={() => publisher.setShowPreview(true)}
        onShowDiff={() => publisher.setShowDiff(true)}
        onDownload={publisher.handleDownload}
        onPublish={publisher.handlePublish}
      />

      <StickyPublishBar
        isDirty={isDirty && !hasLoadError}
        publishing={publisher.publishing}
        onPublish={publisher.handlePublish}
        onShowDiff={() => publisher.setShowDiff(true)}
      />

      {children}
    </div>
  )
}
