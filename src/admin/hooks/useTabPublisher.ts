import { useState } from 'react'
import { useAdminStore } from '../store'

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

  const [orphans, setOrphans] = useState<string[] | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  const handlePublish = () => setShowPublishConfirm(true)

  const handlePublishConfirmed = () => {
    setShowPublishConfirm(false)
    const o = findOrphanImagesForTab(tabKey)
    if (o.length > 0) {
      setOrphans(o)
      return
    }
    publishTab(tabKey)
  }

  const handleOrphanConfirm = (toDelete: string[]) => {
    setOrphans(null)
    publishTab(tabKey, toDelete.length > 0 ? toDelete : undefined)
  }

  const handleOrphanKeep = () => {
    setOrphans(null)
    publishTab(tabKey)
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
    orphans,
    showDiff,
    showPreview,
    showPublishConfirm,
    handlePublish,
    handlePublishConfirmed,
    handleOrphanConfirm,
    handleOrphanKeep,
    handleOrphanCancel: () => setOrphans(null),
    handleDownload,
    handleRevertAndCloseDiff,
    setShowDiff,
    setShowPreview,
    setShowPublishConfirm,
  }
}
