import {useCallback, useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import type {FieldConfig} from '../types'
import {slugify} from '../lib/images'
import {useAdminStore} from '../store'
import {ICON_LIST, loadIconSvg} from '../lib/icons'
import {ArrowDown, ArrowUp, Calendar, GripVertical, ImagePlus, Link as LinkIcon, Mail, Phone, Plus, Search, Upload, X} from 'lucide-react'
import CropOverlay from './CropOverlay'
import {DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent} from '@dnd-kit/core'
import {SortableContext, verticalListSortingStrategy, useSortable, arrayMove} from '@dnd-kit/sortable'
import {restrictToVerticalAxis, restrictToParentElement} from '@dnd-kit/modifiers'
import {CSS} from '@dnd-kit/utilities'

const inputCls = 'w-full bg-white/60 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-spd-red/20 focus:border-spd-red/40 focus:bg-white dark:focus:bg-gray-800/80 dark:text-white dark:placeholder-gray-500 transition-all duration-200 backdrop-blur-sm'

const FacebookSvg = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.988h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12z"/>
    </svg>
)
const InstagramSvg = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
)

function FieldIcon({iconKey}: { iconKey: NonNullable<FieldConfig['iconKey']> }) {
    switch (iconKey) {
        case 'facebook':
            return <span className="text-[#1877F2]"><FacebookSvg/></span>
        case 'instagram':
            return <span className="text-[#E4405F]"><InstagramSvg/></span>
        case 'calendar':
            return <Calendar size={15}/>
        case 'link':
            return <LinkIcon size={15}/>
        case 'mail':
            return <Mail size={15}/>
        case 'phone':
            return <Phone size={15}/>
    }
}

interface Props {
    field: FieldConfig
    value: unknown
    onChange: (v: unknown) => void
    contextItem?: Record<string, unknown>
}

export default function FieldRenderer({field, value, onChange, contextItem}: Props) {
    const label = field.label + (field.required ? ' *' : '')

    return (
        <div className="mb-4">
            <label
                className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                {label}
            </label>
            <FieldInput field={field} value={value} onChange={onChange} contextItem={contextItem}/>
        </div>
    )
}

function FieldInput({field, value, onChange, contextItem}: Props) {
    switch (field.type) {
        case 'textarea':
            return <TextareaField value={value as string} onChange={v => onChange(v)}/>
        case 'select':
            return <SelectField value={value as string} options={field.options || []} onChange={v => onChange(v)}/>
        case 'image':
            return <ImageField field={field} value={value as string} onChange={v => onChange(v)}
                               contextItem={contextItem}/>
        case 'imagelist':
            return <ImageListField field={field} value={value as string[]} onChange={v => onChange(v)}
                                   contextItem={contextItem}/>
        case 'stringlist':
            return <StringListField value={value as string[]} onChange={v => onChange(v)}/>
        case 'icon-picker':
            return <IconPickerField value={value as string} onChange={v => onChange(v)}/>
        case 'date':
            return <DateField value={value as string} onChange={v => onChange(v)}/>
        case 'time':
            return <TimeField value={value as string} onChange={v => onChange(v)}/>
        case 'toggle':
            return <ToggleField value={value as boolean} onChange={v => onChange(v)}/>
        default:
            return (
                <div
                    className="flex items-center gap-2.5 bg-white/60 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-spd-red/20 focus-within:border-spd-red/40 focus-within:bg-white dark:focus-within:bg-gray-800/80 transition-all duration-200 backdrop-blur-sm">
                    {field.iconKey && (
                        <span className="text-gray-400 dark:text-gray-500 shrink-0 flex items-center">
                            <FieldIcon iconKey={field.iconKey}/>
                        </span>
                    )}
                    <input
                        type={field.type || 'text'}
                        className="w-full min-w-0 bg-transparent text-sm focus:outline-none dark:text-white dark:placeholder-gray-500"
                        value={(value as string) || ''}
                        placeholder={field.placeholder}
                        onChange={e => onChange(e.target.value)}
                        spellCheck={field.type === 'email' || field.type === 'url' ? false : undefined}
                        autoCapitalize={field.type === 'email' || field.type === 'url' ? 'off' : undefined}
                        autoCorrect={field.type === 'email' || field.type === 'url' ? 'off' : undefined}
                    />
                </div>
            )
    }
}

