/** Thrown specifically for authentication/authorization failures (HTTP 401/403).
 *  Network errors (TypeError from fetch) are NOT wrapped in this class so that
 *  callers can distinguish "bad token" from "no internet". */
export class AuthError extends Error {
  status: number
  constructor(msg: string, status = 401) {
    super(msg)
    this.name = 'AuthError'
    this.status = status
  }
}

/**
 * Thrown when another user has pushed changes to the branch since this session
 * last loaded data. The caller should prompt the user to reload before retrying.
 */
export class ConflictError extends Error {
  constructor(msg = 'Konflikt: Ein anderer Benutzer hat Änderungen veröffentlicht.') {
    super(msg)
    this.name = 'ConflictError'
  }
}

const REPO_OWNER = 'UgurTheG'
const REPO_NAME = 'SPD-Albstadt'
const BRANCH = 'main'

/** Encode a UTF-8 string to base64 safely (handles all Unicode). */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

// Cache of known SHAs from recent commits, avoids stale GitHub API cache
const shaCache = new Map<string, string>()

// ─── Proxy helper ──────────────────────────────────────────────────────────────

/**
 * Send a GitHub API request through the server-side proxy.
 * The access token is attached server-side from the HttpOnly cookie —
 * it never appears in client-side JavaScript.
 */
async function ghFetch(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch('/api/github', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, path, ...(body !== undefined ? { body } : {}) }),
  })
}

function repoBase() {
  return `/repos/${REPO_OWNER}/${REPO_NAME}`
}

// ─── Public API (token-free) ───────────────────────────────────────────────────

export async function validateToken() {
  const res = await ghFetch('GET', '/user')
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new AuthError('Token ungültig', res.status)
    throw new Error(`GitHub API Fehler (${res.status})`)
  }
  const user = await res.json()
  const repoRes = await ghFetch('GET', repoBase())
  if (!repoRes.ok) {
    if (repoRes.status === 401 || repoRes.status === 403 || repoRes.status === 404)
      // Always map to 403 — GitHub returns 404 for private repos the user can't access,
      // but for the UI "Zugriff verweigert" (403) is the correct message, not "Seite nicht gefunden" (404).
      throw new AuthError('Kein Zugriff auf das Repository', 403)
    throw new Error(`Repository-Zugriff Fehler (${repoRes.status})`)
  }
  return user as { login: string; avatar_url: string }
}

export async function commitFile(filePath: string, content: string, message: string) {
  let sha: string | undefined = shaCache.get(filePath)
  if (!sha) {
    const existing = await ghFetch(
      'GET',
      `${repoBase()}/contents/${filePath}?ref=${BRANCH}&t=${Date.now()}`,
    )
    if (existing.ok) sha = (await existing.json()).sha
  }
  const body: Record<string, unknown> = {
    message,
    content: utf8ToBase64(content),
    branch: BRANCH,
  }
  if (sha) body.sha = sha
  const res = await ghFetch('PUT', `${repoBase()}/contents/${filePath}`, body)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Fehler beim Speichern')
  }
  const result = await res.json()
  if (result?.content?.sha) shaCache.set(filePath, result.content.sha)
  return result
}

export async function commitBinaryFile(filePath: string, base64Content: string, message: string) {
  const existing = await ghFetch(
    'GET',
    `${repoBase()}/contents/${filePath}?ref=${BRANCH}&t=${Date.now()}`,
  )
  let sha: string | undefined
  if (existing.ok) sha = (await existing.json()).sha
  const body: Record<string, unknown> = { message, content: base64Content, branch: BRANCH }
  if (sha) body.sha = sha
  const res = await ghFetch('PUT', `${repoBase()}/contents/${filePath}`, body)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Fehler beim Hochladen')
  }
  return res.json()
}

export async function deleteFile(filePath: string, message: string) {
  const existing = await ghFetch(
    'GET',
    `${repoBase()}/contents/${filePath}?ref=${BRANCH}&t=${Date.now()}`,
  )
  if (!existing.ok) return
  const { sha } = await existing.json()
  await ghFetch('DELETE', `${repoBase()}/contents/${filePath}`, { message, sha, branch: BRANCH })
}

export interface TreeFileChange {
  path: string
  content?: string // for text files (UTF-8)
  base64Content?: string // for binary files
  delete?: boolean
}

/**
 * Fetch the current tip commit SHA of the main branch.
 * Used to record a "known base" at load time for conflict detection.
 */
