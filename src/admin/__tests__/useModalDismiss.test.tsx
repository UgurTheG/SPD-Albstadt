/**
 * Tests for useModalDismiss — shared Escape-close + body scroll lock for
 * admin modals (ModalFrame, ConflictMergeModal).
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useModalDismiss } from '../../admin/hooks/useModalDismiss'

describe('useModalDismiss', () => {
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    renderHook(() => useModalDismiss(onClose))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClose = vi.fn()
    renderHook(() => useModalDismiss(onClose))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('locks body scroll while mounted and restores it on unmount', () => {
    document.body.style.overflow = 'auto'
    const { unmount } = renderHook(() => useModalDismiss(() => {}))
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('stops listening after unmount', () => {
    const onClose = vi.fn()
    const { unmount } = renderHook(() => useModalDismiss(onClose))
    unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).not.toHaveBeenCalled()
  })
})
