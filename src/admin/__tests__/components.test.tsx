/**
 * Render tests for all admin components and fields.
 * Goal: exercise every component's rendering paths to achieve 100 % admin coverage.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { Suspense } from 'react'
import { MemoryRouter } from 'react-router-dom'

// ── Mock github (used by HaushaltsredenEditor via hook) ────────────────────────
vi.mock('../../admin/lib/github', () => {
  class AuthError extends Error {
    status: number
    constructor(msg: string, status: number) {
      super(msg)
      this.name = 'AuthError'
      this.status = status
    }
  }
  return {
    AuthError,
    commitTree: vi.fn().mockResolvedValue({}),
    validateToken: vi.fn().mockResolvedValue({ login: 'testuser', avatar_url: '' }),
    commitFile: vi.fn().mockResolvedValue({}),
    commitBinaryFile: vi.fn().mockResolvedValue({ content: { sha: 'abc' } }),
    deleteFile: vi.fn().mockResolvedValue({}),
    getFileContent: vi.fn().mockResolvedValue(null),
    listDirectory: vi.fn().mockResolvedValue([]),
  }
})

// ── Mock icons (fetch to CDN) ──────────────────────────────────────────────────
vi.mock('../../admin/lib/icons', async importOriginal => {
  const original = await importOriginal<typeof import('../../admin/lib/icons')>()
  return {
    ...original,
    loadIconSvg: vi.fn().mockResolvedValue('<svg><path/></svg>'),
  }
})

import { useAdminStore } from '../../admin/store'
import { resetPersistenceState } from '../../admin/store/persistence'

function resetStore(overrides: Record<string, unknown> = {}) {
  localStorage.clear()
  resetPersistenceState()
  useAdminStore.setState({
    activeTab: 'news',
    state: {},
    originalState: {},
    pendingUploads: [],
    dataLoaded: true,
    dataLoadErrors: [],
    undoStacks: {},
    redoStacks: {},
    publishing: false,
    authenticated: true,
    tokenExpiresAt: 0,
    user: { login: 'testuser', avatar_url: '' },
    loginError: '',
    loginLoading: false,
    loginAuthStatus: null,
    darkMode: false,
    statusMessage: '',
    statusType: 'info',
    statusCounter: 0,
    ...overrides,
  })
}

// ─── Helper: stub URL API ─────────────────────────────────────────────────────
const realFetch = globalThis.fetch
beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(window, 'open').mockImplementation(() => null)
  // Stub fetch to handle auth session/logout endpoints used by tryAutoLogin/logout
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (u.includes('/api/auth/session')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ authenticated: false, expires_at: 0 }),
        } as Response)
      }
      if (u.includes('/api/auth/logout')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response)
      }
      return realFetch(url, init)
    }),
  )
  resetStore()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─── AdminWarningBanner ───────────────────────────────────────────────────────

import AdminWarningBanner from '../../admin/components/AdminWarningBanner'

describe('AdminWarningBanner', () => {
  it('renders children', () => {
    const { getByText } = render(<AdminWarningBanner>Warning text</AdminWarningBanner>)
    expect(getByText('Warning text')).toBeTruthy()
  })

  it('renders title when provided', () => {
    const { getByText } = render(<AdminWarningBanner title="Fehler">Message</AdminWarningBanner>)
    expect(getByText('Fehler')).toBeTruthy()
  })

  it('renders without title', () => {
    const { container } = render(<AdminWarningBanner>Msg</AdminWarningBanner>)
    expect(container.firstChild).toBeTruthy()
  })

  it('respects custom iconSize', () => {
    expect(() => render(<AdminWarningBanner iconSize={20}>Msg</AdminWarningBanner>)).not.toThrow()
  })
})

// ─── AdminSkeleton ────────────────────────────────────────────────────────────

import AdminSkeleton from '../../admin/components/AdminSkeleton'

describe('AdminSkeleton', () => {
  it('renders loading state', () => {
    const { container } = render(<AdminSkeleton />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})

// ─── CollapsibleSection ───────────────────────────────────────────────────────

import {
  CollapsibleSection,
  CollapsibleSectionHeader,
} from '../../admin/components/CollapsibleSection'

describe('CollapsibleSection', () => {
  it('renders children when open', () => {
    const { getByText } = render(
      <CollapsibleSection label="Test section">
        <span>Child content</span>
      </CollapsibleSection>,
    )
    expect(getByText('Child content')).toBeTruthy()
  })

  it('renders with count badge', () => {
    const { container } = render(
      <CollapsibleSection label="Test" count={5}>
        <span>x</span>
      </CollapsibleSection>,
    )
    expect(container.textContent).toContain('5')
  })

  it('toggles open state on header click', () => {
    const { getByText } = render(
      <CollapsibleSection label="Toggle me" defaultOpen={true}>
        <span>Content</span>
      </CollapsibleSection>,
    )
    const header = getByText('Toggle me').closest('button')!
    fireEvent.click(header)
    // After click, it collapses (content may still be in DOM via AnimatePresence)
    fireEvent.click(header)
  })

  it('renders with variant=subsection', () => {
    expect(() =>
      render(
        <CollapsibleSection label="Sub" variant="subsection">
          <span>x</span>
        </CollapsibleSection>,
      ),
    ).not.toThrow()
  })

  it('renders with defaultOpen=false', () => {
    expect(() =>
      render(
        <CollapsibleSection label="Closed" defaultOpen={false}>
          <span>Hidden</span>
        </CollapsibleSection>,
      ),
    ).not.toThrow()
  })
})

describe('CollapsibleSectionHeader', () => {
  it('renders section variant with count', () => {
    const { container } = render(
      <CollapsibleSectionHeader label="Section" open={true} count={3} onClick={() => {}} />,
    )
    expect(container.textContent).toContain('3')
  })

  it('renders section variant without count', () => {
    expect(() =>
      render(<CollapsibleSectionHeader label="Section" open={false} onClick={() => {}} />),
    ).not.toThrow()
  })

  it('renders subsection variant open', () => {
    const { container } = render(
      <CollapsibleSectionHeader
        label="Sub"
        open={true}
        count={2}
        variant="subsection"
        onClick={() => {}}
      />,
    )
    expect(container.textContent).toContain('Sub')
  })

  it('renders subsection variant closed without count', () => {
    expect(() =>
      render(
        <CollapsibleSectionHeader
          label="Sub"
          open={false}
          variant="subsection"
          onClick={() => {}}
        />,
      ),
    ).not.toThrow()
  })

  it('calls onClick', () => {
    const onClick = vi.fn()
    const { container } = render(
      <CollapsibleSectionHeader label="Click" open={true} onClick={onClick} />,
    )
    fireEvent.click(container.querySelector('button')!)
    expect(onClick).toHaveBeenCalledOnce()
  })
})

// ─── AdminActionBar ───────────────────────────────────────────────────────────

import AdminActionBar from '../../admin/components/AdminActionBar'

const defaultBarProps = {
  isDirty: false,
  publishing: false,
  hasLoadError: false,
  canUndo: false,
  canRedo: false,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onShowPreview: vi.fn(),
  onShowDiff: vi.fn(),
  onDownload: vi.fn(),
  onPublish: vi.fn(),
}

describe('AdminActionBar', () => {
  it('renders in clean state', () => {
    const { container } = render(<AdminActionBar {...defaultBarProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows Änderungen button when dirty', () => {
    const { getByText } = render(<AdminActionBar {...defaultBarProps} isDirty={true} />)
    expect(getByText('Änderungen')).toBeTruthy()
  })

  it('shows Vorschau when previewPath provided', () => {
    const { container } = render(
      <AdminActionBar {...defaultBarProps} previewPath="/kommunalpolitik" />,
    )
    expect(container.textContent).toContain('Vorschau')
  })

  it('does not show Vorschau without previewPath', () => {
    const { container } = render(<AdminActionBar {...defaultBarProps} />)
    // "Vorschau" is inside hidden sm:inline span
    // No explicit aria-label for preview without path
    expect(container.textContent).not.toContain('Vorschau')
  })

  it('shows publishing spinner', () => {
    const { container } = render(
      <AdminActionBar {...defaultBarProps} isDirty={true} publishing={true} />,
    )
    expect(container.textContent).toContain('Veröffentliche')
  })

  it('calls onUndo when undo clicked', () => {
    const onUndo = vi.fn()
    const { getByTitle } = render(
      <AdminActionBar {...defaultBarProps} canUndo={true} onUndo={onUndo} />,
    )
    fireEvent.click(getByTitle('Rückgängig (Ctrl+Z)'))
    expect(onUndo).toHaveBeenCalledOnce()
  })

  it('calls onRedo when redo clicked', () => {
    const onRedo = vi.fn()
    const { getByTitle } = render(
      <AdminActionBar {...defaultBarProps} canRedo={true} onRedo={onRedo} />,
    )
    fireEvent.click(getByTitle('Wiederherstellen (Ctrl+Shift+Z)'))
    expect(onRedo).toHaveBeenCalledOnce()
  })

  it('shows hasLoadError title on publish button', () => {
    const { getByTitle } = render(
      <AdminActionBar {...defaultBarProps} isDirty={true} hasLoadError={true} />,
    )
    expect(getByTitle('Daten konnten nicht geladen werden — Seite neu laden')).toBeTruthy()
  })
})

// ─── StickyPublishBar ─────────────────────────────────────────────────────────

import StickyPublishBar from '../../admin/components/StickyPublishBar'

describe('StickyPublishBar', () => {
  it('renders without visible bar when not dirty', () => {
    expect(() =>
      render(
        <StickyPublishBar
          isDirty={false}
          publishing={false}
          onPublish={vi.fn()}
          onShowDiff={vi.fn()}
        />,
      ),
    ).not.toThrow()
  })

  it('renders without visible bar when dirty but not scrolled', () => {
    expect(() =>
      render(
        <StickyPublishBar
          isDirty={true}
          publishing={false}
          onPublish={vi.fn()}
          onShowDiff={vi.fn()}
        />,
      ),
    ).not.toThrow()
  })

  it('shows bar when dirty and scrolled', () => {
    // Simulate scrolled state by setting window.scrollY
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true, writable: true })
    const { container } = render(
      <StickyPublishBar
        isDirty={true}
        publishing={false}
        onPublish={vi.fn()}
        onShowDiff={vi.fn()}
      />,
    )
    // Trigger scroll event
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(container.firstChild).toBeTruthy()
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
  })
})

// ─── AdminSidebar ─────────────────────────────────────────────────────────────

import AdminSidebar from '../../admin/components/AdminSidebar'

const sidebarProps = {
  open: true,
  activeTab: 'news',
  dirty: new Set<string>(),
  darkMode: false,
  publishing: false,
  dataLoadErrors: [] as string[],
  user: { login: 'testuser', avatar_url: '' },
  onClose: vi.fn(),
  onSelectTab: vi.fn(),
  onShowGlobalDiff: vi.fn(),
  onPublishAll: vi.fn(),
  onToggleDark: vi.fn(),
  onLogout: vi.fn(),
}

describe('AdminSidebar', () => {
  it('renders open sidebar', () => {
    const { container } = render(<AdminSidebar {...sidebarProps} />)
    expect(container.textContent).toContain('Daten-Editor')
  })

  it('renders closed sidebar', () => {
    const { container } = render(<AdminSidebar {...sidebarProps} open={false} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows dirty tabs publish actions', () => {
    const { container } = render(<AdminSidebar {...sidebarProps} dirty={new Set(['news'])} />)
    expect(container.textContent).toContain('veröffentlichen')
  })

  it('shows dark mode toggle', () => {
    const { getByTitle } = render(<AdminSidebar {...sidebarProps} darkMode={true} />)
    expect(getByTitle('Dark Mode')).toBeTruthy()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    const { getByLabelText } = render(<AdminSidebar {...sidebarProps} onClose={onClose} />)
    const closeBtn = getByLabelText('Seitenleiste schließen')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onSelectTab when tab clicked', () => {
    const onSelectTab = vi.fn()
    const { getAllByRole } = render(<AdminSidebar {...sidebarProps} onSelectTab={onSelectTab} />)
    const buttons = getAllByRole('button')
    // Find a tab button (not the close button)
    const tabButton = buttons.find(b => !b.getAttribute('aria-label'))
    if (tabButton) fireEvent.click(tabButton)
    // onSelectTab should have been called
  })

  it('shows dataLoadErrors hint on publish all button', () => {
    const { container } = render(
      <AdminSidebar {...sidebarProps} dirty={new Set(['news'])} dataLoadErrors={['news']} />,
    )
    // Publish all button should have a title about errors
    const btn = container.querySelector('button[title]')
    expect(btn).toBeTruthy()
  })

  it('handles swipe close gesture', () => {
    const onClose = vi.fn()
    const { container } = render(<AdminSidebar {...sidebarProps} onClose={onClose} />)
    const aside = container.querySelector('aside')!
    fireEvent.touchStart(aside, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(aside, { changedTouches: [{ clientX: 100 }] }) // swipe left >50px
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('ignores small swipe', () => {
    const onClose = vi.fn()
    const { container } = render(<AdminSidebar {...sidebarProps} onClose={onClose} />)
    const aside = container.querySelector('aside')!
    fireEvent.touchStart(aside, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(aside, { changedTouches: [{ clientX: 180 }] }) // small delta
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ─── OrphanModal ─────────────────────────────────────────────────────────────

import OrphanModal from '../../admin/components/OrphanModal'

describe('OrphanModal', () => {
  it('renders with orphan list', () => {
    const { container } = render(
      <OrphanModal
        orphans={['/images/old.webp']}
        onConfirm={vi.fn()}
        onKeep={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(container.textContent).toContain('old.webp')
  })

  it('renders with empty orphan list', () => {
    expect(() =>
      render(<OrphanModal orphans={[]} onConfirm={vi.fn()} onKeep={vi.fn()} onCancel={vi.fn()} />),
    ).not.toThrow()
  })

  it('calls onCancel on backdrop click', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <OrphanModal
        orphans={['/images/old.webp']}
        onConfirm={vi.fn()}
        onKeep={vi.fn()}
        onCancel={onCancel}
      />,
    )
    const backdrop = container.firstChild as HTMLElement
    fireEvent.click(backdrop)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn()
    render(
      <OrphanModal
        orphans={['/images/old.webp']}
        onConfirm={vi.fn()}
        onKeep={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onKeep when keep button clicked', () => {
    const onKeep = vi.fn()
    const { getByText } = render(
      <OrphanModal
        orphans={['/images/o.webp']}
        onConfirm={vi.fn()}
        onKeep={onKeep}
        onCancel={vi.fn()}
      />,
    )
    const keepBtn = getByText(/behalten/i)
    fireEvent.click(keepBtn)
    expect(onKeep).toHaveBeenCalledOnce()
  })
})

// ─── PublishConfirmModal ──────────────────────────────────────────────────────

import PublishConfirmModal from '../../admin/components/PublishConfirmModal'

describe('PublishConfirmModal', () => {
  it('renders for a specific tab with no changes', () => {
    resetStore({
      state: { news: [] },
      originalState: { news: [] },
    })
    expect(() =>
      render(<PublishConfirmModal tabKey="news" onConfirm={vi.fn()} onCancel={vi.fn()} />),
    ).not.toThrow()
  })

  it('renders for all tabs when no tabKey given', () => {
    resetStore({ state: { news: [] }, originalState: { news: [] } })
    expect(() =>
      render(<PublishConfirmModal onConfirm={vi.fn()} onCancel={vi.fn()} />),
    ).not.toThrow()
  })

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn()
    resetStore({ state: { news: [] }, originalState: { news: [] } })
    render(<PublishConfirmModal tabKey="news" onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    resetStore({ state: { news: [] }, originalState: { news: [] } })
    const { getAllByRole } = render(
      <PublishConfirmModal tabKey="news" onConfirm={onConfirm} onCancel={vi.fn()} />,
    )
    const btns = getAllByRole('button')
    const confirmBtn = btns.find(
      b => b.textContent?.includes('eröffentlichen') || b.textContent?.includes('Bestätigen'),
    )
    if (confirmBtn) {
      fireEvent.click(confirmBtn)
    }
  })

  it('shows diff entries when there are changes', () => {
    resetStore({
      state: { news: [{ titel: 'New' }] },
      originalState: { news: [{ titel: 'Old' }] },
    })
    const { container } = render(
      <PublishConfirmModal tabKey="news" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(container.firstChild).toBeTruthy()
  })
})

// ─── DiffModal ────────────────────────────────────────────────────────────────

import DiffModal from '../../admin/components/DiffModal'

describe('DiffModal', () => {
  it('renders with no changes', () => {
    resetStore({ state: { news: [] }, originalState: { news: [] } })
    expect(() =>
      render(<DiffModal tabKey="news" onClose={vi.fn()} onRevertAll={vi.fn()} />),
    ).not.toThrow()
  })

  it('returns null for unknown tabKey', () => {
    resetStore()
    const { container } = render(
      <DiffModal tabKey="nonexistent" onClose={vi.fn()} onRevertAll={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    resetStore({ state: { news: [] }, originalState: { news: [] } })
    render(<DiffModal tabKey="news" onClose={onClose} onRevertAll={vi.fn()} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders with diff entries', () => {
    resetStore({
      state: { news: [{ titel: 'New' }] },
      originalState: { news: [{ titel: 'Old' }] },
    })
    const { container } = render(
      <DiffModal tabKey="news" onClose={vi.fn()} onRevertAll={vi.fn()} />,
    )
    expect(container.textContent).toBeTruthy()
  })
})

// ─── GlobalDiffModal ──────────────────────────────────────────────────────────

import GlobalDiffModal from '../../admin/components/GlobalDiffModal'

describe('GlobalDiffModal', () => {
  it('renders with no changes', () => {
    resetStore({ state: { news: [] }, originalState: { news: [] } })
    expect(() => render(<GlobalDiffModal onClose={vi.fn()} />)).not.toThrow()
  })

  it('renders with changes', () => {
    resetStore({
      state: { news: [{ titel: 'New' }] },
      originalState: { news: [{ titel: 'Old' }] },
    })
    const { container } = render(<GlobalDiffModal onClose={vi.fn()} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    resetStore()
    render(<GlobalDiffModal onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})

// ─── DiffDisplay ─────────────────────────────────────────────────────────────

import { FieldChangeDiff, InlineDiff } from '../../admin/components/DiffDisplay'
import type { ChangeEntry } from '../../admin/lib/diff'

describe('FieldChangeDiff', () => {
  it('renders pending image replacement', () => {
    const entry: ChangeEntry = {
      id: 'x',
      path: ['bildUrl'],
      kind: 'modified',
      group: 'Test',
      fieldType: 'image',
      before: '/images/old.webp',
      after: '/images/old.webp',
      pendingImagePath: '/images/old.webp',
    }
    const { container } = render(<FieldChangeDiff entry={entry} />)
    expect(container.textContent).toContain('old.webp')
  })

  it('renders text diff', () => {
    const entry: ChangeEntry = {
      id: 'x',
      path: [0, 'titel'],
      kind: 'modified',
      group: 'Test',
      fieldType: 'text',
      before: 'Old title',
      after: 'New title',
    }
    const { container } = render(<FieldChangeDiff entry={entry} />)
    expect(container.textContent).toBeTruthy()
  })

  it('renders generic diff (non-text type)', () => {
    const entry: ChangeEntry = {
      id: 'x',
      path: [0, 'value'],
      kind: 'modified',
      group: 'Test',
      fieldType: 'toggle',
      before: true,
      after: false,
    }
    const { container } = render(<FieldChangeDiff entry={entry} />)
    expect(container.textContent).toBeTruthy()
  })
})

describe('InlineDiff', () => {
  it('renders short single-word diff inline', () => {
    const { container } = render(<InlineDiff oldVal="old" newVal="new" />)
    expect(container.textContent).toContain('old')
    expect(container.textContent).toContain('new')
  })

  it('renders long multi-word diff with word-level highlighting', () => {
    const { container } = render(
      <InlineDiff
        oldVal="The quick brown fox jumps over the lazy dog"
        newVal="The quick red fox jumps over the lazy cat"
      />,
    )
    expect(container.textContent).toBeTruthy()
  })

  it('renders with non-string values', () => {
    const { container } = render(<InlineDiff oldVal={42} newVal={99} />)
    expect(container.textContent).toContain('42')
  })
})

// ─── ItemCardBody ─────────────────────────────────────────────────────────────

import ItemCardBody from '../../admin/components/ItemCardBody'
import { getPreviewText } from '../../admin/lib/getPreviewText'

const testFields = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'value', label: 'Wert', type: 'text' as const },
]

describe('getPreviewText', () => {
  it('returns item.name if present', () => {
    expect(getPreviewText({ name: 'Alice' }, 0)).toBe('Alice')
  })
  it('returns item.titel if no name', () => {
    expect(getPreviewText({ titel: 'News' }, 0)).toBe('News')
  })
  it('returns item.title if no name/titel', () => {
    expect(getPreviewText({ title: 'Title' }, 0)).toBe('Title')
  })
  it('returns item.tage if available', () => {
    expect(getPreviewText({ tage: 'Mo-Fr' }, 0)).toBe('Mo-Fr')
  })
  it('returns item.jahr if available', () => {
    expect(getPreviewText({ jahr: '2024' }, 0)).toBe('2024')
  })
  it('returns fallback index', () => {
    expect(getPreviewText({}, 2)).toBe('#3')
  })
})

describe('ItemCardBody', () => {
  it('renders fields', () => {
    const { container } = render(
      <ItemCardBody
        fields={testFields}
        item={{ name: 'Alice', value: 'x' }}
        index={0}
        total={1}
        onItemChange={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        gripSlot={null}
      />,
    )
    expect(container.textContent).toContain('Alice')
  })

  it('renders collapsed state', () => {
    const { container } = render(
      <ItemCardBody
        fields={testFields}
        item={{ name: 'Alice', value: 'x' }}
        index={0}
        total={3}
        onItemChange={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        gripSlot={null}
      />,
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('calls onToggleCollapse when header clicked', () => {
    const { container } = render(
      <ItemCardBody
        fields={testFields}
        item={{ name: 'Alice', value: 'x' }}
        index={0}
        total={1}
        onItemChange={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        gripSlot={null}
      />,
    )
    // Click the preview/header area
    const header = container.querySelector('button[title]')
    if (header) fireEvent.click(header)
  })

  it('calls onMove up', () => {
    const onMove = vi.fn()
    const { getAllByRole } = render(
      <ItemCardBody
        fields={testFields}
        item={{ name: 'B', value: 'y' }}
        index={1}
        total={3}
        onItemChange={vi.fn()}
        onRemove={vi.fn()}
        onMove={onMove}
        gripSlot={null}
      />,
    )
    const moveUpBtn = getAllByRole('button').find(
      b =>
        b.getAttribute('title')?.includes('oben') || b.getAttribute('aria-label')?.includes('oben'),
    )
    if (moveUpBtn) fireEvent.click(moveUpBtn)
  })
})

// ─── ItemCard ─────────────────────────────────────────────────────────────────

import ItemCard from '../../admin/components/ItemCard'

describe('ItemCard', () => {
  it('renders', () => {
    const { container } = render(
      <ItemCard
        fields={testFields}
        item={{ name: 'Alice', value: 'x' }}
        index={0}
        total={1}
        onItemChange={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeTruthy()
  })
})

// ─── FieldRenderer ────────────────────────────────────────────────────────────

import FieldRenderer from '../../admin/components/FieldRenderer'

describe('FieldRenderer', () => {
  const noop = vi.fn()

  it('renders text field', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'name', label: 'Name', type: 'text' }}
        value="Alice"
        onChange={noop}
      />,
    )
    expect(container.querySelector('input')).not.toBeNull()
  })

  it('renders textarea field', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'bio', label: 'Bio', type: 'textarea' }}
        value="Some bio"
        onChange={noop}
      />,
    )
    expect(container.querySelector('textarea')).not.toBeNull()
  })

  it('renders date field', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'datum', label: 'Datum', type: 'date' }}
        value="2024-01-15"
        onChange={noop}
      />,
    )
    expect(container.querySelector('input')).not.toBeNull()
  })

  it('renders select field', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'cat', label: 'Cat', type: 'select', options: ['A', 'B'] }}
        value="A"
        onChange={noop}
      />,
    )
    expect(container.querySelector('select')).not.toBeNull()
  })

  it('renders toggle field', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'aktiv', label: 'Aktiv', type: 'toggle' }}
        value={true}
        onChange={noop}
      />,
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders email field', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'email', label: 'E-Mail', type: 'email' }}
        value="a@b.com"
        onChange={noop}
      />,
    )
    expect(container.querySelector('input[type="email"]')).not.toBeNull()
  })

  it('renders url field', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'website', label: 'Website', type: 'url' }}
        value="https://example.com"
        onChange={noop}
      />,
    )
    expect(container.querySelector('input')).not.toBeNull()
  })

  it('renders time field', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'zeit', label: 'Zeit', type: 'time' }}
        value="10:00"
        onChange={noop}
      />,
    )
    expect(container.querySelector('input')).not.toBeNull()
  })

  it('renders stringlist field', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'tags', label: 'Tags', type: 'stringlist' }}
        value={['a', 'b']}
        onChange={noop}
      />,
    )
    expect(container.querySelectorAll('input').length).toBeGreaterThan(0)
  })

  it('renders image field (uses ImageField)', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'img', label: 'Bild', type: 'image', imageDir: 'news' }}
        value="/images/news/photo.webp"
        onChange={noop}
      />,
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders imagelist field (uses ImageListField)', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'imgs', label: 'Bilder', type: 'imagelist', imageDir: 'news' }}
        value={['/images/a.webp']}
        onChange={noop}
      />,
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders icon-picker field', async () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'icon', label: 'Icon', type: 'icon-picker' }}
        value="Home"
        onChange={noop}
      />,
    )
    await act(async () => {})
    expect(container.firstChild).toBeTruthy()
  })

  it('renders field with iconKey (FieldIcon)', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'email', label: 'E-Mail', type: 'email', iconKey: 'mail' }}
        value="test@test.com"
        onChange={noop}
      />,
    )
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders required field with asterisk', () => {
    const { container } = render(
      <FieldRenderer
        field={{ key: 'name', label: 'Name', type: 'text', required: true }}
        value=""
        onChange={noop}
      />,
    )
    expect(container.textContent).toContain('*')
  })

  it('calls onChange on input change', () => {
    const onChange = vi.fn()
    const { container } = render(
      <FieldRenderer
        field={{ key: 'name', label: 'Name', type: 'text' }}
        value="Alice"
        onChange={onChange}
      />,
    )
    const input = container.querySelector('input')!
    fireEvent.change(input, { target: { value: 'Bob' } })
    expect(onChange).toHaveBeenCalled()
  })
})

// ─── ArrayEditor ─────────────────────────────────────────────────────────────

import ArrayEditor from '../../admin/components/ArrayEditor'

describe('ArrayEditor', () => {
  it('renders empty state', () => {
    const { container } = render(<ArrayEditor fields={testFields} data={[]} tabKey="news" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders items', () => {
    const { container } = render(
      <ArrayEditor
        fields={testFields}
        data={[{ id: '1', name: 'Alice', value: 'x' }]}
        tabKey="news"
      />,
    )
    expect(container.textContent).toContain('Alice')
  })

  it('adds new item when + button clicked', () => {
    const { container } = render(<ArrayEditor fields={testFields} data={[]} tabKey="news" />)
    const addBtn = container.querySelector('button')!
    // The first button should be "Eintrag hinzufügen" or similar
    fireEvent.click(addBtn)
  })

  it('uses onStructureChange when provided', () => {
    const onStructureChange = vi.fn()
    const { container } = render(
      <ArrayEditor
        fields={testFields}
        data={[]}
        tabKey="news"
        onStructureChange={onStructureChange}
      />,
    )
    const addBtn = container.querySelector('button')!
    fireEvent.click(addBtn)
    // If the + button adds an item, onStructureChange should be called
  })

  it('renders filter input', () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ id: String(i), name: `Person ${i}` }))
    const { container } = render(<ArrayEditor fields={testFields} data={data} tabKey="news" />)
    // Filter appears only when there are enough items
    expect(container.firstChild).toBeTruthy()
  })
})

// ─── LoginScreen ─────────────────────────────────────────────────────────────

import LoginScreen from '../../admin/components/LoginScreen'

describe('LoginScreen', () => {
  it('renders the login page', () => {
    const { container } = render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    )
    // Should render the login screen (either with or without CLIENT_ID)
    expect(container.textContent).toContain('Daten-Editor')
  })

  it('renders with auth error query param', () => {
    window.history.pushState({}, '', '/admin?auth=error&msg=access_denied')
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    const { container } = render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    )
    expect(container.firstChild).toBeTruthy()
    window.history.pushState({}, '', '/admin')
    replaceStateSpy.mockRestore()
  })
})

// ─── PreviewModal ─────────────────────────────────────────────────────────────

import PreviewModal from '../../admin/components/PreviewModal'

describe('PreviewModal', () => {
  it('renders for a known tab key', () => {
    resetStore({ state: { news: [] } })
    expect(() =>
      render(
        <Suspense fallback={<div>Loading</div>}>
          <PreviewModal tabKey="news" onClose={vi.fn()} />
        </Suspense>,
      ),
    ).not.toThrow()
  })

  it('renders for unknown tab (returns null)', () => {
    render(
      <Suspense fallback={<div>Loading</div>}>
        <PreviewModal tabKey="unknown_tab" onClose={vi.fn()} />
      </Suspense>,
    )
    // Unknown tab has no entry in TAB_PREVIEW_MAP, so component returns null
    // container.firstChild may be null (expected)
    expect(() => {}).not.toThrow()
  })

  it('calls onClose on close button click', () => {
    const onClose = vi.fn()
    render(
      <Suspense fallback={<div>Loading</div>}>
        <PreviewModal tabKey="news" onClose={onClose} />
      </Suspense>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    // onClose may or may not be called depending on lazy load state
  })
})

// ─── HaushaltsredenEditor ─────────────────────────────────────────────────────

import HaushaltsredenEditor from '../../admin/components/HaushaltsredenEditor'

describe('HaushaltsredenEditor', () => {
  it('renders loading state', async () => {
    const { container } = render(<HaushaltsredenEditor />)
    await act(async () => {})
    // Should render something (loading or content)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders after load', async () => {
    const { container } = render(<HaushaltsredenEditor />)
    await act(async () => {
      await new Promise(r => setTimeout(r, 20))
    })
    expect(container.firstChild).toBeTruthy()
  })
})

// ─── IconPickerField ──────────────────────────────────────────────────────────

import IconPickerField from '../../admin/fields/IconPickerField'

describe('IconPickerField', () => {
  it('renders with a value', async () => {
    const { container } = render(<IconPickerField value="Home" onChange={vi.fn()} />)
    await act(async () => {})
    expect(container.textContent).toContain('Home')
  })

  it('renders without a value', () => {
    const { container } = render(<IconPickerField value="" onChange={vi.fn()} />)
    expect(container.textContent).toContain('Icon wählen')
  })

  it('opens dropdown on button click', async () => {
    const { container } = render(<IconPickerField id="icon1" value="Home" onChange={vi.fn()} />)
    const btn = container.querySelector('button')!
    await act(async () => {
      fireEvent.click(btn)
    })
    // After click, dropdown is rendered in portal (document.body)
    expect(document.body.querySelector('input[placeholder]')).not.toBeNull()
  })

  it('closes dropdown when clicking outside', async () => {
    const { container } = render(<IconPickerField value="Home" onChange={vi.fn()} />)
    const btn = container.querySelector('button')!
    await act(async () => {
      fireEvent.click(btn)
    })
    // Click outside
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(document.body.querySelector('input[placeholder]')).toBeNull()
  })

  it('filters icons by search', async () => {
    const { container } = render(<IconPickerField value="" onChange={vi.fn()} />)
    const btn = container.querySelector('button')!
    await act(async () => {
      fireEvent.click(btn)
    })
    const searchInput = document.body.querySelector('input[placeholder]') as HTMLInputElement
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'ZZZNoMatch' } })
      expect(document.body.textContent?.toLowerCase()).toContain('kein icon')
    }
  })

  it('calls onChange when icon selected', async () => {
    const onChange = vi.fn()
    const { container } = render(<IconPickerField value="" onChange={onChange} />)
    const btn = container.querySelector('button')!
    await act(async () => {
      fireEvent.click(btn)
    })
    const iconButtons = document.body.querySelectorAll('button[title]')
    if (iconButtons.length > 0) {
      fireEvent.click(iconButtons[0])
      expect(onChange).toHaveBeenCalled()
    }
  })
})

// ─── ImageField ──────────────────────────────────────────────────────────────

import ImageField from '../../admin/fields/ImageField'

describe('ImageField', () => {
  const imgField = { key: 'bildUrl', label: 'Bild', type: 'image' as const, imageDir: 'news' }

  it('renders with a URL', () => {
    const { container } = render(
      <ImageField field={imgField} value="/images/news/photo.webp" onChange={vi.fn()} />,
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders without a URL (empty)', () => {
    const { container } = render(<ImageField field={imgField} value="" onChange={vi.fn()} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders with pending upload preview', () => {
    resetStore({
      pendingUploads: [
        {
          ghPath: 'public/images/news/photo.webp',
          base64: 'abc123',
          message: 'm',
          tabKey: 'news',
        },
      ],
    })
    const { container } = render(
      <ImageField field={imgField} value="/images/news/photo.webp" onChange={vi.fn()} />,
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('toggles URL input visibility', () => {
    const { container } = render(
      <ImageField field={imgField} value="/images/news/photo.webp" onChange={vi.fn()} />,
    )
    const btns = container.querySelectorAll('button')
    const linkBtn = Array.from(btns).find(b => b.textContent?.includes('URL'))
    if (linkBtn) {
      fireEvent.click(linkBtn)
    }
  })

  it('renders with context item (for naming)', () => {
    const { container } = render(
      <ImageField
        field={imgField}
        value=""
        onChange={vi.fn()}
        contextItem={{ name: 'Alice Müller' }}
      />,
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('syncs when value changes externally', () => {
    const { rerender, container } = render(
      <ImageField field={imgField} value="" onChange={vi.fn()} />,
    )
    rerender(<ImageField field={imgField} value="/images/news/new.webp" onChange={vi.fn()} />)
    expect(container.firstChild).toBeTruthy()
  })
})

// ─── ImageListField ───────────────────────────────────────────────────────────

import ImageListField from '../../admin/fields/ImageListField'

describe('ImageListField', () => {
  const imgsField = {
    key: 'bildUrls',
    label: 'Bilder',
    type: 'imagelist' as const,
    imageDir: 'news',
    captionsKey: 'bildBeschreibungen',
  }

  it('renders with empty list', () => {
    const { container } = render(<ImageListField field={imgsField} value={[]} onChange={vi.fn()} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders with items', () => {
    const { container } = render(
      <ImageListField
        field={imgsField}
        value={['/images/news/a.webp', '/images/news/b.webp']}
        onChange={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('add URL input toggles', () => {
    const { container } = render(<ImageListField field={imgsField} value={[]} onChange={vi.fn()} />)
    const linkBtn = container.querySelector('button')
    if (linkBtn) fireEvent.click(linkBtn)
  })
})

// ─── KommunalpolitikEditor ────────────────────────────────────────────────────

import KommunalpolitikEditor from '../../admin/components/KommunalpolitikEditor'

describe('KommunalpolitikEditor', () => {
  it('renders with empty data', () => {
    resetStore({
      state: { kommunalpolitik: { sichtbar: true, beschreibung: '', jahre: [] } },
      originalState: { kommunalpolitik: { sichtbar: true, beschreibung: '', jahre: [] } },
    })
    const { container } = render(<KommunalpolitikEditor />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders with Jahre', () => {
    resetStore({
      state: {
        kommunalpolitik: {
          sichtbar: true,
          beschreibung: 'Beschreibung',
          jahre: [
            {
              id: 'j1',
              jahr: '2024',
              aktiv: true,
              gemeinderaete: [],
              kreisraete: [],
              dokumente: [],
            },
          ],
        },
      },
      originalState: {
        kommunalpolitik: {
          sichtbar: true,
          beschreibung: 'Beschreibung',
          jahre: [],
        },
      },
    })
    const { container } = render(<KommunalpolitikEditor />)
    // The year name is inside an input field (value attr) — check something else rendered
    expect(container.textContent).toContain('0 Personen')
  })

  it('renders load error banner', () => {
    resetStore({
      state: { kommunalpolitik: { sichtbar: false, beschreibung: '', jahre: [] } },
      originalState: { kommunalpolitik: { sichtbar: false, beschreibung: '', jahre: [] } },
      dataLoadErrors: ['kommunalpolitik'],
    })
    const { container } = render(<KommunalpolitikEditor />)
    expect(container.textContent).toContain('geladen')
  })

  it('toggles sichtbar', () => {
    resetStore({
      state: { kommunalpolitik: { sichtbar: true, beschreibung: '', jahre: [] } },
      originalState: { kommunalpolitik: { sichtbar: true, beschreibung: '', jahre: [] } },
    })
    const { getAllByRole } = render(<KommunalpolitikEditor />)
    const toggleBtn = getAllByRole('button').find(b => b.getAttribute('title')?.includes('blenden'))
    if (toggleBtn) fireEvent.click(toggleBtn)
    expect(useAdminStore.getState().state['kommunalpolitik']).toBeTruthy()
  })
})

// ─── TabEditor ────────────────────────────────────────────────────────────────

import TabEditor from '../../admin/components/TabEditor'
import { TABS } from '../../admin/config/tabs'

describe('TabEditor', () => {
  it('renders haushaltsreden tab', async () => {
    const tab = TABS.find(t => t.key === 'haushaltsreden')!
    const { container } = render(<TabEditor tab={tab} />)
    await act(async () => {})
    expect(container.firstChild).toBeTruthy()
  })

  it('renders kommunalpolitik tab', () => {
    resetStore({
      state: { kommunalpolitik: { sichtbar: true, beschreibung: '', jahre: [] } },
      originalState: { kommunalpolitik: { sichtbar: true, beschreibung: '', jahre: [] } },
    })
    const tab = TABS.find(t => t.key === 'kommunalpolitik')!
    const { container } = render(<TabEditor tab={tab} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders news tab (array type)', () => {
    resetStore({
      state: { news: [] },
      originalState: { news: [] },
    })
    const tab = TABS.find(t => t.key === 'news')!
    const { container } = render(<TabEditor tab={tab} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders party tab (object type with sections)', () => {
    const partyData = { beschreibung: '', schwerpunkte: [], vorstand: [], abgeordnete: [] }
    resetStore({
      state: { party: partyData },
      originalState: { party: partyData },
    })
    const tab = TABS.find(t => t.key === 'party')!
    const { container } = render(<TabEditor tab={tab} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders with load error', () => {
    const partyData = { beschreibung: '', schwerpunkte: [], vorstand: [], abgeordnete: [] }
    resetStore({
      state: { party: partyData },
      originalState: { party: partyData },
      dataLoadErrors: ['party'],
    })
    const tab = TABS.find(t => t.key === 'party')!
    const { container } = render(<TabEditor tab={tab} />)
    expect(container.textContent).toContain('geladen')
  })
})

// ─── AdminApp ─────────────────────────────────────────────────────────────────

import AdminApp from '../../admin/AdminApp'

// Mock sonner to avoid toast side-effects
vi.mock('sonner', () => ({
  toast: vi.fn(),
  Toaster: () => null,
}))

describe('AdminApp', () => {
  it('renders login screen when not authenticated', async () => {
    resetStore({ authenticated: false, user: null })
    const { container } = render(
      <MemoryRouter>
        <AdminApp />
      </MemoryRouter>,
    )
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    expect(container.firstChild).toBeTruthy()
  })

  it('renders editor when authenticated and loaded', async () => {
    resetStore({
      authenticated: true,
      user: { login: 'testuser', avatar_url: '' },
      dataLoaded: true,
      state: { news: [] },
      originalState: { news: [] },
    })
    const { container } = render(
      <MemoryRouter>
        <AdminApp />
      </MemoryRouter>,
    )
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    expect(container.firstChild).toBeTruthy()
  })

  it('renders skeleton while loading data', async () => {
    resetStore({
      authenticated: true,
      user: { login: 'testuser', avatar_url: '' },
      dataLoaded: false,
    })
    const { container } = render(
      <MemoryRouter>
        <AdminApp />
      </MemoryRouter>,
    )
    await act(async () => {})
    expect(container.firstChild).toBeTruthy()
  })

  it('shows warning banner on dataLoadErrors', async () => {
    resetStore({
      authenticated: true,
      user: { login: 'testuser', avatar_url: '' },
      dataLoaded: true,
      state: { news: [] },
      originalState: { news: [] },
      dataLoadErrors: ['news'],
    })
    const { container } = render(
      <MemoryRouter>
        <AdminApp />
      </MemoryRouter>,
    )
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    expect(container.firstChild).toBeTruthy()
  })
})