export async function getBranchSha(): Promise<string> {
  const res = await ghFetch('GET', `${repoBase()}/git/ref/heads/${BRANCH}?t=${Date.now()}`)
  if (!res.ok) throw new Error('Branch nicht gefunden')
  const data = await res.json()
  return data.object.sha as string
}

/**
 * Create a single commit with multiple file changes using the Git Trees API.
 * This replaces multiple individual commits with one atomic commit.
 *
 * @param expectedBaseSha - If provided, the commit is rejected with ConflictError
 *   when the branch tip has moved ahead of this SHA (i.e. another user published
 *   in the meantime). Pass the SHA recorded during the last loadData() call.
 */
export async function commitTree(
  message: string,
  changes: TreeFileChange[],
  expectedBaseSha?: string,
) {
  if (changes.length === 0) return
  const base = repoBase()

  // 1. Get the latest commit SHA on the branch
  const refRes = await ghFetch('GET', `${base}/git/ref/heads/${BRANCH}?t=${Date.now()}`)
  if (!refRes.ok) throw new Error('Branch nicht gefunden')
  const refData = await refRes.json()
  const latestCommitSha: string = refData.object.sha

  // Conflict guard — fail fast before uploading blobs/trees
  if (expectedBaseSha && latestCommitSha !== expectedBaseSha) {
    throw new ConflictError()
  }

  // 2. Get the tree SHA of that commit
  const commitRes = await ghFetch('GET', `${base}/git/commits/${latestCommitSha}`)
  if (!commitRes.ok) throw new Error('Commit nicht gefunden')
  const commitData = await commitRes.json()
  const baseTreeSha: string = commitData.tree.sha

  // 3. Build tree entries (binary blobs are created in parallel)
  const binaryChanges = changes.filter(c => !c.delete && c.base64Content)
  const blobShas = await Promise.all(
    binaryChanges.map(async change => {
      const blobRes = await ghFetch('POST', `${base}/git/blobs`, {
        content: change.base64Content,
        encoding: 'base64',
      })
      if (!blobRes.ok) throw new Error(`Blob-Erstellung fehlgeschlagen für ${change.path}`)
      const blobData = await blobRes.json()
      return { path: change.path, sha: blobData.sha as string }
    }),
  )
  const blobShaMap = new Map(blobShas.map(b => [b.path, b.sha]))

  const treeEntries: Record<string, unknown>[] = []

  for (const change of changes) {
    if (change.delete) {
      treeEntries.push({ path: change.path, mode: '100644', type: 'blob', sha: null })
    } else if (change.base64Content) {
      treeEntries.push({
        path: change.path,
        mode: '100644',
        type: 'blob',
        sha: blobShaMap.get(change.path),
      })
    } else if (change.content !== undefined) {
      treeEntries.push({ path: change.path, mode: '100644', type: 'blob', content: change.content })
    }
  }

  // 4. Create new tree
  const treeRes = await ghFetch('POST', `${base}/git/trees`, {
    base_tree: baseTreeSha,
    tree: treeEntries,
  })
  if (!treeRes.ok) throw new Error('Tree-Erstellung fehlgeschlagen')
  const treeData = await treeRes.json()

  // 5. Create commit
  const newCommitRes = await ghFetch('POST', `${base}/git/commits`, {
    message,
    tree: treeData.sha,
    parents: [latestCommitSha],
  })
  if (!newCommitRes.ok) throw new Error('Commit-Erstellung fehlgeschlagen')
  const newCommitData = await newCommitRes.json()

  // 6. Update branch reference
  const updateRefRes = await ghFetch('PATCH', `${base}/git/refs/heads/${BRANCH}`, {
    sha: newCommitData.sha,
  })
  // 422 means another commit landed between step 1 and now — surface as ConflictError
  if (updateRefRes.status === 422) throw new ConflictError()
  if (!updateRefRes.ok) throw new Error('Branch-Update fehlgeschlagen')

  return newCommitData
}

export async function listDirectory(dirPath: string) {
  const res = await ghFetch(
    'GET',
    `${repoBase()}/contents/${dirPath}?ref=${BRANCH}&t=${Date.now()}`,
  )
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? (data as { name: string; sha: string }[]) : []
}

export async function getFileContent(filePath: string) {
  const res = await ghFetch(
    'GET',
    `${repoBase()}/contents/${filePath}?ref=${BRANCH}&t=${Date.now()}`,
  )
  if (!res.ok) return null
  const data = await res.json()
  // Decode base64 → bytes → UTF-8 string (atob alone breaks on multi-byte chars like ä/ö/ü/ß)
  const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, '')), c => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}
