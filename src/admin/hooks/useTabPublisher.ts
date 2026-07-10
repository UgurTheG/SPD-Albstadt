import { useState } from 'react'
import { useAdminStore } from '../store'
import { useOrphanGate } from './useOrphanGate'

/**
 * Encapsulates the shared publish flow for a single tab:
 * orphan detection, confirm modal, diff modal, preview modal, and download.
 *
 * Usage:
 *   const publisher = useTabPublisher('news', 'news.json')
 *   // render publisher.modals in JSX, call publisher.handlePublish, etc.
 */
export function useTabPublisher(tabKey: string, filename?: string) {
  const publishTab = useAdminStore(s => s.publishTab)
  const publishing = useAdminStore(s => s.publishing)
  const findOrphanImagesForTab = useAdminStore(s => s.findOrphanImagesForTab)
  const revertTab = useAdminStore(s => s.revertTab)
  const state = useAdminStore(s => s.state)

  const orphanGate = useOrphanGate(
    () => findOrphanImagesForTab(tabKey),
    orphansToDelete => publishTab(tabKey, orphansToDelete),
  )
  const [showDiff, setShowDiff] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  const handlePublish = () => setShowPublishConfirm(true)

  const handlePublishConfirmed = () => {
    setShowPublishConfirm(false)
    orphanGate.start()
  }

  const handleDownload = () => {
    const data = state[tabKey]
    const name = filename ?? `${tabKey}.json`
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRevertAndCloseDiff = () => {
    revertTab(tabKey)
    setShowDiff(false)
  }

  return {
    publishing,
    orphans: orphanGate.orphans,
    showDiff,
    showPreview,
    showPublishConfirm,
    handlePublish,
    handlePublishConfirmed,
    handleOrphanConfirm: orphanGate.confirm,
    handleOrphanKeep: orphanGate.keep,
    handleOrphanCancel: orphanGate.cancel,
    handleDownload,
    handleRevertAndCloseDiff,
    setShowDiff,
    setShowPreview,
    setShowPublishConfirm,
  }
}
