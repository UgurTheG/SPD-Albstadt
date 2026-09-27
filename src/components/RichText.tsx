import { Fragment } from 'react'
import type { RichTextBlock, RichTextInline } from '@/utils/richText'
import { parseInline, parseRichText } from '@/utils/richText'

interface Props {
  text: string
}

export default function RichText({ text }: Props) {
  return (
    <div className="space-y-4 text-base leading-relaxed text-gray-700 dark:text-gray-300 hyphens-auto">
      {parseRichText(text).map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  )
}

function Block({ block }: { block: RichTextBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h3 className="pt-4 text-lg sm:text-xl font-bold leading-snug text-gray-900 dark:text-white">
          <Inline text={block.text} />
        </h3>
      )
    case 'list': {
      const items = block.items.map((item, i) => (
        <li key={i} className="pl-1">
          <Inline text={item} />
        </li>
      ))
      return block.ordered ? (
        <ol
          start={block.start}
          className="list-decimal pl-6 space-y-2 marker:font-semibold marker:text-spd-red"
        >
          {items}
        </ol>
      ) : (
        <ul className="list-disc pl-5 space-y-2 marker:text-spd-red">{items}</ul>
      )
    }
    case 'quote':
      return (
        <blockquote className="border-l-2 border-spd-red pl-4 italic text-gray-800 dark:text-gray-200">
          <Lines lines={block.lines} />
        </blockquote>
      )
    case 'paragraph':
      return (
        <p>
          <Lines lines={block.lines} />
        </p>
      )
  }
}

function Lines({ lines }: { lines: string[] }) {
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      <Inline text={line} />
    </Fragment>
  ))
}

function Inline({ text }: { text: string }) {
  return <InlineNodes nodes={parseInline(text)} />
}

function InlineNodes({ nodes }: { nodes: RichTextInline[] }) {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={i}>{node.text}</Fragment>
      case 'bold':
        return (
          <strong key={i} className="font-semibold text-gray-900 dark:text-white">
            <InlineNodes nodes={node.children} />
          </strong>
        )
      case 'link':
        return (
          <a
            key={i}
            href={node.href}
            target={node.external ? '_blank' : undefined}
            rel={node.external ? 'noopener noreferrer' : undefined}
            className="font-medium text-spd-red dark:text-red-400 underline decoration-current/30 underline-offset-2 hover:decoration-current break-words hyphens-none"
          >
            {node.text}
          </a>
        )
    }
  })
}
