const REPO_OWNER = 'UgurTheG'
const REPO_NAME = 'SPD-Albstadt'
const BRANCH = 'master'

function headers(token: string) {
    return {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}
}

function apiBase() {
    return `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
}

/** Encode a UTF-8 string to base64 safely (handles all Unicode). */
function utf8ToBase64(str: string): string {
    const bytes = new TextEncoder().encode(str)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary)
}

// Cache of known SHAs from recent commits, avoids stale GitHub API cache
const shaCache = new Map<string, string>()

export async function validateToken(token: string) {
    const res = await fetch('https://api.github.com/user', {headers: headers(token), cache: 'no-store'})
    if (!res.ok) throw new Error('Token ungültig')
    const user = await res.json()
    const repoRes = await fetch(`${apiBase()}`, {headers: headers(token), cache: 'no-store'})
    if (!repoRes.ok) throw new Error('Kein Zugriff auf das Repository')
    return user as { login: string; avatar_url: string }
}

export async function commitFile(token: string, filePath: string, content: string, message: string) {
    const h = headers(token)
    let sha: string | undefined = shaCache.get(filePath)
    if (!sha) {
        const existing = await fetch(`${apiBase()}/contents/${filePath}?ref=${BRANCH}&t=${Date.now()}`, {
            headers: {...h, 'If-None-Match': ''},
            cache: 'no-store',
        })
        if (existing.ok) sha = (await existing.json()).sha
    }
    const body: Record<string, unknown> = {
        message,
        content: utf8ToBase64(content),
        branch: BRANCH,
    }
    if (sha) body.sha = sha
    const res = await fetch(`${apiBase()}/contents/${filePath}`, {
        method: 'PUT',
        headers: h,
        body: JSON.stringify(body)
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Fehler beim Speichern')
    }
    const result = await res.json()
    if (result?.content?.sha) shaCache.set(filePath, result.content.sha)
    return result
}

export async function commitBinaryFile(token: string, filePath: string, base64Content: string, message: string) {
    const h = headers(token)
    const existing = await fetch(`${apiBase()}/contents/${filePath}?ref=${BRANCH}&t=${Date.now()}`, {
        headers: {...h, 'If-None-Match': ''},
        cache: 'no-store',
    })
    let sha: string | undefined
    if (existing.ok) sha = (await existing.json()).sha
    const body: Record<string, unknown> = {message, content: base64Content, branch: BRANCH}
    if (sha) body.sha = sha
    const res = await fetch(`${apiBase()}/contents/${filePath}`, {
        method: 'PUT',
        headers: h,
        body: JSON.stringify(body)
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Fehler beim Hochladen')
    }
    return res.json()
}

export async function deleteFile(token: string, filePath: string, message: string) {
    const h = headers(token)
    const existing = await fetch(`${apiBase()}/contents/${filePath}?ref=${BRANCH}&t=${Date.now()}`, {
        headers: {...h, 'If-None-Match': ''},
        cache: 'no-store',
    })
    if (!existing.ok) return
    const {sha} = await existing.json()
    await fetch(`${apiBase()}/contents/${filePath}`, {
        method: 'DELETE', headers: h,
        body: JSON.stringify({message, sha, branch: BRANCH}),
    })
}

export interface TreeFileChange {
    path: string
    content?: string        // for text files (UTF-8)
    base64Content?: string  // for binary files
    delete?: boolean
}

/**
 * Create a single commit with multiple file changes using the Git Trees API.
 * This replaces multiple individual commits with one atomic commit.
 */
export async function commitTree(token: string, message: string, changes: TreeFileChange[]) {
    if (changes.length === 0) return
    const h = headers(token)
    const base = apiBase()

    // 1. Get the latest commit SHA on the branch
    const refRes = await fetch(`${base}/git/ref/heads/${BRANCH}?t=${Date.now()}`, {
        headers: {...h, 'If-None-Match': ''},
        cache: 'no-store',
    })
    if (!refRes.ok) throw new Error('Branch nicht gefunden')
    const refData = await refRes.json()
    const latestCommitSha: string = refData.object.sha

    // 2. Get the tree SHA of that commit
    const commitRes = await fetch(`${base}/git/commits/${latestCommitSha}`, {headers: h, cache: 'no-store'})
    if (!commitRes.ok) throw new Error('Commit nicht gefunden')
    const commitData = await commitRes.json()
    const baseTreeSha: string = commitData.tree.sha

    // 3. Build tree entries
    const treeEntries: Record<string, unknown>[] = []

    for (const change of changes) {
        if (change.delete) {
            // To delete a file, set sha to null
            treeEntries.push({
                path: change.path,
                mode: '100644',
                type: 'blob',
                sha: null,
            })
        } else if (change.base64Content) {
            // For binary files, create a blob first
            const blobRes = await fetch(`${base}/git/blobs`, {
                method: 'POST', headers: h,
                body: JSON.stringify({content: change.base64Content, encoding: 'base64'}),
            })
            if (!blobRes.ok) throw new Error(`Blob-Erstellung fehlgeschlagen für ${change.path}`)
            const blobData = await blobRes.json()
            treeEntries.push({
                path: change.path,
                mode: '100644',
                type: 'blob',
                sha: blobData.sha,
            })
        } else if (change.content !== undefined) {
            // For text files, content can be inlined
            treeEntries.push({
                path: change.path,
                mode: '100644',
                type: 'blob',
                content: change.content,
            })
        }
    }

    // 4. Create new tree
    const treeRes = await fetch(`${base}/git/trees`, {
        method: 'POST', headers: h,
        body: JSON.stringify({base_tree: baseTreeSha, tree: treeEntries}),
    })
    if (!treeRes.ok) throw new Error('Tree-Erstellung fehlgeschlagen')
    const treeData = await treeRes.json()

    // 5. Create commit
    const newCommitRes = await fetch(`${base}/git/commits`, {
        method: 'POST', headers: h,
        body: JSON.stringify({
            message,
            tree: treeData.sha,
            parents: [latestCommitSha],
        }),
    })
    if (!newCommitRes.ok) throw new Error('Commit-Erstellung fehlgeschlagen')
    const newCommitData = await newCommitRes.json()

    // 6. Update branch reference
    const updateRefRes = await fetch(`${base}/git/refs/heads/${BRANCH}`, {
        method: 'PATCH', headers: h,
        body: JSON.stringify({sha: newCommitData.sha}),
    })
    if (!updateRefRes.ok) throw new Error('Branch-Update fehlgeschlagen')

    return newCommitData
}

export async function listDirectory(token: string, dirPath: string) {
    const res = await fetch(`${apiBase()}/contents/${dirPath}?ref=${BRANCH}&t=${Date.now()}`, {
        headers: {
            ...headers(token),
            'If-None-Match': ''
        },
        cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data as { name: string; sha: string }[] : []
}

export async function getFileContent(token: string, filePath: string) {
    const res = await fetch(`${apiBase()}/contents/${filePath}?ref=${BRANCH}&t=${Date.now()}`, {
        headers: {
            ...headers(token),
            'If-None-Match': ''
        },
        cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return JSON.parse(atob(data.content.replace(/\n/g, '')))
}

