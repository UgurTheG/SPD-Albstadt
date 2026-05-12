import { vi } from 'vitest'

export class AuthError extends Error {
  status: number
  constructor(msg: string, status: number) {
    super(msg)
    this.name = 'AuthError'
    this.status = status
  }
}

export class ConflictError extends Error {
  constructor(msg = 'Konflikt') {
    super(msg)
    this.name = 'ConflictError'
  }
}

export const getBranchSha = vi.fn().mockResolvedValue('abc123')
export const commitTree = vi.fn().mockResolvedValue({})
export const validateToken = vi.fn().mockResolvedValue({ login: 'testuser', avatar_url: '' })
export const commitFile = vi.fn().mockResolvedValue({})
export const commitBinaryFile = vi.fn().mockResolvedValue({ content: { sha: 'abc' } })
export const deleteFile = vi.fn().mockResolvedValue(null)
export const getFileContent = vi.fn().mockResolvedValue(null)
export const listDirectory = vi.fn().mockResolvedValue([])
