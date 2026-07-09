import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Check, Image as ImageIcon, X } from 'lucide-react'

interface Props {
  file: File
  onComplete: (base64: string | null) => void
}

export default function CropOverlay({ file, onComplete }: Props) {
  const [imgSrc, setImgSrc] = useState('')
  const [loadError, setLoadError] = useState(false)
  const [encodeError, setEncodeError] = useState(false)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imgRef = useRef<HTMLImageElement>(null)

  // Lock body scroll
  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = orig
    }
  }, [])

  // Load file as data URL
  useEffect(() => {
    const reader = new FileReader()
    reader.onload = e => setImgSrc(e.target?.result as string)
    reader.onerror = () => setLoadError(true)
    reader.readAsDataURL(file)
    return () => reader.abort()
  }, [file])

  // Default to full-image selection once the img element is measured
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const initial: PixelCrop = { unit: 'px', x: 0, y: 0, width, height }
    setCrop(initial)
    setCompletedCrop(initial)
  }, [])

  const exportCrop = useCallback(() => {
    const img = imgRef.current
    if (!img || !completedCrop) return
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(completedCrop.width * scaleX))
    canvas.height = Math.max(1, Math.round(completedCrop.height * scaleY))
    canvas
      .getContext('2d')!
      .drawImage(
        img,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      )
    const dataUrl = canvas.toDataURL('image/webp', 0.9)
    // Browsers without WebP canvas encoding (e.g. older Safari) silently fall
    // back to PNG — committing that as a .webp file would serve a mislabelled
    // image forever, so refuse instead.
    if (!dataUrl.startsWith('data:image/webp')) {
      setEncodeError(true)
      return
    }
    onComplete(dataUrl.split(',')[1])
  }, [completedCrop, onComplete])

  const canExport = (completedCrop?.width ?? 0) > 0 && (completedCrop?.height ?? 0) > 0

  return createPortal(
    <div className="fixed inset-0 z-9999 bg-black/95 flex flex-col select-none">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-white">
          <ImageIcon size={16} className="opacity-70 hidden sm:block" />
          <span className="text-xs sm:text-sm font-semibold">Bildausschnitt wählen</span>
        </div>
        <button
          type="button"
          onClick={() => onComplete(null)}
          aria-label="Schließen"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Stage */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#111]">
        {loadError || encodeError ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center px-6">
            <ImageIcon size={40} className="text-white/20" />
            <p className="text-white/80 text-sm font-semibold">
              {encodeError
                ? 'Dein Browser kann Bilder nicht als WebP speichern.'
                : 'Dieses Bildformat wird nicht unterstützt.'}
            </p>
            <p className="text-white/45 text-xs">
              {encodeError
                ? 'Bitte verwende einen aktuellen Browser (z. B. Chrome, Firefox oder Safari 17+).'
                : 'Bitte verwende JPG, PNG, WebP oder GIF.'}
            </p>
            <button
              type="button"
              onClick={() => onComplete(null)}
              className="mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            >
              Schließen
            </button>
          </div>
        ) : imgSrc ? (
          <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
            <img
              ref={imgRef}
              src={imgSrc}
              alt=""
              onLoad={onImageLoad}
              onError={() => setLoadError(true)}
              style={{ maxHeight: 'calc(100dvh - 130px)', maxWidth: '100%', display: 'block' }}
            />
          </ReactCrop>
        ) : null}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-end gap-2 px-3 py-2.5 sm:px-6 sm:py-4 border-t border-white/10 bg-black/50">
        <button
          type="button"
          onClick={() => onComplete(null)}
          aria-label="Abbrechen"
          className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm transition-colors"
        >
          Abbrechen
        </button>
        {!loadError && !encodeError && (
          <button
            type="button"
            onClick={exportCrop}
            disabled={!canExport}
            className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-linear-to-r from-spd-red to-spd-red-dark text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-spd-red/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={14} /> Zuschneiden
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
