import { safeHref } from './safeUrl'

/**
 * A deliberately small Markdown subset for long-form content fields that
 * editors type into a plain textarea. Text without any markup renders as
 * plain paragraphs, so existing content keeps working unchanged.
 *
 * Single `*` is not treated as emphasis: gender-star spellings such as
 * "Bürger*innen" are common in the content and must stay untouched.
 */

export type RichTextBlock =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'heading'; text: string }
  | { type: 'list'; ordered: boolean; start: number; items: string[] }
  | { type: 'quote'; lines: string[] }

export type RichTextInline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: RichTextInline[] }
  | { type: 'link'; href: string; text: string; external: boolean }

const HEADING_RE = /^#{1,6}\s+(.+)$/
const BULLET_RE = /^[-*•–]\s+(.+)$/
const ORDERED_RE = /^(\d{1,3})[.)]\s+(.+)$/
const QUOTE_RE = /^>\s?(.*)$/

export function parseRichText(source: string): RichTextBlock[] {
  const lines = source
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trim())
  const blocks: RichTextBlock[] = []
  let open: RichTextBlock | undefined

  for (const [i, line] of lines.entries()) {
    if (!line) {
      open = undefined
      continue
    }

    const heading = HEADING_RE.exec(line)
    if (heading) {
      blocks.push({ type: 'heading', text: heading[1] })
      open = undefined
      continue
    }

    const quote = QUOTE_RE.exec(line)
    if (quote) {
      if (open?.type !== 'quote') {
        open = { type: 'quote', lines: [] }
        blocks.push(open)
      }
      if (quote[1]) open.lines.push(quote[1])
      continue
    }

    const bullet = BULLET_RE.exec(line)
    if (bullet) {
      if (open?.type !== 'list' || open.ordered) {
        open = { type: 'list', ordered: false, start: 1, items: [] }
        blocks.push(open)
      }
      open.items.push(bullet[1])
      continue
    }

    // A lone numbered line stays text so that sentences like "1. Mai …" are
    // not turned into a one-item list; two consecutive ones start a list.
    const ordered = ORDERED_RE.exec(line)
    const continuesList = open?.type === 'list' && open.ordered
    if (ordered && (continuesList || ORDERED_RE.test(lines[i + 1] ?? ''))) {
      if (open?.type !== 'list' || !open.ordered) {
        open = { type: 'list', ordered: true, start: Number(ordered[1]), items: [] }
        blocks.push(open)
      }
      open.items.push(ordered[2])
      continue
    }

    if (open?.type !== 'paragraph') {
      open = { type: 'paragraph', lines: [] }
      blocks.push(open)
    }
    open.lines.push(line)
  }

  return blocks.filter(block => block.type !== 'quote' || block.lines.length > 0)
}

const INLINE_RE =
  /\*\*(.+?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>]+)|([\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,})/gi

const TRAILING_PUNCTUATION = '.,;:!?\'"»“”'

function resolveHref(url: string): string | undefined {
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(url) || /^tel:\+?[\d/-]+$/i.test(url)) return url
  return safeHref(url)
}

function link(href: string, text: string): RichTextInline {
  return { type: 'link', href, text, external: /^https?:/i.test(href) }
}

/** Splits sentence punctuation that directly follows a bare URL off the link. */
function splitTrailingPunctuation(url: string): [string, string] {
  let end = url.length
  while (end > 0) {
    const ch = url[end - 1]
    const unbalancedParen = ch === ')' && !url.slice(0, end).includes('(')
    if (!TRAILING_PUNCTUATION.includes(ch) && !unbalancedParen) break
    end--
  }
  return [url.slice(0, end), url.slice(end)]
}

export function parseInline(text: string): RichTextInline[] {
  const nodes: RichTextInline[] = []
  const pushText = (value: string) => {
    if (value) nodes.push({ type: 'text', text: value })
  }
  let last = 0

  for (const match of text.matchAll(INLINE_RE)) {
    pushText(text.slice(last, match.index))
    last = match.index + match[0].length
    const [, bold, label, target, bareUrl, email] = match

    if (bold !== undefined) {
      nodes.push({ type: 'bold', children: parseInline(bold) })
    } else if (label !== undefined) {
      const href = resolveHref(target)
      nodes.push(href ? link(href, label) : { type: 'text', text: label })
    } else if (bareUrl !== undefined) {
      const [url, rest] = splitTrailingPunctuation(bareUrl)
      const href = safeHref(url)
      nodes.push(href ? link(href, url) : { type: 'text', text: url })
      pushText(rest)
    } else {
      nodes.push(link(`mailto:${email}`, email))
    }
  }

  pushText(text.slice(last))
  return nodes
}
