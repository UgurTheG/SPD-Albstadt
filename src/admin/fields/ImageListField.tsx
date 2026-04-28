import { useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ImagePlus,
  Link as LinkIcon,
  Plus,
  Upload,
  X,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import type { FieldConfig } from '../types'
import { useAdminStore } from '../store'
import CropOverlay from '../components/CropOverlay'
import { inputCls } from '../lib/inputCls'

interface Props {
  field: FieldConfig
  value: string[]
  onChange: (v: string[], extras?: Record<string, unknown>) => void
  contextItem?: Record<string, unknown>
}

export default function ImageListField({ field, value, onChange, contextItem }: Props) {
  const addPendingUpload = useAdminStore(s => s.addPendingUpload)
  const setStatus = useAdminStore(s => s.setStatus)
  const list = Array.isArray(value) ? [...value] : []
  const captionsKey = field.captionsKey
  const captions: string[] =
    captionsKey && contextItem
      ? Array.isArray(contextItem[captionsKey])
        ? [...(contextItem[captionsKey] as string[])]
        : []
      : []
  const [cropData, setCropData] = useState<{ file: File; index: number; nameSlug: string } | null>(
    null,
  )

  // Build extras object for caption changes — keeps URLs and captions in sync
  // within a single immutable update instead of two separate calls.
  const withCaps = (caps: string[]): Record<string, unknown> | undefined =>
    captionsKey ? { [captionsKey]: caps } : undefined

  // Stable ids for sortable (index-based since URLs can repeat)
  const ids = list.map((_, i) => `img-${i}`)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    const newList = arrayMove(list, oldIndex, newIndex)
    const newCaptions = arrayMove(captions, oldIndex, newIndex)
    onChange(newList, withCaps(newCaptions))
  }

  const handleCrop = (base64: string | null) => {
    if (!cropData) return
    const { index, nameSlug } = cropData
    setCropData(null)
    if (!base64) return
    const imageDir = field.imageDir || 'news'
    const ghFilePath = `public/images/${imageDir}/${nameSlug}.webp`
    const publicUrl = `/images/${imageDir}/${nameSlug}.webp`
    addPendingUpload({
      ghPath: ghFilePath,
      base64,
      message: `admin: Bild ${nameSlug}.webp hochgeladen`,
    })
    const newList = [...list]
    newList[index] = publicUrl
    onChange(newList)
    setStatus('Bild vorbereitet — wird beim Veröffentlichen hochgeladen', 'success')
  }

  return (
    <>
      {cropData && <CropOverlay file={cropData.file} onComplete={handleCrop} />}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {list.map((item, i) => (
              <SortableImageListItem
                key={ids[i]}
                id={ids[i]}
                url={item}
                caption={captions[i] || ''}
                hasCaption={!!captionsKey}
                index={i}
                total={list.length}
                onUrlChange={v => {
                  const n = [...list]
                  n[i] = v
                  onChange(n)
                }}
                onCaptionChange={v => {
                  const c = [...captions]
                  c[i] = v
                  onChange([...list], withCaps(c))
                }}
                onUpload={file => setCropData({ file, index: i, nameSlug: `bild-${Date.now()}` })}
                onRemove={() => {
                  const n = [...list]
                  n.splice(i, 1)
                  const c = [...captions]
                  c.splice(i, 1)
                  onChange(n, withCaps(c))
                }}
                onMoveUp={() => {
                  if (i === 0) return
                  const n = [...list]
                  ;[n[i - 1], n[i]] = [n[i], n[i - 1]]
                  const c = [...captions]
                  ;[c[i - 1], c[i]] = [c[i], c[i - 1]]
                  onChange(n, withCaps(c))
                }}
                onMoveDown={() => {
                  if (i >= list.length - 1) return
                  const n = [...list]
                  ;[n[i], n[i + 1]] = [n[i + 1], n[i]]
                  const c = [...captions]
                  ;[c[i], c[i + 1]] = [c[i + 1], c[i]]
                  onChange(n, withCaps(c))
                }}
              />
            ))}
            <button
              type="button"
              className="text-xs text-spd-red font-semibold hover:underline flex items-center gap-1"
              onClick={() => {
                onChange([...list, ''], withCaps([...captions, '']))
              }}
            >
              <Plus size={12} /> Bild hinzufügen
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </>
  )
}

interface ImageListItemProps {
  id: string
  url: string
  caption: string
  hasCaption: boolean
  index: number
  total: number
  onUrlChange: (v: string) => void
  onCaptionChange: (v: string) => void
  onUpload: (f: File) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function SortableImageListItem(props: ImageListItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: props.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'none',
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ImageListItem {...props} dragListeners={listeners} isDragging={isDragging} />
    </div>
  )
}

function ImageListItem({
  url,
  caption,
  hasCaption,
  index,
  total,
  onUrlChange,
  onCaptionChange,
  onUpload,
  onRemove,
  onMoveUp,
  onMoveDown,
  dragListeners,
  isDragging,
}: ImageListItemProps & {
  dragListeners?: Record<string, unknown>
  isDragging?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [showUrl, setShowUrl] = useState(!url)
  return (
    <div
      className={`bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${isDragging ? 'shadow-xl ring-2 ring-spd-red/30' : ''}`}
    >
      <div className="flex gap-3 items-start">
        {total > 1 && (
          <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
            <button
              type="button"
              {...dragListeners}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing transition-colors touch-none"
              title="Ziehen zum Sortieren"
            >
              <GripVertical size={14} />
            </button>
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-spd-red hover:bg-spd-red/10 disabled:opacity-25 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-all"
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              disabled={index >= total - 1}
              onClick={onMoveDown}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-spd-red hover:bg-spd-red/10 disabled:opacity-25 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-all"
            >
              <ArrowDown size={13} />
            </button>
          </div>
        )}
        {url ? (
          <img
            src={url}
            alt=""
            className="w-16 h-16 rounded-xl object-cover border border-gray-200/60 dark:border-gray-700/60 shrink-0 shadow-sm"
            onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:border-spd-red hover:text-spd-red transition-colors shrink-0"
          >
            <ImagePlus size={16} />
          </button>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="bg-spd-red/10 text-spd-red hover:bg-spd-red/15 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={10} /> {url ? 'Ersetzen' : 'Hochladen'}
            </button>
            <button
              type="button"
              className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1 px-2 py-1.5 rounded-lg"
              onClick={() => setShowUrl(v => !v)}
            >
              <LinkIcon size={10} /> URL
            </button>
            <button
              type="button"
              className="ml-auto text-[11px] text-red-400 hover:text-red-600 flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1.5 rounded-lg transition-colors"
              onClick={onRemove}
            >
              <X size={10} /> Entfernen
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) onUpload(e.target.files[0])
                e.target.value = ''
              }}
            />
          </div>
          {showUrl && (
            <input
              type="text"
              className={inputCls + ' font-mono text-xs'}
              placeholder="/images/..."
              value={url}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              onChange={e => onUrlChange(e.target.value)}
            />
          )}
        </div>
      </div>
      {hasCaption && (
        <input
          type="text"
          className={inputCls + ' mt-3'}
          placeholder="Bildunterschrift (optional)"
          value={caption}
          onChange={e => onCaptionChange(e.target.value)}
        />
      )}
    </div>
  )
}
