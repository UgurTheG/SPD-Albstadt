import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminStore } from '..'
import { DRAFT_KEY, PENDING_KEY, resetPersistenceState } from '../persistence'

const sha = (n: number) => n.toString(16).padStart(40, '0')
const clone = <T>(x: T): T => structuredClone(x)
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })

beforeEach(() => {
  localStorage.clear()
  resetPersistenceState()
  useAdminStore.setState(
    {
      ...useAdminStore.getInitialState(),
      dataLoaded: true,
      authenticated: true,
      tokenExpiresAt: 0,
      user: { login: 'editor', avatar_url: '' },
      baseCommitSha: sha(1),
    },
    true,
  )
})
afterEach(() => {
  useAdminStore.getState().stopPresencePolling()
  resetPersistenceState()
  vi.restoreAllMocks()
})

/** Versioned GitHub responses exercise the real client, store and merge code together. */
function fakeGitHub(initial: Record<string, unknown>, initialHead = 2) {
  let files = clone(initial)
  let head = sha(initialHead)
  let serial = initialHead + 100
  const revisions = new Map([[head, files]])
  const trees = new Map<string, Record<string, unknown>>()
  const commits = new Map<string, { tree: string; parent: string }>()
  const blobs = new Map<string, string>()
  const reads: { file: string; ref: string | null }[] = []
  let beforePatch: (() => Promise<void>) | undefined
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url === '/api/admin-presence') return json({ users: [], version: 0 })
    if (url !== '/api/github') throw new Error('Unexpected request: ' + url)
    const req = JSON.parse(String(init?.body))
    const target = new URL(req.path, 'https://api.github.com')
    const path = target.pathname
    if (req.method === 'GET' && path.endsWith('/git/ref/heads/main'))
      return json({ object: { sha: head } })
    if (req.method === 'GET' && path.includes('/contents/')) {
      const file = path.split('/contents/')[1]
      const ref = target.searchParams.get('ref')
      reads.push({ file, ref })
      const snapshot = ref === 'main' ? files : revisions.get(ref ?? '')
      return snapshot && file in snapshot
        ? json({ content: btoa(JSON.stringify(snapshot[file])), sha: sha(88) })
        : json({}, 404)
    }
    if (req.method === 'GET' && path.includes('/git/commits/')) {
      const tree = sha(++serial)
      const snapshot = revisions.get(path.split('/').at(-1)!)
      if (!snapshot) return json({}, 404)
      trees.set(tree, clone(snapshot))
      return json({ tree: { sha: tree } })
    }
    if (req.method === 'POST' && path.endsWith('/git/blobs')) {
      const id = sha(++serial)
      blobs.set(id, req.body.content)
      return json({ sha: id })
    }
    if (req.method === 'POST' && path.endsWith('/git/trees')) {
      const nextFiles = clone(trees.get(req.body.base_tree)!)
      for (const entry of req.body.tree) {
        if (entry.sha === null) delete nextFiles[entry.path]
        else if (entry.content !== undefined) nextFiles[entry.path] = JSON.parse(entry.content)
        else nextFiles[entry.path] = blobs.get(entry.sha)
      }
      const id = sha(++serial)
      trees.set(id, nextFiles)
      return json({ sha: id })
    }
    if (req.method === 'POST' && path.endsWith('/git/commits')) {
      const id = sha(++serial)
      commits.set(id, { tree: req.body.tree, parent: req.body.parents[0] })
      return json({ sha: id })
    }
    if (req.method === 'PATCH' && path.endsWith('/git/refs/heads/main')) {
      if (beforePatch) await beforePatch()
      const commit = commits.get(req.body.sha)!
      if (commit.parent !== head) return json({}, 422)
      files = clone(trees.get(commit.tree)!)
      head = req.body.sha
      revisions.set(head, files)
      return json({ object: { sha: head } })
    }
    throw new Error('Unexpected proxy request: ' + JSON.stringify(req))
  })
  return {
    files: () => files,
    reads,
    pausePatch: (fn: () => Promise<void>) => {
      beforePatch = fn
    },
  }
}

