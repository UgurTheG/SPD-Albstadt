import {useCallback, useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {Check, Image as ImageIcon, Maximize2, Minus, Plus, RotateCcw, X} from 'lucide-react'

interface Props {
    file: File
    onComplete: (base64: string | null) => void
}

type HitType = 'none' | 'new' | 'move' | 'pan' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l'

const HANDLE_HIT = 24 // px on screen for easier touch targets
const MIN_CROP = 20 // min crop size in base (fit) pixels
const EDGE_PADDING = 32 // px padding around image so edge handles are reachable
const AUTO_ZOOM_SPEED = 0.008 // zoom increment per pointer-move during handle drag
const AUTO_ZOOM_EDGE = 60 // px from screen edge to trigger auto-zoom

export default function CropOverlay({file, onComplete}: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)

    const [ready, setReady] = useState(false)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({x: 0, y: 0})
    // Crop is in "base canvas pixel" space (canvas is drawn at fit-scale).
    const [crop, setCrop] = useState({x: 0, y: 0, w: 0, h: 0})
    const [baseSize, setBaseSize] = useState({w: 0, h: 0})

    const zoomRef = useRef(1)
    useEffect(() => { zoomRef.current = zoom }, [zoom])
    const panRef = useRef({x: 0, y: 0})
    useEffect(() => { panRef.current = pan }, [pan])
    const baseSizeRef = useRef({w: 0, h: 0})
    useEffect(() => { baseSizeRef.current = baseSize }, [baseSize])

    // Interaction refs (avoid re-rendering on every move)
    const dragType = useRef<HitType>('none')
    const dragStart = useRef({x: 0, y: 0}) // canvas-pixel coords
    const cropStart = useRef({x: 0, y: 0, w: 0, h: 0})
    const panStart = useRef({x: 0, y: 0})
    const screenStart = useRef({clientX: 0, clientY: 0})

    // Pinch
    const pinchRef = useRef<{
        dist: number; zoom: number; pan: { x: number; y: number }; midClient: { x: number; y: number }
    } | null>(null)
    const pointers = useRef(new Map<number, { clientX: number; clientY: number }>())

    // Lock body scroll
    useEffect(() => {
        const orig = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = orig
        }
    }, [])

    // Load image & set initial fit
    useEffect(() => {
        const img = new Image()
        img.onload = () => {
            imgRef.current = img
            layoutToFit(img)
            setReady(true)
        }
        const url = URL.createObjectURL(file)
        img.src = url
        return () => URL.revokeObjectURL(url)
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const layoutToFit = (img: HTMLImageElement) => {
        const container = containerRef.current
        if (!container) return
        const cw = container.clientWidth
        const ch = container.clientHeight
        // Reserve padding so edge handles are always reachable
        const availW = cw - EDGE_PADDING * 2
        const availH = ch - EDGE_PADDING * 2
        const s = Math.min(availW / img.width, availH / img.height, 1)
        const bw = Math.round(img.width * s)
        const bh = Math.round(img.height * s)
        setBaseSize({w: bw, h: bh})
        const canvas = canvasRef.current!
        canvas.width = bw
        canvas.height = bh
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, bw, bh)
        ctx.drawImage(img, 0, 0, bw, bh)
        setZoom(1)
        setPan({x: Math.round((cw - bw) / 2), y: Math.round((ch - bh) / 2)})
        setCrop({x: 0, y: 0, w: bw, h: bh})
    }

    // Convert client (screen) coords to base canvas coords
    const clientToBase = useCallback((clientX: number, clientY: number) => {
        const canvas = canvasRef.current!
        const rect = canvas.getBoundingClientRect()
        const x = (clientX - rect.left) / zoom
        const y = (clientY - rect.top) / zoom
        return {x, y}
    }, [zoom])

    const hitTest = useCallback((bx: number, by: number): HitType => {
        const hs = HANDLE_HIT / zoom // in base px
        const {x, y, w, h} = crop
        const near = (ax: number, ay: number, px: number, py: number) =>
            Math.abs(ax - px) < hs && Math.abs(ay - py) < hs
        // Corners first (priority)
        if (near(bx, by, x, y)) return 'tl'
        if (near(bx, by, x + w, y)) return 'tr'
        if (near(bx, by, x, y + h)) return 'bl'
        if (near(bx, by, x + w, y + h)) return 'br'
        // Edge midpoints
        if (near(bx, by, x + w / 2, y)) return 't'
        if (near(bx, by, x + w / 2, y + h)) return 'b'
        if (near(bx, by, x, y + h / 2)) return 'l'
        if (near(bx, by, x + w, y + h / 2)) return 'r'
        // Inside crop area
        if (bx > x && bx < x + w && by > y && by < y + h) return 'move'
        return 'none'
    }, [crop, zoom])

    // Zoom centered at a client point
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

    // Auto-zoom toward handle when dragging near screen edge
    const autoZoomForHandle = useCallback((clientX: number, clientY: number) => {
        const container = containerRef.current
        if (!container) return
        const cRect = container.getBoundingClientRect()
        const distLeft = clientX - cRect.left
        const distRight = cRect.right - clientX
        const distTop = clientY - cRect.top
        const distBottom = cRect.bottom - clientY
        const minDist = Math.min(distLeft, distRight, distTop, distBottom)
        if (minDist > AUTO_ZOOM_EDGE) return // not near edge
        const currentZoom = zoomRef.current
        if (currentZoom >= 8) return
        const factor = 1 + AUTO_ZOOM_SPEED * (1 - minDist / AUTO_ZOOM_EDGE)
        const nz = Math.min(8, currentZoom * factor)
        // Zoom centered on the pointer so the handle stays under the finger
        const currentPan = panRef.current
        const bs = baseSizeRef.current
        const baseX = (clientX - cRect.left - currentPan.x) / currentZoom
        const baseY = (clientY - cRect.top - currentPan.y) / currentZoom
        const newPanX = clientX - cRect.left - baseX * nz
        const newPanY = clientY - cRect.top - baseY * nz
        // Clamp pan
        const cw = container.clientWidth
        const ch = container.clientHeight
        const iw = bs.w * nz
        const ih = bs.h * nz
        const margin = 64
        setZoom(nz)
        setPan({
            x: Math.max(-iw + margin, Math.min(cw - margin, newPanX)),
            y: Math.max(-ih + margin, Math.min(ch - margin, newPanY)),
        })
    }, [])

    // Prevent pan going too far offscreen
    const clampPan = useCallback((p: { x: number; y: number }, z = zoom) => {
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
    }, [baseSize, zoom])

    // Clamp crop rect to valid bounds (no negatives, within image)
    const clampCrop = useCallback((c: {x: number, y: number, w: number, h: number}) => {
        let {x, y, w, h} = c
        // Ensure minimum size
        w = Math.max(MIN_CROP, w)
        h = Math.max(MIN_CROP, h)
        // Clamp position
        x = Math.max(0, x)
        y = Math.max(0, y)
        // Clamp size to not exceed image bounds
        w = Math.min(w, baseSize.w - x)
        h = Math.min(h, baseSize.h - y)
        // If clamping size pushed it below min, adjust position
        if (w < MIN_CROP) { x = Math.max(0, baseSize.w - MIN_CROP); w = Math.min(MIN_CROP, baseSize.w - x) }
        if (h < MIN_CROP) { y = Math.max(0, baseSize.h - MIN_CROP); h = Math.min(MIN_CROP, baseSize.h - y) }
        return {x, y, w, h}
    }, [baseSize])

    // Unified pointer handlers
    const onPointerDown = (e: React.PointerEvent) => {
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        pointers.current.set(e.pointerId, {clientX: e.clientX, clientY: e.clientY})

        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()]
            const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
            const midClient = {x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2}
            pinchRef.current = {dist, zoom, pan: {...pan}, midClient}
            dragType.current = 'none'
            return
        }

        const base = clientToBase(e.clientX, e.clientY)
        const hit = hitTest(base.x, base.y)
        dragStart.current = base
        screenStart.current = {clientX: e.clientX, clientY: e.clientY}
        cropStart.current = {...crop}
        panStart.current = {...pan}

        if (hit === 'none') {
            if (e.pointerType !== 'mouse' || zoom > 1.02) {
                dragType.current = 'pan'
            } else {
                dragType.current = 'br'
                setCrop({x: base.x, y: base.y, w: 0, h: 0})
            }
        } else {
            dragType.current = hit
        }
    }

    const onPointerMove = (e: React.PointerEvent) => {
        if (!pointers.current.has(e.pointerId)) return
        pointers.current.set(e.pointerId, {clientX: e.clientX, clientY: e.clientY})

        // Pinch-zoom handling
        if (pointers.current.size === 2 && pinchRef.current) {
            const [a, b] = [...pointers.current.values()]
            const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
            const ratio = dist / pinchRef.current.dist
            const nz = Math.max(1, Math.min(8, pinchRef.current.zoom * ratio))
            const container = containerRef.current!
            const cRect = container.getBoundingClientRect()
            const midClient = {x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2}
            const startBase = {
                x: (pinchRef.current.midClient.x - cRect.left - pinchRef.current.pan.x) / pinchRef.current.zoom,
                y: (pinchRef.current.midClient.y - cRect.top - pinchRef.current.pan.y) / pinchRef.current.zoom,
            }
            setZoom(nz)
            setPan(clampPan({
                x: midClient.x - cRect.left - startBase.x * nz,
                y: midClient.y - cRect.top - startBase.y * nz,
            }, nz))
            return
        }

        if (dragType.current === 'none') return

        if (dragType.current === 'pan') {
            setPan(clampPan({
                x: panStart.current.x + (e.clientX - screenStart.current.clientX),
                y: panStart.current.y + (e.clientY - screenStart.current.clientY),
            }))
            return
        }

        // Handle or move drag — auto-zoom when near edge
        const isHandleDrag = dragType.current !== 'move'
        if (isHandleDrag) {
            autoZoomForHandle(e.clientX, e.clientY)
        }

        const base = clientToBase(e.clientX, e.clientY)
        const dx = base.x - dragStart.current.x
        const dy = base.y - dragStart.current.y
        const cs = cropStart.current

        if (dragType.current === 'move') {
            setCrop(clampCrop({
                x: cs.x + dx,
                y: cs.y + dy,
                w: cs.w, h: cs.h,
            }))
        } else {
            let nx = cs.x, ny = cs.y, nw = cs.w, nh = cs.h
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
            setCrop(clampCrop({x: nx, y: ny, w: nw, h: nh}))
        }
    }

    const onPointerUp = (e: React.PointerEvent) => {
        pointers.current.delete(e.pointerId)
        if (pointers.current.size < 2) pinchRef.current = null
        if (pointers.current.size === 0) dragType.current = 'none'
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
        el.addEventListener('wheel', handler, {passive: false})
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
    const handles: { key: HitType; left?: number | string; right?: number | string; top?: number | string; bottom?: number | string; cursor: string }[] = [
        {key: 'tl', left: -8, top: -8, cursor: 'nwse-resize'},
        {key: 'tr', right: -8, top: -8, cursor: 'nesw-resize'},
        {key: 'bl', left: -8, bottom: -8, cursor: 'nesw-resize'},
        {key: 'br', right: -8, bottom: -8, cursor: 'nwse-resize'},
        {key: 't', left: '50%', top: -8, cursor: 'ns-resize'},
        {key: 'b', left: '50%', bottom: -8, cursor: 'ns-resize'},
        {key: 'l', left: -8, top: '50%', cursor: 'ew-resize'},
        {key: 'r', right: -8, top: '50%', cursor: 'ew-resize'},
    ]

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] bg-black/95 flex flex-col touch-none select-none"
        >
            {/* Header */}
            <div
                className="shrink-0 flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-white">
                    <ImageIcon size={16} className="opacity-70 hidden sm:block"/>
                    <span className="text-xs sm:text-sm font-semibold">Bildausschnitt wählen</span>
                </div>
                <button type="button"
                        onClick={() => onComplete(null)}
                        aria-label="Schließen"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
                    <X size={16}/>
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
                style={{touchAction: 'none', cursor: dragType.current === 'pan' ? 'grabbing' : zoom > 1 ? 'grab' : 'crosshair'}}
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
                            <div className="absolute bg-black/60"
                                 style={{left: 0, top: 0, right: 0, height: Math.max(0, screenCrop.y)}}/>
                            <div className="absolute bg-black/60"
                                 style={{left: 0, top: screenCrop.y + screenCrop.h, right: 0, bottom: 0}}/>
                            <div className="absolute bg-black/60"
                                 style={{
                                     left: 0,
                                     top: screenCrop.y,
                                     width: Math.max(0, screenCrop.x),
                                     height: Math.max(0, screenCrop.h)
                                 }}/>
                            <div className="absolute bg-black/60"
                                 style={{
                                     left: screenCrop.x + screenCrop.w,
                                     top: screenCrop.y,
                                     right: 0,
                                     height: Math.max(0, screenCrop.h)
                                 }}/>
                        </div>
                        {/* Crop frame */}
                        <div
                            className="absolute border-2 border-spd-red pointer-events-none"
                            style={{
                                left: screenCrop.x, top: screenCrop.y,
                                width: Math.max(0, screenCrop.w), height: Math.max(0, screenCrop.h),
                            }}
                        >
                            {/* Rule-of-thirds guides */}
                            <div className="absolute inset-0 pointer-events-none"
                                 style={{opacity: 0.35}}>
                                <div className="absolute top-1/3 left-0 right-0 h-px bg-white"/>
                                <div className="absolute top-2/3 left-0 right-0 h-px bg-white"/>
                                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white"/>
                                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white"/>
                            </div>
                            {/* All 8 handles */}
                            {handles.map(h => (
                                <span key={h.key}
                                      className="absolute w-4 h-4 bg-spd-red rounded-sm shadow ring-2 ring-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                      style={{
                                          left: h.left !== undefined ? h.left : undefined,
                                          right: h.right !== undefined ? h.right : undefined,
                                          top: h.top !== undefined ? h.top : undefined,
                                          bottom: h.bottom !== undefined ? h.bottom : undefined,
                                          // For edge midpoints using 50%, center with transform
                                          transform: (typeof h.left === 'string' || typeof h.top === 'string')
                                              ? `translate(${typeof h.left === 'string' ? '-50%' : '0'}, ${typeof h.top === 'string' ? '-50%' : '0'})`
                                              : undefined,
                                      }}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Zoom controls (floating) */}
                <div
                    className="absolute right-2 top-2 sm:right-3 sm:top-3 flex flex-col gap-1 rounded-2xl bg-black/60 backdrop-blur border border-white/10 p-1">
                    <button type="button" aria-label="Vergrößern"
                            onClick={() => {
                                const c = containerRef.current!
                                const r = c.getBoundingClientRect()
                                zoomAtClient(r.left + r.width / 2, r.top + r.height / 2, zoom * 1.25)
                            }}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-white hover:bg-white/15 flex items-center justify-center">
                        <Plus size={16}/>
                    </button>
                    <button type="button" aria-label="Verkleinern"
                            onClick={() => {
                                const c = containerRef.current!
                                const r = c.getBoundingClientRect()
                                zoomAtClient(r.left + r.width / 2, r.top + r.height / 2, zoom / 1.25)
                            }}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-white hover:bg-white/15 flex items-center justify-center">
                        <Minus size={16}/>
                    </button>
                    <button type="button" aria-label="Zoom zurücksetzen"
                            onClick={() => imgRef.current && layoutToFit(imgRef.current)}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-white hover:bg-white/15 flex items-center justify-center">
                        <Maximize2 size={14}/>
                    </button>
                </div>

                {/* Reset crop */}
                <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
                    <button type="button"
                            onClick={() => setCrop({x: 0, y: 0, w: baseSize.w, h: baseSize.h})}
                            className="px-2.5 sm:px-3 h-8 sm:h-9 rounded-xl bg-black/60 backdrop-blur border border-white/10 text-white text-[10px] sm:text-xs font-medium hover:bg-white/15 flex items-center gap-1.5">
                        <RotateCcw size={12}/> <span className="hidden sm:inline">Alles</span> auswählen
                    </button>
                </div>

                {/* Hint */}
                {ready && zoom <= 1.02 && (
                    <div
                        className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 text-white/70 text-[10px] sm:text-[11px] bg-black/50 backdrop-blur px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full pointer-events-none whitespace-nowrap max-w-[calc(100%-1rem)] truncate">
                        Ecken ziehen · zum Zoomen pinch / Mausrad · Doppelklick zoomt
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <div
                className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-4 border-t border-white/10 bg-black/50">
                <div className="text-[10px] sm:text-[11px] text-white/60 tabular-nums">
                    {Math.round(crop.w * (imgRef.current?.width ?? 0) / (baseSize.w || 1))} × {Math.round(crop.h * (imgRef.current?.height ?? 0) / (baseSize.h || 1))} px
                    · {Math.round(zoom * 100)}%
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
                        className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-spd-red to-spd-red-dark text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-spd-red/25"
                    >
                        <Check size={14}/> Zuschneiden
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

