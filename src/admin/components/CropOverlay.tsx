import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Image as ImageIcon, Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react'

interface Props {
  file: File
  onComplete: (base64: string | null) => void
}

type HitType = 'none' | 'move' | 'pan' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l'

const HANDLE_HIT = 24
const MIN_CROP = 20
const EDGE_PADDING = 32

// Loupe settings
const LOUPE_SIZE = 120 // px diameter of the magnifier circle
const LOUPE_ZOOM = 3 // magnification factor inside loupe
const LOUPE_OFFSET_Y = -80 // px offset above the finger

export default function CropOverlay({ file, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [baseSize, setBaseSize] = useState({ w: 0, h: 0 })
  const [containerDims, setContainerDims] = useState({ w: 0, h: 0 })
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 })
  // Cursor is tracked as state because dragType is a ref and doesn't trigger re-renders
  const [cursor, setCursor] = useState<string>('crosshair')

  // dragType must be declared before the zoom-sync effect that reads it
  const dragType = useRef<HitType>('none')

  // Keep cursor in sync with zoom when not mid-drag
  useEffect(() => {
    if (dragType.current === 'none') {
      setCursor(zoom > 1 ? 'grab' : 'crosshair')
    }
  }, [zoom])

  // Loupe state: visible + screen position
  const [loupe, setLoupe] = useState<{
    visible: boolean
    screenX: number
    screenY: number
    baseX: number
    baseY: number
  }>({
    visible: false,
    screenX: 0,
    screenY: 0,
    baseX: 0,
    baseY: 0,
  })

  const zoomRef = useRef(1)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  const panRef = useRef({ x: 0, y: 0 })
  useEffect(() => {
    panRef.current = pan
  }, [pan])
  const baseSizeRef = useRef({ w: 0, h: 0 })
  useEffect(() => {
    baseSizeRef.current = baseSize
  }, [baseSize])

  const dragStart = useRef({ x: 0, y: 0 })
  const cropStart = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const screenStart = useRef({ clientX: 0, clientY: 0 })

  const pinchRef = useRef<{
    dist: number
    zoom: number
    pan: { x: number; y: number }
    midClient: { x: number; y: number }
  } | null>(null)
  const pointers = useRef(new Map<number, { clientX: number; clientY: number }>())

  // Draw loupe content whenever it's visible
  useEffect(() => {
    if (!loupe.visible) return
    const loupeCanvas = loupeCanvasRef.current
    const img = imgRef.current
    if (!loupeCanvas || !img || baseSize.w === 0) return
    const ctx = loupeCanvas.getContext('2d')!
    const size = LOUPE_SIZE * (window.devicePixelRatio || 1)
    loupeCanvas.width = size
    loupeCanvas.height = size
    ctx.clearRect(0, 0, size, size)

    // Draw circular clip
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()

    // Map base coords to source image coords
    const scale = img.width / baseSize.w
    const srcX = loupe.baseX * scale
    const srcY = loupe.baseY * scale
    // How many source pixels fit in the loupe
    const srcRadius = (LOUPE_SIZE / 2 / LOUPE_ZOOM) * scale
    ctx.drawImage(
      img,
      srcX - srcRadius,
      srcY - srcRadius,
      srcRadius * 2,
      srcRadius * 2,
      0,
      0,
      size,
      size,
    )

    // Draw crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(size / 2, 0)
    ctx.lineTo(size / 2, size)
    ctx.moveTo(0, size / 2)
    ctx.lineTo(size, size / 2)
    ctx.stroke()

    // Draw crop edge line based on drag type
    ctx.strokeStyle = 'rgba(227,6,19,0.9)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    const dt = dragType.current
    if (dt === 't' || dt === 'b' || dt === 'tl' || dt === 'tr' || dt === 'bl' || dt === 'br') {
      ctx.beginPath()
      ctx.moveTo(0, size / 2)
      ctx.lineTo(size, size / 2)
      ctx.stroke()
    }
    if (dt === 'l' || dt === 'r' || dt === 'tl' || dt === 'tr' || dt === 'bl' || dt === 'br') {
      ctx.beginPath()
      ctx.moveTo(size / 2, 0)
      ctx.lineTo(size / 2, size)
      ctx.stroke()
    }

    ctx.restore()
  }, [loupe, baseSize])

  // Lock body scroll
  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = orig
    }
  }, [])

  const layoutToFit = (img: HTMLImageElement) => {
    const container = containerRef.current
    if (!container) return
    const cw = container.clientWidth
    const ch = container.clientHeight
    setContainerDims({ w: cw, h: ch })
    const availW = cw - EDGE_PADDING * 2
    const availH = ch - EDGE_PADDING * 2
    const s = Math.min(availW / img.width, availH / img.height, 1)
    const bw = Math.round(img.width * s)
    const bh = Math.round(img.height * s)
    setBaseSize({ w: bw, h: bh })
    const canvas = canvasRef.current!
    canvas.width = bw
    canvas.height = bh
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, bw, bh)
    ctx.drawImage(img, 0, 0, bw, bh)
    setZoom(1)
    setPan({ x: Math.round((cw - bw) / 2), y: Math.round((ch - bh) / 2) })
    setCrop({ x: 0, y: 0, w: bw, h: bh })
    setCursor('crosshair')
  }

  // Load image & set initial fit (resize if too large)
  useEffect(() => {
    let cancelled = false
    const MAX_PX = 1920
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      // Downscale large images before cropping
      if (img.width > MAX_PX || img.height > MAX_PX) {
        const scale = Math.min(MAX_PX / img.width, MAX_PX / img.height)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const offscreen = document.createElement('canvas')
        offscreen.width = w
        offscreen.height = h
        offscreen.getContext('2d')!.drawImage(img, 0, 0, w, h)
        const resized = new Image()
        resized.onload = () => {
          if (cancelled) return
          imgRef.current = resized
          setImgNaturalSize({ w: resized.width, h: resized.height })
          layoutToFit(resized)
          setReady(true)
        }
        resized.src = offscreen.toDataURL('image/png')
      } else {
        imgRef.current = img
        setImgNaturalSize({ w: img.width, h: img.height })
        layoutToFit(img)
        setReady(true)
      }
    }
    const url = URL.createObjectURL(file)
    img.src = url
    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
    }
  }, [file])

  // Re-fit on resize
  useEffect(() => {
    const onResize = () => {
      if (imgRef.current) layoutToFit(imgRef.current)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  const clientToBase = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const x = (clientX - rect.left) / zoom
      const y = (clientY - rect.top) / zoom
      return { x, y }
    },
    [zoom],
  )

  const hitTest = useCallback(
    (bx: number, by: number): HitType => {
      const hs = HANDLE_HIT / zoom
      const { x, y, w, h } = crop
      const near = (ax: number, ay: number, px: number, py: number) =>
        Math.abs(ax - px) < hs && Math.abs(ay - py) < hs
      if (near(bx, by, x, y)) return 'tl'
      if (near(bx, by, x + w, y)) return 'tr'
      if (near(bx, by, x, y + h)) return 'bl'
      if (near(bx, by, x + w, y + h)) return 'br'
      if (near(bx, by, x + w / 2, y)) return 't'
      if (near(bx, by, x + w / 2, y + h)) return 'b'
      if (near(bx, by, x, y + h / 2)) return 'l'
      if (near(bx, by, x + w, y + h / 2)) return 'r'
      if (bx > x && bx < x + w && by > y && by < y + h) return 'move'
      return 'none'
    },
    [crop, zoom],
  )

  const zoomAtClient = (clientX: number, clientY: number, newZoom: number) => {
    const container = containerRef.current!
    const cRect = container.getBoundingClientRect()
    const base = clientToBase(clientX, clientY)
    const nz = Math.max(1, Math.min(8, newZoom))
    setZoom(nz)
    setPan({
      x: clientX - cRect.left - base.x * nz,
      y: clientY - cRect.top - base.y * nz,
    })
  }

  const clampPan = useCallback(
    (p: { x: number; y: number }, z = zoom) => {
      const container = containerRef.current
      if (!container) return p
      const cw = container.clientWidth
      const ch = container.clientHeight
      const iw = baseSize.w * z
      const ih = baseSize.h * z
      const margin = 64
      return {
        x: Math.max(-iw + margin, Math.min(cw - margin, p.x)),
        y: Math.max(-ih + margin, Math.min(ch - margin, p.y)),
      }
    },
    [baseSize, zoom],
  )

  const clampCrop = useCallback(
    (c: { x: number; y: number; w: number; h: number }) => {
      let { x, y, w, h } = c
      w = Math.max(MIN_CROP, w)
      h = Math.max(MIN_CROP, h)
      x = Math.max(0, x)
      y = Math.max(0, y)
      w = Math.min(w, baseSize.w - x)
      h = Math.min(h, baseSize.h - y)
      if (w < MIN_CROP) {
        x = Math.max(0, baseSize.w - MIN_CROP)
        w = Math.min(MIN_CROP, baseSize.w - x)
      }
      if (h < MIN_CROP) {
        y = Math.max(0, baseSize.h - MIN_CROP)
        h = Math.min(MIN_CROP, baseSize.h - y)
      }
      return { x, y, w, h }
    },
    [baseSize],
  )

  // Compute the base-pixel coordinate of the active handle edge
  const getHandleBasePos = useCallback(
    (type: HitType, c: { x: number; y: number; w: number; h: number }) => {
      let bx = c.x,
        by = c.y
      if (type.includes('r')) bx = c.x + c.w
      else if (!type.includes('l')) bx = c.x + c.w / 2
      if (type.includes('b')) by = c.y + c.h
      else if (!type.includes('t')) by = c.y + c.h / 2
      return { bx, by }
    },
    [],
  )

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const midClient = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
      pinchRef.current = { dist, zoom, pan: { ...pan }, midClient }
      dragType.current = 'none'
      setLoupe(prev => ({ ...prev, visible: false }))
      return
    }

    const base = clientToBase(e.clientX, e.clientY)
    const hit = hitTest(base.x, base.y)
    dragStart.current = base
    screenStart.current = { clientX: e.clientX, clientY: e.clientY }
    cropStart.current = { ...crop }
    panStart.current = { ...pan }

    if (hit === 'none') {
      if (e.pointerType !== 'mouse' || zoom > 1.02) {
        dragType.current = 'pan'
        setCursor('grabbing')
      } else {
        dragType.current = 'br'
        setCrop({ x: base.x, y: base.y, w: 0, h: 0 })
      }
    } else if (hit === 'move') {
      dragType.current = hit
      setCursor('move')
    } else {
      // It's a handle drag — show loupe
      dragType.current = hit
      const container = containerRef.current
      if (container) {
        const cRect = container.getBoundingClientRect()
        const { bx, by } = getHandleBasePos(hit, crop)
        setLoupe({
          visible: true,
          screenX: e.clientX - cRect.left,
          screenY: e.clientY - cRect.top,
          baseX: bx,
          baseY: by,
        })
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })

    if (pointers.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const ratio = dist / pinchRef.current.dist
      const nz = Math.max(1, Math.min(8, pinchRef.current.zoom * ratio))
      const container = containerRef.current!
      const cRect = container.getBoundingClientRect()
      const midClient = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
      const startBase = {
        x:
          (pinchRef.current.midClient.x - cRect.left - pinchRef.current.pan.x) /
          pinchRef.current.zoom,
        y:
          (pinchRef.current.midClient.y - cRect.top - pinchRef.current.pan.y) /
          pinchRef.current.zoom,
      }
      setZoom(nz)
      setPan(
        clampPan(
          {
            x: midClient.x - cRect.left - startBase.x * nz,
            y: midClient.y - cRect.top - startBase.y * nz,
          },
          nz,
        ),
      )
      return
    }

    if (dragType.current === 'none') return

    if (dragType.current === 'pan') {
      setPan(
        clampPan({
          x: panStart.current.x + (e.clientX - screenStart.current.clientX),
          y: panStart.current.y + (e.clientY - screenStart.current.clientY),
        }),
      )
      return
    }

    const base = clientToBase(e.clientX, e.clientY)
    const dx = base.x - dragStart.current.x
    const dy = base.y - dragStart.current.y
    const cs = cropStart.current

    let newCrop: { x: number; y: number; w: number; h: number }
    if (dragType.current === 'move') {
      newCrop = clampCrop({ x: cs.x + dx, y: cs.y + dy, w: cs.w, h: cs.h })
    } else {
      let nx = cs.x,
        ny = cs.y,
        nw = cs.w,
        nh = cs.h
      if (dragType.current.includes('r')) nw = cs.w + dx
      if (dragType.current.includes('l')) {
        nx = cs.x + dx
        nw = cs.w - dx
      }
      if (dragType.current.includes('b')) nh = cs.h + dy
      if (dragType.current.includes('t')) {
        ny = cs.y + dy
        nh = cs.h - dy
      }
      newCrop = clampCrop({ x: nx, y: ny, w: nw, h: nh })
    }
    setCrop(newCrop)

    // Update loupe for handle drags (not move)
    if (dragType.current !== 'move') {
      const container = containerRef.current
      if (container) {
        const cRect = container.getBoundingClientRect()
        const { bx, by } = getHandleBasePos(dragType.current, newCrop)
        setLoupe({
          visible: true,
          screenX: e.clientX - cRect.left,
          screenY: e.clientY - cRect.top,
          baseX: bx,
          baseY: by,
        })
      }
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchRef.current = null
    if (pointers.current.size === 0) {
      dragType.current = 'none'
      setCursor(zoomRef.current > 1 ? 'grab' : 'crosshair')
      setLoupe(prev => ({ ...prev, visible: false }))
    }
  }

  // Non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const currentZoom = zoomRef.current
      const factor = Math.exp(-e.deltaY / 300)
      const newZoom = Math.max(1, Math.min(8, currentZoom * factor))
      const canvasRect = canvas.getBoundingClientRect()
      const baseX = (e.clientX - canvasRect.left) / currentZoom
      const baseY = (e.clientY - canvasRect.top) / currentZoom
      const cRect = el.getBoundingClientRect()
      setZoom(newZoom)
      setPan({
        x: e.clientX - cRect.left - baseX * newZoom,
        y: e.clientY - cRect.top - baseY * newZoom,
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const onDoubleClick = (e: React.MouseEvent) => {
    zoomAtClient(e.clientX, e.clientY, zoom > 1.5 ? 1 : 2.5)
  }

  const exportCrop = () => {
    const img = imgRef.current!
    const out = document.createElement('canvas')
    const scale = img.width / baseSize.w
    const rx = crop.x * scale
    const ry = crop.y * scale
    const rw = crop.w * scale
    const rh = crop.h * scale
    out.width = Math.max(1, Math.round(rw))
    out.height = Math.max(1, Math.round(rh))
    out.getContext('2d')!.drawImage(img, rx, ry, rw, rh, 0, 0, out.width, out.height)
    onComplete(out.toDataURL('image/webp', 0.9).split(',')[1])
  }

  // Derived screen geometry for overlay
  const screenCrop = {
    x: pan.x + crop.x * zoom,
    y: pan.y + crop.y * zoom,
    w: crop.w * zoom,
    h: crop.h * zoom,
  }

  // All 8 handles: 4 corners + 4 edge midpoints
  const handles: {
    key: HitType
    left?: number | string
    right?: number | string
    top?: number | string
    bottom?: number | string
  }[] = [
    { key: 'tl', left: -8, top: -8 },
    { key: 'tr', right: -8, top: -8 },
    { key: 'bl', left: -8, bottom: -8 },
    { key: 'br', right: -8, bottom: -8 },
    { key: 't', left: '50%', top: -8 },
    { key: 'b', left: '50%', bottom: -8 },
    { key: 'l', left: -8, top: '50%' },
    { key: 'r', right: -8, top: '50%' },
  ]

  // Compute loupe position (offset above finger, clamped to stage)
  const loupeStyle = (() => {
    if (!loupe.visible || containerDims.w === 0) return { display: 'none' } as React.CSSProperties
    const { w: cw, h: ch } = containerDims
    let lx = loupe.screenX - LOUPE_SIZE / 2
    let ly = loupe.screenY + LOUPE_OFFSET_Y - LOUPE_SIZE / 2
    // If loupe would go above the stage, show it below the finger instead
    if (ly < 4) ly = loupe.screenY + 60 - LOUPE_SIZE / 2
    // Clamp horizontally
    lx = Math.max(4, Math.min(cw - LOUPE_SIZE - 4, lx))
    ly = Math.max(4, Math.min(ch - LOUPE_SIZE - 4, ly))
    return {
      left: lx,
      top: ly,
      width: LOUPE_SIZE,
      height: LOUPE_SIZE,
    } as React.CSSProperties
  })()

  return createPortal(
    <div className="fixed inset-0 z-9999 bg-black/95 flex flex-col touch-none select-none">
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
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-[#111]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        style={{ touchAction: 'none', cursor }}
      >
        {/* Image / canvas */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 origin-top-left will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            imageRendering: zoom > 2 ? 'pixelated' : 'auto',
          }}
        />
        {/* Dim overlay */}
        {ready && baseSize.w > 0 && (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute bg-black/60"
                style={{ left: 0, top: 0, right: 0, height: Math.max(0, screenCrop.y) }}
              />
              <div
                className="absolute bg-black/60"
                style={{ left: 0, top: screenCrop.y + screenCrop.h, right: 0, bottom: 0 }}
              />
              <div
                className="absolute bg-black/60"
                style={{
                  left: 0,
                  top: screenCrop.y,
                  width: Math.max(0, screenCrop.x),
                  height: Math.max(0, screenCrop.h),
                }}
              />
              <div
                className="absolute bg-black/60"
                style={{
                  left: screenCrop.x + screenCrop.w,
                  top: screenCrop.y,
                  right: 0,
                  height: Math.max(0, screenCrop.h),
                }}
              />
            </div>
            {/* Crop frame */}
            <div
              className="absolute border-2 border-spd-red pointer-events-none"
              style={{
                left: screenCrop.x,
                top: screenCrop.y,
                width: Math.max(0, screenCrop.w),
                height: Math.max(0, screenCrop.h),
              }}
            >
              {/* Rule-of-thirds guides */}
              <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.35 }}>
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
              </div>
              {/* All 8 handles */}
              {handles.map(h => (
                <span
                  key={h.key}
                  className="absolute w-4 h-4 bg-spd-red rounded-sm shadow ring-2 ring-white pointer-events-none"
                  style={{
                    left: h.left !== undefined ? h.left : undefined,
                    right: h.right !== undefined ? h.right : undefined,
                    top: h.top !== undefined ? h.top : undefined,
                    bottom: h.bottom !== undefined ? h.bottom : undefined,
                    transform:
                      typeof h.left === 'string' || typeof h.top === 'string'
                        ? `translate(${typeof h.left === 'string' ? '-50%' : '0'}, ${typeof h.top === 'string' ? '-50%' : '0'})`
                        : undefined,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Magnifier loupe */}
        <div
          className="absolute pointer-events-none rounded-full border-2 border-white shadow-2xl shadow-black/60 overflow-hidden"
          style={{
            ...loupeStyle,
            opacity: loupe.visible ? 1 : 0,
            transition: 'opacity 0.15s ease',
          }}
        >
          <canvas
            ref={loupeCanvasRef}
            className="w-full h-full"
            style={{ imageRendering: 'auto' }}
          />
        </div>

        {/* Zoom controls (floating) */}
        <div className="absolute right-2 top-2 sm:right-3 sm:top-3 flex flex-col gap-1 rounded-2xl bg-black/60 backdrop-blur border border-white/10 p-1">
          <button
            type="button"
            aria-label="Vergrößern"
            onClick={() => {
              const c = containerRef.current!
              const r = c.getBoundingClientRect()
              zoomAtClient(r.left + r.width / 2, r.top + r.height / 2, zoom * 1.25)
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-white hover:bg-white/15 flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="Verkleinern"
            onClick={() => {
              const c = containerRef.current!
              const r = c.getBoundingClientRect()
              zoomAtClient(r.left + r.width / 2, r.top + r.height / 2, zoom / 1.25)
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-white hover:bg-white/15 flex items-center justify-center"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            aria-label="Zoom zurücksetzen"
            onClick={() => imgRef.current && layoutToFit(imgRef.current)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-white hover:bg-white/15 flex items-center justify-center"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Reset crop */}
        <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
          <button
            type="button"
            onClick={() => setCrop({ x: 0, y: 0, w: baseSize.w, h: baseSize.h })}
            className="px-2.5 sm:px-3 h-8 sm:h-9 rounded-xl bg-black/60 backdrop-blur border border-white/10 text-white text-[10px] sm:text-xs font-medium hover:bg-white/15 flex items-center gap-1.5"
          >
            <RotateCcw size={12} /> <span className="hidden sm:inline">Alles</span> auswählen
          </button>
        </div>

        {/* Hint */}
        {ready && zoom <= 1.02 && (
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 text-white/70 text-[10px] sm:text-[11px] bg-black/50 backdrop-blur px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full pointer-events-none whitespace-nowrap max-w-[calc(100%-1rem)] truncate">
            Ecken ziehen · zum Zoomen pinch / Mausrad · Doppelklick zoomt
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-4 border-t border-white/10 bg-black/50">
        <div className="text-[10px] sm:text-[11px] text-white/60 tabular-nums">
          {Math.round((crop.w * imgNaturalSize.w) / (baseSize.w || 1))} ×{' '}
          {Math.round((crop.h * imgNaturalSize.h) / (baseSize.h || 1))} px ·{' '}
          {Math.round(zoom * 100)}%
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onComplete(null)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => exportCrop()}
            className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-linear-to-r from-spd-red to-spd-red-dark text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-spd-red/25"
          >
            <Check size={14} /> Zuschneiden
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
