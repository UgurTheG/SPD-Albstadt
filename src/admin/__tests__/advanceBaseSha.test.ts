/**
 * Tests for editorSlice.advanceBaseSha — keeping the conflict baseline in
 * sync after direct Contents-API commits (Haushaltsreden PDF upload/delete).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Mock github before the store is imported ───────────────────────────────────
vi.mock('../../admin/lib/github', () => {
  class AuthError extends Error {
    status: number
    constructor(msg: string, status: number) {
      super(msg)
      this.name = 'AuthError'
      this.status = status
    }
  }
  class ConflictError extends Error {
    constructor(msg = 'Konflikt') {
      super(msg)
      this.name = 'ConflictError'
    }
  }
  return {
    AuthError,
    ConflictError,
    getBranchSha: vi.fn().mockResolvedValue('abc123'),
    hasDataChanges: vi.fn().mockResolvedValue(true),
    fileExists: vi.fn().mockResolvedValue(true),
    commitTree: vi.fn().mockResolvedValue({}),
    validateToken: vi.fn().mockResolvedValue({ login: 'testuser', avatar_url: '' }),
    commitBinaryFile: vi.fn().mockResolvedValue({ content: { sha: 'abc' } }),
    deleteFile: vi.fn().mockResolvedValue({}),
    getFileContent: vi.fn().mockResolvedValue(null),
    listDirectory: vi.fn().mockResolvedValue([]),
  }
})

import { useAdminStore } from '../../admin/store'

describe('advanceBaseSha', () => {
  beforeEach(() => {
    useAdminStore.setState({ baseCommitSha: 'base-1' })
  })

  it('advances when the commit parent matches the current base', () => {
    useAdminStore.getState().advanceBaseSha({
      commit: { sha: 'new-tip', parents: [{ sha: 'base-1' }] },
    })
    expect(useAdminStore.getState().baseCommitSha).toBe('new-tip')
  })

  it('does not advance when someone else published in between', () => {
    useAdminStore.getState().advanceBaseSha({
      commit: { sha: 'new-tip', parents: [{ sha: 'someone-elses-commit' }] },
    })
    expect(useAdminStore.getState().baseCommitSha).toBe('base-1')
  })

  it('ignores missing results and commits without a sha', () => {
    useAdminStore.getState().advanceBaseSha(undefined)
    useAdminStore.getState().advanceBaseSha({})
    useAdminStore.getState().advanceBaseSha({ commit: { parents: [{ sha: 'base-1' }] } })
    expect(useAdminStore.getState().baseCommitSha).toBe('base-1')
  })

  it('does not advance when no base is recorded yet', () => {
    useAdminStore.setState({ baseCommitSha: '' })
    useAdminStore.getState().advanceBaseSha({
      commit: { sha: 'new-tip', parents: [{ sha: '' }] },
    })
    expect(useAdminStore.getState().baseCommitSha).toBe('')
  })
})
