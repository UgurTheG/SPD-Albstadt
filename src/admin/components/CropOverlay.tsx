import {useCallback, useEffect, useRef, useState} from 'react'

interface Props {
    file: File
    onComplete: (base64: string | null) => void
}

export default function CropOverlay({file, onComplete}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)
    const scaleRef = useRef(1)
    const [crop, setCrop] = useState({x: 0, y: 0, w: 0, h: 0})
    const dragging = useRef(false)
    const dragType = useRef<string>('new')
    const dragStart = useRef({x: 0, y: 0})
    const cropStart = useRef({x: 0, y: 0, w: 0, h: 0})

    useEffect(() => {
        const img = new Image()
        img.onload = () => {
            imgRef.current = img
            const maxW = window.innerWidth * 0.88
            const maxH = window.innerHeight * 0.65
            const s = Math.min(maxW / img.width, maxH / img.height, 1)
            scaleRef.current = s
            const canvas = canvasRef.current!
            canvas.width = Math.round(img.width * s)
            canvas.height = Math.round(img.height * s)
            const c = {x: 0, y: 0, w: canvas.width, h: canvas.height}
            setCrop(c)
            draw(c)
        }
        img.src = URL.createObjectURL(file)
        return () => URL.revokeObjectURL(img.src)
    }, [file])

    const draw = useCallback((c: typeof crop) => {
        const canvas = canvasRef.current
        const img = imgRef.current
        if (!canvas || !img) return
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(0, 0, canvas.width, c.y)
        ctx.fillRect(0, c.y + c.h, canvas.width, canvas.height - c.y - c.h)
        ctx.fillRect(0, c.y, c.x, c.h)
        ctx.fillRect(c.x + c.w, c.y, canvas.width - c.x - c.w, c.h)
        ctx.strokeStyle = '#E3000F';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3])
        ctx.strokeRect(c.x, c.y, c.w, c.h)
        ctx.setLineDash([])
        ctx.fillStyle = '#E3000F'
        for (const [hx, hy] of [[c.x, c.y], [c.x + c.w, c.y], [c.x, c.y + c.h], [c.x + c.w, c.y + c.h]]) {
            ctx.fillRect(hx - 4, hy - 4, 8, 8)
        }
    }, [])

    useEffect(() => {
        draw(crop)
    }, [crop, draw])

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const r = canvasRef.current!.getBoundingClientRect()
        const t = 'touches' in e ? e.touches[0] : e
        return {x: t.clientX - r.left, y: t.clientY - r.top}
    }

    const getHitType = (mx: number, my: number) => {
        const hs = 12
        const corners = [
            {type: 'tl', x: crop.x, y: crop.y},
            {type: 'tr', x: crop.x + crop.w, y: crop.y},
            {type: 'bl', x: crop.x, y: crop.y + crop.h},
            {type: 'br', x: crop.x + crop.w, y: crop.y + crop.h},
        ]
        for (const c of corners) if (Math.abs(mx - c.x) < hs && Math.abs(my - c.y) < hs) return c.type
        if (mx > crop.x && mx < crop.x + crop.w && my > crop.y && my < crop.y + crop.h) return 'move'
        return 'new'
    }

    const onDown = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        const p = getPos(e)
        dragType.current = getHitType(p.x, p.y)
        dragging.current = true
        dragStart.current = p
        cropStart.current = {...crop}
        if (dragType.current === 'new') {
            setCrop({x: p.x, y: p.y, w: 0, h: 0})
            dragType.current = 'br'
        }
    }

    const onMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dragging.current) return
        e.preventDefault()
        const canvas = canvasRef.current!
        const p = getPos(e)
        const dx = p.x - dragStart.current.x, dy = p.y - dragStart.current.y
        const cs = cropStart.current

        if (dragType.current === 'move') {
            setCrop({
                x: Math.max(0, Math.min(canvas.width - cs.w, cs.x + dx)),
                y: Math.max(0, Math.min(canvas.height - cs.h, cs.y + dy)),
                w: cs.w, h: cs.h,
            })
        } else {
            let nx = cs.x, ny = cs.y, nw = cs.w, nh = cs.h
            if (dragType.current.includes('r')) nw = Math.max(20, cs.w + dx)
            if (dragType.current.includes('l')) {
                nx = cs.x + dx;
                nw = Math.max(20, cs.w - dx)
            }
            if (dragType.current.includes('b')) nh = Math.max(20, cs.h + dy)
            if (dragType.current.includes('t')) {
                ny = cs.y + dy;
                nh = Math.max(20, cs.h - dy)
            }
            setCrop({
                x: Math.max(0, nx), y: Math.max(0, ny),
                w: Math.min(nw, canvas.width - Math.max(0, nx)),
                h: Math.min(nh, canvas.height - Math.max(0, ny)),
            })
        }
    }

    const exportCrop = (fullImage: boolean) => {
        const img = imgRef.current!
        const s = scaleRef.current
        const out = document.createElement('canvas')
        if (fullImage) {
            out.width = img.width;
            out.height = img.height
            out.getContext('2d')!.drawImage(img, 0, 0)
        } else {
            const rx = crop.x / s, ry = crop.y / s, rw = crop.w / s, rh = crop.h / s
            out.width = Math.round(rw);
            out.height = Math.round(rh)
            out.getContext('2d')!.drawImage(img, rx, ry, rw, rh, 0, 0, out.width, out.height)
        }
        onComplete(out.toDataURL('image/webp', 0.85).split(',')[1])
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black/85 flex flex-col items-center justify-center">
            <p className="text-white text-sm mb-3 opacity-70">Bildausschnitt wählen — ziehen Sie die Ecken oder zeichnen
                Sie einen neuen Bereich</p>
            <canvas
                ref={canvasRef}
                className="max-w-[90vw] max-h-[70vh] cursor-crosshair rounded-lg"
                onMouseDown={onDown}
                onMouseMove={onMove}
                onMouseUp={() => dragging.current = false}
                onTouchStart={onDown}
                onTouchMove={onMove}
                onTouchEnd={() => dragging.current = false}
            />
            <div className="mt-4 flex gap-2">
                <button
                    className="px-5 py-2.5 rounded-xl bg-white text-gray-800 font-semibold text-sm hover:bg-gray-100 transition-colors"
                    onClick={() => onComplete(null)}>
                    Abbrechen
                </button>
                <button
                    className="px-5 py-2.5 rounded-xl bg-gray-700 text-white font-semibold text-sm hover:bg-gray-600 transition-colors"
                    onClick={() => exportCrop(true)}>
                    Ganzes Bild
                </button>
                <button
                    className="px-5 py-2.5 rounded-xl bg-spd-red text-white font-bold text-sm hover:bg-spd-red-dark transition-colors"
                    onClick={() => exportCrop(false)}>
                    ✓ Zuschneiden & Hochladen
                </button>
            </div>
        </div>
    )
}