describe('publishing preserves concurrent changes', () => {
  it.each(['publishAll', 'publishTab'] as const)(
    'keeps separate tab baselines after %s advances main',
    async method => {
      const base = {
        startseite: { heroSlogan: 'old' },
        kontakt: { email: 'old@example.test', telefon: 'old' },
      }
      const gh = fakeGitHub({
        'public/data/startseite.json': base.startseite,
        'public/data/kontakt.json': { email: 'remote@example.test', telefon: 'old' },
      })
      useAdminStore.setState({
        originalState: clone(base),
        state: {
          startseite: { heroSlogan: 'local slogan' },
          kontakt: { email: 'old@example.test', telefon: 'local phone' },
        },
      })
      if (method === 'publishAll') await useAdminStore.getState().publishAll()
      else {
        await useAdminStore.getState().publishTab('startseite')
        expect(useAdminStore.getState().tabBaseShas.kontakt).toBe(sha(1))
        await useAdminStore.getState().publishTab('kontakt')
      }
      expect(gh.files()['public/data/kontakt.json']).toEqual({
        email: 'remote@example.test',
        telefon: 'local phone',
      })
      expect(useAdminStore.getState().dirtyTabs().size).toBe(0)
      expect(gh.reads.every(read => read.ref !== 'main')).toBe(true)
    },
  )

  it('loads data from the recorded revision even before that revision is deployed', async () => {
    const gh = fakeGitHub({
      'public/data/startseite.json': { heroSlogan: 'old', heroBadge: 'remote badge' },
    })
    await useAdminStore.getState().loadData()
    const loaded = useAdminStore.getState().state.startseite as Record<string, unknown>
    expect(gh.reads.every(read => read.ref === sha(2))).toBe(true)
    useAdminStore.getState().updateState('startseite', { ...loaded, heroSlogan: 'local slogan' })
    await useAdminStore.getState().publishTab('startseite')
    expect(gh.files()['public/data/startseite.json']).toEqual({
      heroSlogan: 'local slogan',
      heroBadge: 'remote badge',
    })
  })

  it.each(['publishTab', 'publishAll'] as const)(
    'keeps edits and uploads added during %s in memory and storage',
    async method => {
      const gh = fakeGitHub({ 'public/data/news.json': [] }, 1)
      const submitted = [{ id: 'first', titel: 'submitted', bildUrl: '/images/news/first.webp' }]
      useAdminStore.setState({ originalState: { news: [] }, state: { news: submitted } })
      useAdminStore.getState().addPendingUpload({
        ghPath: 'public/images/news/first.webp',
        base64: 'YQ==',
        message: 'first',
        tabKey: 'news',
      })
      let release!: () => void, announce!: () => void
      const started = new Promise<void>(resolve => {
        announce = resolve
      })
      const blocked = new Promise<void>(resolve => {
        release = resolve
      })
      gh.pausePatch(async () => {
        announce()
        await blocked
      })
      const publish =
        method === 'publishTab'
          ? useAdminStore.getState().publishTab('news')
          : useAdminStore.getState().publishAll()
      await started
      const later = [{ id: 'first', titel: 'later edit', bildUrl: '/images/news/later.webp' }]
      useAdminStore.getState().updateState('news', later)
      useAdminStore.getState().addPendingUpload({
        ghPath: 'public/images/news/later.webp',
        base64: 'Yg==',
        message: 'later',
        tabKey: 'news',
      })
      // A second click must not release or bypass the first publish's lock.
      await useAdminStore.getState().publishAll()
      expect(useAdminStore.getState().publishing).toBe(true)
      release()
      await publish
      const st = useAdminStore.getState()
      expect(gh.files()['public/data/news.json']).toEqual(submitted)
      expect(st.originalState.news).toEqual(submitted)
      expect(st.state.news).toEqual(later)
      expect(st.dirtyTabs().has('news')).toBe(true)
      expect(st.pendingUploads.map(u => u.ghPath)).toEqual(['public/images/news/later.webp'])
      expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!).news.data).toEqual(later)
      expect(
        JSON.parse(localStorage.getItem(PENDING_KEY)!).map((u: { ghPath: string }) => u.ghPath),
      ).toEqual(['public/images/news/later.webp'])
    },
  )
})
