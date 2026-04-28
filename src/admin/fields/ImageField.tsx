import { useRef, useState } from 'react'
import { ImagePlus, Link as LinkIcon, Upload } from 'lucide-react'
import type { FieldConfig } from '../types'
import { useAdminStore } from '../store'
import CropOverlay from '../components/CropOverlay'
import { inputCls } from '../lib/inputCls'

interface Props {
  field: FieldConfig
  value: string
  onChange: (v: string) => void
  contextItem?: Record<string, unknown>
}

export default function ImageField({ field, value, onChange, contextItem }: Props) {
  const addPendingUpload = useAdminStore(s => s.addPendingUpload)
  const setStatus = useAdminStore(s => s.setStatus)
  const pendingUploads = useAdminStore(s => s.pendingUploads)

  // Returns the base64 data URI if this URL is a pending (not-yet-uploaded) image,
  // otherwise returns the URL itself. Fixes preview loss on component remount.
  const resolvePreview = (url: string) => {
    if (!url) return ''
    const match = pendingUploads.find(u => u.ghPath.replace(/^public/, '') === url)
    return match ? `data:image/webp;base64,${match.base64}` : url
  }

  const [preview, setPreview] = useState(() => resolvePreview(value || ''))
  const [cropFile, setCropFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showUrl, setShowUrl] = useState(!value)
  // Track the previous value as state so we can sync derived state when value
  // changes externally (undo / redo / item switch) without accessing a ref during render.
  const [prevValue, setPrevValue] = useState(value)
  // Tracks the URL of our own pending upload to avoid overwriting its local preview
  const [ownUploadUrl, setOwnUploadUrl] = useState<string | null>(null)

  // Sync preview and showUrl when value changes externally (undo / redo / item switch)
  if (prevValue !== value) {
    setPrevValue(value)
    if (value !== ownUploadUrl) {
      setPreview(resolvePreview(value || ''))
    } else {
      setOwnUploadUrl(null)
    }
    setShowUrl(!value)
  }

  const handleCrop = (base64: string | null) => {
    setCropFile(null)
    if (!base64) return
    // Always append a short timestamp to avoid filename collisions between
    // people with the same name in the same imageDir (e.g. two "Max Müller"s).
    const baseName = contextItem?.name
      ? String(contextItem.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      : 'bild'
    const nameSlug = `${baseName}-${Date.now()}`
    const imageDir = field.imageDir || 'news'
    const ghFilePath = `public/images/${imageDir}/${nameSlug}.webp`
    const publicUrl = `/images/${imageDir}/${nameSlug}.webp`
    setOwnUploadUrl(publicUrl)
    addPendingUpload({
      ghPath: ghFilePath,
      base64,
      message: `admin: Bild ${nameSlug}.webp hochgeladen`,
    })
    onChange(publicUrl)
    setPreview(`data:image/webp;base64,${base64}`)
    setStatus('Bild vorbereitet — wird beim Veröffentlichen hochgeladen', 'success')
  }

  return (
    <>
      {cropFile && <CropOverlay file={cropFile} onComplete={handleCrop} />}
      <div className="space-y-3">
        <div className="flex gap-3 items-start flex-wrap">
          {preview ? (
            <div className="relative group shrink-0">
              <img
                src={preview}
                alt=""
                className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-200/60 dark:border-gray-700/60 shadow-sm"
                onError={() => setPreview('')}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-2xl transition-all flex items-center justify-center text-transparent group-hover:text-white"
              >
                <Upload size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-spd-red hover:text-spd-red transition-colors shrink-0"
            >
              <ImagePlus size={18} />
              <span className="text-[9px] font-medium">Hochladen</span>
            </button>
          )}
          <div className="flex flex-col gap-2 flex-1 min-w-48">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs font-medium px-3 py-2 rounded-xl bg-spd-red/10 text-spd-red hover:bg-spd-red/15 transition-colors flex items-center gap-1.5 w-fit"
            >
              <Upload size={12} /> {preview ? 'Ersetzen' : 'Bild hochladen'}
            </button>
            <button
              type="button"
              onClick={() => setShowUrl(v => !v)}
              className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1 w-fit"
            >
              <LinkIcon size={10} /> {showUrl ? 'URL ausblenden' : 'URL manuell eingeben'}
            </button>
          </div>
        </div>
        {showUrl && (
          <input
            type="text"
            className={inputCls + ' font-mono text-xs'}
            placeholder="/images/... oder https://..."
            value={value || ''}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={e => {
              onChange(e.target.value)
              setPreview(e.target.value)
            }}
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) setCropFile(e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>
    </>
  )
}
