import { describe, it, expect, beforeEach } from 'vitest'

// Re-import the module fresh for each test group by resetting module state via
// a thin wrapper — the module keeps its own `lockCount` in closure scope.
// We reset it by calling every outstanding unlock before each test.

describe('scrollLock', () => {
  // Re-import inside each test so the module state is isolated per group via
  // the fact that vitest shares the module cache within a file. We therefore
  // manage state manually: always unlock what we lock.

  beforeEach(async () => {
    // Drain any leftover locks from a previous test by importing and unlocking
    // until lockCount would be 0. The safest way: we import once at the top.
  })

  it('sets overflow: hidden on <html> and <body> when the first lock is acquired', async () => {
    const { lockScroll } = await import('../scrollLock')
    const unlock = lockScroll()
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('hidden')
    unlock()
  })

  it('restores overflow when the lock is released', async () => {
    const { lockScroll } = await import('../scrollLock')
    const unlock = lockScroll()
    unlock()
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.body.style.overflow).toBe('')
  })

  it('calling the unlock function twice has no extra effect (idempotent)', async () => {
    const { lockScroll } = await import('../scrollLock')
    const unlock = lockScroll()
    unlock()
    // Second call must not throw and must leave overflow cleared
    unlock()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('nested locks: only the outermost unlock restores overflow', async () => {
    const { lockScroll } = await import('../scrollLock')
    const unlock1 = lockScroll()
    const unlock2 = lockScroll()

    unlock1()
    // Still locked because unlock2 hasn't been called yet
    expect(document.documentElement.style.overflow).toBe('hidden')

    unlock2()
    // Now fully released
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('restores the original paddingRight value after unlock', async () => {
    const { lockScroll } = await import('../scrollLock')
    document.body.style.paddingRight = '8px'
    const unlock = lockScroll()
    unlock()
    expect(document.body.style.paddingRight).toBe('8px')
    // tidy up
    document.body.style.paddingRight = ''
  })
})
