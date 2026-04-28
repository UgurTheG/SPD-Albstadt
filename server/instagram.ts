import { INSTAGRAM_PROFILE_URL, INSTAGRAM_USERNAME } from '../src/shared/instagram.ts'

const DEFAULT_LIMIT = 4
const MAX_LIMIT = 6
const MAX_TOTAL_ITEMS = 60
const MAX_PAGE_REQUESTS = 20

type FeedSource = 'instagram' | 'fallback'
type FallbackReason = 'missing_env' | 'upstream_error'

interface InstagramGraphMediaChild {
  media_type?: string
  media_url?: string
  thumbnail_url?: string
}

interface InstagramGraphMediaItem {
  id: string
  caption?: string
  media_type?: string
  media_url?: string
  permalink?: string
  thumbnail_url?: string
  timestamp?: string
  children?: {
    data?: InstagramGraphMediaChild[]
  }
}

interface InstagramGraphResponse {
  business_discovery?: {
    username?: string
    media?: {
      data?: InstagramGraphMediaItem[]
      paging?: {
        cursors?: {
          after?: string
        }
      }
    }
  }
}

export interface InstagramFeedItem {
  id: string
  caption: string
  permalink: string
  mediaType: string
  mediaUrl: string | null
  timestamp: string | null
}

export interface InstagramFeedResponse {
  username: string
  profileUrl: string
  source: FeedSource
  fallbackReason?: FallbackReason
  items: InstagramFeedItem[]
  pageSize: number
  fetchedAt: string
}

type EnvLike = Record<string, string | undefined>

function clampLimit(value?: number | string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsed)))
}

function createFallbackResponse(
  reason: FallbackReason,
  pageSize: number = DEFAULT_LIMIT,
): InstagramFeedResponse {
  return {
    username: INSTAGRAM_USERNAME,
    profileUrl: INSTAGRAM_PROFILE_URL,
    source: 'fallback',
    fallbackReason: reason,
    items: [],
    pageSize,
    fetchedAt: new Date().toISOString(),
  }
}

function getPrimaryMediaUrl(item: InstagramGraphMediaItem): string | null {
  if (item.media_type === 'VIDEO') {
    return item.thumbnail_url ?? item.media_url ?? null
  }

  if (item.media_type === 'CAROUSEL_ALBUM') {
    const firstChild = item.children?.data?.find(child => child.thumbnail_url || child.media_url)
    return (
      firstChild?.thumbnail_url ??
      firstChild?.media_url ??
      item.thumbnail_url ??
      item.media_url ??
      null
    )
  }

  return item.media_url ?? item.thumbnail_url ?? null
}

function normalizeItem(item: InstagramGraphMediaItem): InstagramFeedItem | null {
  if (!item.id || !item.permalink) return null

  return {
    id: item.id,
    caption: (item.caption ?? '').trim(),
    permalink: item.permalink,
    mediaType: item.media_type ?? 'IMAGE',
    mediaUrl: getPrimaryMediaUrl(item),
    timestamp: item.timestamp ?? null,
  }
}

function buildGraphApiUrl(
  userId: string,
  accessToken: string,
  limit: number,
  after?: string,
): string {
  const mediaModifiers = [`.limit(${limit})`]
  if (after) mediaModifiers.push(`.after(${after})`)

  const params = new URLSearchParams({
    fields: `business_discovery.username(${INSTAGRAM_USERNAME}){username,media${mediaModifiers.join('')}{id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_type,media_url,thumbnail_url}}}`,
    access_token: accessToken,
  })

  return `https://graph.facebook.com/v22.0/${userId}?${params.toString()}`
}

export async function loadInstagramFeed(
  env: EnvLike,
  limit: number | string | null = DEFAULT_LIMIT,
  fetchImpl: typeof fetch = fetch,
): Promise<InstagramFeedResponse> {
  const accessToken = env.INSTAGRAM_ACCESS_TOKEN
  const userId = env.INSTAGRAM_USER_ID
  const safeLimit = clampLimit(limit)

  if (!accessToken || !userId) {
    return createFallbackResponse('missing_env', safeLimit)
  }

  try {
    const items: InstagramFeedItem[] = []
    const seenIds = new Set<string>()
    let after: string | undefined
    let discoveredUsername = INSTAGRAM_USERNAME

    for (let page = 0; page < MAX_PAGE_REQUESTS && items.length < MAX_TOTAL_ITEMS; page += 1) {
      const response = await fetchImpl(buildGraphApiUrl(userId, accessToken, safeLimit, after), {
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        return createFallbackResponse('upstream_error', safeLimit)
      }

      const payload = (await response.json()) as InstagramGraphResponse
      const mediaConnection = payload.business_discovery?.media
      const pageItems = (mediaConnection?.data ?? [])
        .map(normalizeItem)
        .filter((item): item is InstagramFeedItem => item !== null)

      discoveredUsername = payload.business_discovery?.username ?? discoveredUsername

      pageItems.forEach(item => {
        if (seenIds.has(item.id) || items.length >= MAX_TOTAL_ITEMS) return
        seenIds.add(item.id)
        items.push(item)
      })

      after = mediaConnection?.paging?.cursors?.after
      if (!after || pageItems.length === 0) break
    }

    return {
      username: discoveredUsername,
      profileUrl: `https://www.instagram.com/${discoveredUsername}/`,
      source: 'instagram',
      items,
      pageSize: safeLimit,
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return createFallbackResponse('upstream_error', safeLimit)
  }
}

export async function loadInstagramFeedFromUrl(
  requestUrl: string,
  env: EnvLike,
  fetchImpl: typeof fetch = fetch,
): Promise<InstagramFeedResponse> {
  const url = new URL(requestUrl, 'http://localhost')
  return loadInstagramFeed(env, url.searchParams.get('limit'), fetchImpl)
}