function TextareaField({value, onChange}: { value: string; onChange: (v: string) => void }) {
    const ref = useRef<HTMLTextAreaElement>(null)
    const resize = useCallback(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = Math.max(80, ref.current.scrollHeight) + 'px'
        }
    }, [])
    useEffect(() => {
        resize()
    }, [value, resize])
    return (
        <textarea
            ref={ref}
            className={inputCls + ' resize-y min-h-20'}
            rows={3}
            value={value || ''}
            onChange={e => {
                onChange(e.target.value);
                resize()
            }}
            placeholder="Text eingeben…"
        />
    )
}

function SelectField({value, options, onChange}: { value: string; options: string[]; onChange: (v: string) => void }) {
    return (
        <select className={inputCls + ' cursor-pointer'} value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">— Bitte wählen —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    )
}

function DateField({value, onChange}: { value: string; onChange: (v: string) => void }) {
    const isoToDE = (iso: string) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}.${m}.${y}`
    }
    const deToISO = (de: string) => {
        const m = de.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''
    }
    const [display, setDisplay] = useState(isoToDE(value))
    const [valid, setValid] = useState(true)

    const hint = value ? new Date(value + 'T00:00:00').toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : ''

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <input
                type="text"
                className={`${inputCls} max-w-[160px] ${!valid ? 'text-spd-red' : ''}`}
                placeholder="TT.MM.JJJJ"
                value={display}
                onChange={e => {
                    setDisplay(e.target.value)
                    const iso = deToISO(e.target.value)
                    if (iso) {
                        onChange(iso);
                        setValid(true)
                    } else if (e.target.value === '') {
                        onChange('');
                        setValid(true)
                    } else setValid(false)
                }}
            />
            {hint && <span className="text-sm text-gray-500 dark:text-gray-400">{hint}</span>}
        </div>
    )
}

function TimeField({value, onChange}: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-2">
            <input type="text" className={`${inputCls} max-w-[100px]`} placeholder="HH:MM" value={value || ''}
                   onChange={e => onChange(e.target.value)}/>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Uhr</span>
        </div>
    )
}

function ToggleField({value, onChange}: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" className="flex items-center gap-3 group" onClick={() => onChange(!value)}>
            <div
                className={`w-12 h-7 rounded-full relative transition-all duration-300 ${value ? 'bg-gradient-to-r from-spd-red to-spd-red-dark shadow-sm shadow-spd-red/25' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${value ? 'translate-x-5' : ''}`}/>
            </div>
            <span
                className={`text-sm font-medium transition-colors ${value ? 'text-spd-red dark:text-red-400' : 'text-gray-400'}`}>{value ? 'Aktiv' : 'Inaktiv'}</span>
        </button>
    )
}

function ImageField({field, value, onChange, contextItem}: {
    field: FieldConfig;
    value: string;
    onChange: (v: string) => void;
    contextItem?: Record<string, unknown>
}) {
    const addPendingUpload = useAdminStore(s => s.addPendingUpload)
    const setStatus = useAdminStore(s => s.setStatus)
    const [preview, setPreview] = useState(value || '')
    const [cropFile, setCropFile] = useState<File | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setPreview(value || '')
    }, [value])

    const handleCrop = (base64: string | null) => {
        setCropFile(null)
        if (!base64) return
        const nameSlug = contextItem?.name ? slugify(contextItem.name as string) : slugify('bild-' + Date.now())
        const imageDir = field.imageDir || 'news'
        const ghFilePath = `public/images/${imageDir}/${nameSlug}.webp`
        const publicUrl = `/images/${imageDir}/${nameSlug}.webp`
        addPendingUpload({ghPath: ghFilePath, base64, message: `admin: Bild ${nameSlug}.webp hochgeladen`})
        onChange(publicUrl)
        setPreview(`data:image/webp;base64,${base64}`)
        setStatus('Bild vorbereitet — wird beim Veröffentlichen hochgeladen', 'success')
    }

    const [showUrl, setShowUrl] = useState(!value)
    useEffect(() => {
        setShowUrl(!value)
    }, [value])

    return (
        <>
            {cropFile && <CropOverlay file={cropFile} onComplete={handleCrop}/>}
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
                            <button type="button" onClick={() => fileRef.current?.click()}
                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-2xl transition-all flex items-center justify-center text-transparent group-hover:text-white">
                                <Upload size={18}/>
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => fileRef.current?.click()}
                                className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-spd-red hover:text-spd-red transition-colors shrink-0">
                            <ImagePlus size={18}/>
                            <span className="text-[9px] font-medium">Hochladen</span>
                        </button>
                    )}
                    <div className="flex flex-col gap-2 flex-1 min-w-[12rem]">
                        <button type="button" onClick={() => fileRef.current?.click()}
                                className="text-xs font-medium px-3 py-2 rounded-xl bg-spd-red/10 text-spd-red hover:bg-spd-red/15 transition-colors flex items-center gap-1.5 w-fit">
                            <Upload size={12}/> {preview ? 'Ersetzen' : 'Bild hochladen'}
                        </button>
                        <button type="button" onClick={() => setShowUrl(v => !v)}
                                className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1 w-fit">
                            <LinkIcon size={10}/> {showUrl ? 'URL ausblenden' : 'URL manuell eingeben'}
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
                            onChange(e.target.value);
                            setPreview(e.target.value)
                        }}
                    />
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                    if (e.target.files?.[0]) setCropFile(e.target.files[0]);
                    e.target.value = ''
                }}/>
            </div>
        </>
    )
}

function ImageListField({field, value, onChange, contextItem}: {
    field: FieldConfig;
    value: string[];
    onChange: (v: string[]) => void;
    contextItem?: Record<string, unknown>
}) {
    const addPendingUpload = useAdminStore(s => s.addPendingUpload)
    const setStatus = useAdminStore(s => s.setStatus)
    const list = Array.isArray(value) ? [...value] : []
    const captionsKey = field.captionsKey
    const captions: string[] = captionsKey && contextItem ? (Array.isArray(contextItem[captionsKey]) ? [...(contextItem[captionsKey] as string[])] : []) : []
    const [cropData, setCropData] = useState<{ file: File; index: number } | null>(null)

    // Stable ids for sortable (index-based since URLs can repeat)
    const ids = list.map((_, i) => `img-${i}`)

    const sensors = useSensors(
        useSensor(PointerSensor, {activationConstraint: {distance: 8}}),
        useSensor(KeyboardSensor),
    )

    const syncCaptions = (caps: string[]) => {
        if (captionsKey && contextItem) contextItem[captionsKey] = caps
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event
        if (!over || active.id === over.id) return
        const oldIndex = ids.indexOf(active.id as string)
        const newIndex = ids.indexOf(over.id as string)
        const newList = arrayMove(list, oldIndex, newIndex)
        const newCaptions = arrayMove(captions, oldIndex, newIndex)
        syncCaptions(newCaptions)
        onChange(newList)
    }

    const handleCrop = (base64: string | null) => {
        if (!cropData) return
        const {index} = cropData
        setCropData(null)
        if (!base64) return
        const imageDir = field.imageDir || 'news'
        const nameSlug = slugify('bild-' + Date.now())
        const ghFilePath = `public/images/${imageDir}/${nameSlug}.webp`
        const publicUrl = `/images/${imageDir}/${nameSlug}.webp`
        addPendingUpload({ghPath: ghFilePath, base64, message: `admin: Bild ${nameSlug}.webp hochgeladen`})
        const newList = [...list]
        newList[index] = publicUrl
        onChange(newList)
        setStatus('Bild vorbereitet — wird beim Veröffentlichen hochgeladen', 'success')
    }

    return (
        <>
            {cropData && <CropOverlay file={cropData.file} onComplete={handleCrop}/>}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
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
                                    const n = [...list];
                                    n[i] = v;
                                    onChange(n)
                                }}
                                onCaptionChange={v => {
                                    const c = [...captions];
                                    c[i] = v;
                                    syncCaptions(c);
                                    onChange([...list])
                                }}
                                onUpload={file => setCropData({file, index: i})}
                                onRemove={() => {
                                    const n = [...list];
                                    n.splice(i, 1)
                                    const c = [...captions];
                                    c.splice(i, 1)
                                    syncCaptions(c)
                                    onChange(n)
                                }}
                                onMoveUp={() => {
                                    if (i === 0) return
                                    const n = [...list]; [n[i - 1], n[i]] = [n[i], n[i - 1]]
                                    const c = [...captions]; [c[i - 1], c[i]] = [c[i], c[i - 1]]
                                    syncCaptions(c)
                                    onChange(n)
                                }}
                                onMoveDown={() => {
                                    if (i >= list.length - 1) return
                                    const n = [...list]; [n[i], n[i + 1]] = [n[i + 1], n[i]]
                                    const c = [...captions]; [c[i], c[i + 1]] = [c[i + 1], c[i]]
                                    syncCaptions(c)
                                    onChange(n)
                                }}
                            />
                        ))}
                        <button
                            type="button"
                            className="text-xs text-spd-red font-semibold hover:underline flex items-center gap-1"
                            onClick={() => {
                                if (captionsKey) {
                                    captions.push('');
                                    syncCaptions(captions)
                                }
                                onChange([...list, ''])
                            }}
                        >
                            <Plus size={12}/> Bild hinzufügen
                        </button>
                    </div>
                </SortableContext>
            </DndContext>
        </>
    )
}

function SortableImageListItem(props: {
    id: string; url: string; caption: string; hasCaption: boolean; index: number; total: number
    onUrlChange: (v: string) => void; onCaptionChange: (v: string) => void
    onUpload: (f: File) => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void
}) {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: props.id})
    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.85 : undefined,
    }
    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <ImageListItem {...props} dragListeners={listeners} isDragging={isDragging}/>
        </div>
    )
}

function ImageListItem({url, caption, hasCaption, index, total, onUrlChange, onCaptionChange, onUpload, onRemove, onMoveUp, onMoveDown, dragListeners, isDragging}: {
    url: string; caption: string; hasCaption: boolean; index: number; total: number
    onUrlChange: (v: string) => void; onCaptionChange: (v: string) => void
    onUpload: (f: File) => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void
    dragListeners?: Record<string, unknown>; isDragging?: boolean
}) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [showUrl, setShowUrl] = useState(!url)
    return (
        <div
            className={`bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${isDragging ? 'shadow-xl ring-2 ring-spd-red/30' : ''}`}>
            <div className="flex gap-3 items-start">
                {/* Drag handle + reorder buttons */}
                {total > 1 && (
                    <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
                        <button type="button" {...dragListeners}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing transition-colors touch-none"
                                title="Ziehen zum Sortieren">
                            <GripVertical size={14}/>
                        </button>
                        <button type="button" disabled={index === 0} onClick={onMoveUp}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-spd-red hover:bg-spd-red/10 disabled:opacity-25 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-all">
                            <ArrowUp size={13}/>
                        </button>
                        <button type="button" disabled={index >= total - 1} onClick={onMoveDown}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-spd-red hover:bg-spd-red/10 disabled:opacity-25 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-all">
                            <ArrowDown size={13}/>
                        </button>
                    </div>
                )}
                {url ? (
                    <img src={url} alt=""
                         className="w-16 h-16 rounded-xl object-cover border border-gray-200/60 dark:border-gray-700/60 shrink-0 shadow-sm"
                         onError={e => (e.target as HTMLImageElement).style.display = 'none'}/>
                ) : (
                    <button type="button" onClick={() => fileRef.current?.click()}
                            className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:border-spd-red hover:text-spd-red transition-colors shrink-0">
                        <ImagePlus size={16}/>
                    </button>
                )}
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex gap-2 flex-wrap">
                        <button type="button"
                                className="bg-spd-red/10 text-spd-red hover:bg-spd-red/15 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                                onClick={() => fileRef.current?.click()}>
                            <Upload size={10}/> {url ? 'Ersetzen' : 'Hochladen'}
                        </button>
                        <button type="button"
                                className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1 px-2 py-1.5 rounded-lg"
                                onClick={() => setShowUrl(v => !v)}>
                            <LinkIcon size={10}/> URL
                        </button>
                        <button type="button"
                                className="ml-auto text-[11px] text-red-400 hover:text-red-600 flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1.5 rounded-lg transition-colors"
                                onClick={onRemove}>
                            <X size={10}/> Entfernen
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                            if (e.target.files?.[0]) onUpload(e.target.files[0]);
                            e.target.value = ''
                        }}/>
                    </div>
                    {showUrl && (
                        <input type="text" className={inputCls + ' font-mono text-xs'} placeholder="/images/..."
                               value={url} spellCheck={false} autoCapitalize="off" autoCorrect="off"
                               onChange={e => onUrlChange(e.target.value)}/>
                    )}
                </div>
            </div>
            {hasCaption && (
                <input type="text" className={inputCls + ' mt-3'} placeholder="Bildunterschrift (optional)"
                       value={caption} onChange={e => onCaptionChange(e.target.value)}/>
            )}
        </div>
    )
}

function StringListField({value, onChange}: { value: string[]; onChange: (v: string[]) => void }) {
    const list = Array.isArray(value) ? value : []
    return (
        <div className="space-y-2">
            {list.map((item, i) => (
                <div key={i} className="flex gap-2 group">
                    <input type="text" className={inputCls + ' flex-1'} value={item} onChange={e => {
                        const n = [...list];
                        n[i] = e.target.value;
                        onChange(n)
                    }}/>
                    <button type="button"
                            className="text-xs text-gray-300 group-hover:text-red-400 hover:!text-red-600 px-2 rounded-lg transition-colors"
                            onClick={() => {
                                const n = [...list];
                                n.splice(i, 1);
                                onChange(n)
                            }}>
                        <X size={14}/>
                    </button>
                </div>
            ))}
            <button type="button"
                    className="text-xs text-spd-red font-semibold hover:underline flex items-center gap-1.5 mt-1"
                    onClick={() => onChange([...list, ''])}>
                <Plus size={12}/> Hinzufügen
            </button>
        </div>
    )
}

function IconPickerField({value, onChange}: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [svgHtml, setSvgHtml] = useState('')
    const btnRef = useRef<HTMLButtonElement>(null)
    const dropRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({top: 0, left: 0, width: 0})

    useEffect(() => {
        if (value) loadIconSvg(value).then(svg => {
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

    // Position the dropdown below the button
    useEffect(() => {
        if (open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect()
            setPos({top: rect.bottom + 8, left: rect.left, width: rect.width})
        }
    }, [open])

    const filtered = ICON_LIST.filter(i => i.toLowerCase().includes(search.toLowerCase()))

    return (
        <div>
            <button ref={btnRef} type="button"
                    className={inputCls + ' text-left flex items-center gap-2.5 cursor-pointer'}
                    onClick={() => setOpen(!open)}>
                {svgHtml && <span className="w-4 h-4 shrink-0"
                                  dangerouslySetInnerHTML={{__html: svgHtml.replace(/<svg/, '<svg class="w-4 h-4"')}}/>}
                <span className="truncate">{value || 'Icon wählen…'}</span>
            </button>
            {open && createPortal(
                <div
                    ref={dropRef}
                    className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl dark:shadow-black/40 p-4 max-h-80 overflow-y-auto"
                    style={{top: pos.top, left: pos.left, width: pos.width, zIndex: 9999}}
                >
                    <div className="relative mb-3">
                        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input type="text" placeholder="Icon suchen…"
                               className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-spd-red/20 dark:text-white"
                               value={search} onChange={e => setSearch(e.target.value)}/>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                        {filtered.map(icon => <IconCell key={icon} name={icon} selected={value === icon}
                                                        onSelect={() => {
                                                            onChange(icon);
                                                            setOpen(false)
                                                        }}/>)}
                        {filtered.length === 0 &&
                            <p className="col-span-full text-xs text-gray-400 text-center py-6">Kein Icon gefunden</p>}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

function IconCell({name, selected, onSelect}: { name: string; selected: boolean; onSelect: () => void }) {
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
            {svg && <span className="w-4 h-4 text-gray-700 dark:text-gray-300"
                          dangerouslySetInnerHTML={{__html: svg.replace(/<svg/, '<svg class="w-4 h-4"')}}/>}
            <span className="text-[7px] text-gray-400 mt-0.5 leading-tight truncate w-full text-center">{name}</span>
        </button>
    )
}
