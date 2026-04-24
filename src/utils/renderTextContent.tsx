import React from 'react'

const URL_OR_EMAIL_RE = /(\bhttps?:\/\/[^\s]+|\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g

/**
 * Renders plain text with newlines as line-breaks and auto-linked URLs/emails.
 */
export function renderTextContent(text: string): React.ReactNode {
  const lines = text.split('\n')
  return lines.map((line, li) => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    URL_OR_EMAIL_RE.lastIndex = 0
    while ((match = URL_OR_EMAIL_RE.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index))
      }
      const token = match[1]
      const href = token.includes('@') ? `mailto:${token}` : token
      parts.push(
        <a
          key={match.index}
          href={href}
          target={token.startsWith('http') ? '_blank' : undefined}
          rel={token.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="text-spd-red dark:text-red-400 hover:underline break-all"
        >
          {token}
        </a>
      )
      lastIndex = match.index + token.length
    }
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex))
    }
    return (
      <React.Fragment key={li}>
        {li > 0 && <br />}
        {parts}
      </React.Fragment>
    )
  })
}

