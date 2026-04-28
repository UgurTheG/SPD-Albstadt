import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { ICON_LIST, loadIconSvg } from '../lib/icons'

const inputCls =
  'w-full bg-white/60 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-spd-red/20 focus:border-spd-red/40 focus:bg-white dark:focus:bg-gray-800/80 dark:text-white dark:placeholder-gray-500 transition-all duration-200 backdrop-blur-sm'

interface Props {
  id?: string
  value: string
  onChange: (v: string) => void
}

export default function IconPickerField({ id, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [svgHtml, setSvgHtml] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (value)
      loadIconSvg(value).then(svg => {
        if (svg) setSvgHtml(svg)
      })
  }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return
      if (dropRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onScroll = (e: Event) => {
      // Don't close if scrolling inside the dropdown itself
      if (dropRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  // Position the dropdown below the trigger button
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, left: rect.left, width: rect.width })
    }
  }, [open])

  const filtered = ICON_LIST.filter(i => i.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={inputCls + ' text-left flex items-center gap-2.5 cursor-pointer'}
        onClick={() => setOpen(!open)}
      >
        {/* SVG is sourced from the lucide-static CDN — a controlled internal source */}
        {svgHtml && (
          <span
            className="w-4 h-4 shrink-0"
            dangerouslySetInnerHTML={{ __html: svgHtml.replace(/<svg/, '<svg class="w-4 h-4"') }}
          />
        )}
        <span className="truncate">{value || 'Icon wählen…'}</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={dropRef}
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl dark:shadow-black/40 p-4 max-h-80 overflow-y-auto"
            style={{ top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          >
            <div className="relative mb-3">
              <Search
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Icon suchen…"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-spd-red/20 dark:text-white"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
              {filtered.map(icon => (
                <IconCell
                  key={icon}
                  name={icon}
                  selected={value === icon}
                  onSelect={() => {
                    onChange(icon)
                    setOpen(false)
                  }}
                />
              ))}
              {filtered.length === 0 && (
                <p className="col-span-full text-xs text-gray-400 text-center py-6">
                  Kein Icon gefunden
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

function IconCell({
  name,
  selected,
  onSelect,
}: {
  name: string
  selected: boolean
  onSelect: () => void
}) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    loadIconSvg(name).then(s => {
      if (s) setSvg(s)
    })
  }, [name])
  return (
    <button
      type="button"
      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-150 hover:bg-spd-red/10 hover:scale-105 ${selected ? 'bg-spd-red/15 ring-2 ring-spd-red shadow-sm' : ''}`}
      title={name}
      onClick={onSelect}
    >
      {/* SVG is sourced from the lucide-static CDN — a controlled internal source */}
      {svg && (
        <span
          className="w-4 h-4 text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{ __html: svg.replace(/<svg/, '<svg class="w-4 h-4"') }}
        />
      )}
      <span className="text-[7px] text-gray-400 mt-0.5 leading-tight truncate w-full text-center">
        {name}
      </span>
    </button>
  )
}
