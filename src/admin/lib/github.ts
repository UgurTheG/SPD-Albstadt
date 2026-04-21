const REPO_OWNER = 'UgurTheG'
const REPO_NAME = 'SPD-Albstadt'
const BRANCH = 'master'

function headers(token: string) {
    return {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}
}

function apiBase() {
    return `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
}

export async function validateToken(token: string) {
    const res = await fetch('https://api.github.com/user', {headers: headers(token)})
    if (!res.ok) throw new Error('Token ungültig')
    const user = await res.json()
    const repoRes = await fetch(`${apiBase()}`, {headers: headers(token)})
    if (!repoRes.ok) throw new Error('Kein Zugriff auf das Repository')
    return user as { login: string; avatar_url: string }
}

export async function commitFile(token: string, filePath: string, content: string, message: string) {
    const h = headers(token)
    const existing = await fetch(`${apiBase()}/contents/${filePath}?ref=${BRANCH}`, {headers: h})
    let sha: string | undefined
    if (existing.ok) sha = (await existing.json()).sha
    const body: Record<string, unknown> = {
        message,
        content: btoa(unescape(encodeURIComponent(content))),
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
    return res.json()
}

export async function commitBinaryFile(token: string, filePath: string, base64Content: string, message: string) {
    const h = headers(token)
    const existing = await fetch(`${apiBase()}/contents/${filePath}?ref=${BRANCH}`, {headers: h})
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
    const existing = await fetch(`${apiBase()}/contents/${filePath}?ref=${BRANCH}`, {headers: h})
    if (!existing.ok) return
    const {sha} = await existing.json()
    await fetch(`${apiBase()}/contents/${filePath}`, {
        method: 'DELETE', headers: h,
        body: JSON.stringify({message, sha, branch: BRANCH}),
    })
}

export async function listDirectory(token: string, dirPath: string) {
    const res = await fetch(`${apiBase()}/contents/${dirPath}?ref=${BRANCH}`, {headers: headers(token)})
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data as { name: string; sha: string }[] : []
}

export async function getFileContent(token: string, filePath: string) {
    const res = await fetch(`${apiBase()}/contents/${filePath}?ref=${BRANCH}`, {headers: headers(token)})
    if (!res.ok) return null
    const data = await res.json()
    return JSON.parse(atob(data.content.replace(/\n/g, '')))
}

