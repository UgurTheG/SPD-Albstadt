import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {ChevronDown, ChevronUp, GripVertical, Trash2} from 'lucide-react'
import type {FieldConfig} from '../types'
import FieldRenderer from './FieldRenderer'

interface Props {
    id: string
    fields: FieldConfig[]
    item: Record<string, unknown>
    index: number
    total: number
    onUpdate: () => void
    onRemove: () => void
    onMove: (from: number, to: number) => void
}

export default function SortableItemCard({id, fields, item, index, total, onUpdate, onRemove, onMove}: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({id})

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    }

    const previewText = (item.name || item.titel || item.jahr || `#${index + 1}`) as string

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-6 transition-all duration-300 group/card ${
                isDragging
                    ? 'opacity-50 shadow-2xl scale-[1.01] border-spd-red/30'
                    : 'hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:border-gray-300/60 dark:hover:border-gray-600/50'
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        type="button"
                        aria-label="Verschieben"
                        className="text-gray-400 dark:text-gray-500 shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical size={16}/>
                    </button>
                    <div
                        className="w-7 h-7 rounded-lg bg-gradient-to-br from-spd-red/10 to-spd-red/5 dark:from-spd-red/20 dark:to-spd-red/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-spd-red">{index + 1}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
            {previewText}
          </span>
                </div>
                <div
                    className="flex items-center gap-1.5 shrink-0 opacity-100 sm:opacity-60 group-hover/card:opacity-100 transition-opacity">
                    {index > 0 && (
                        <button type="button" onClick={() => onMove(index, index - 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100/80 dark:bg-gray-800/60 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/80 dark:hover:bg-gray-700 transition-all">
                            <ChevronUp size={14}/>
                        </button>
                    )}
                    {index < total - 1 && (
                        <button type="button" onClick={() => onMove(index, index + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100/80 dark:bg-gray-800/60 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/80 dark:hover:bg-gray-700 transition-all">
                            <ChevronDown size={14}/>
                        </button>
                    )}
                    <button type="button" onClick={onRemove}
                            className="h-8 bg-red-50/80 dark:bg-red-900/15 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 px-3 rounded-xl transition-all text-xs font-medium flex items-center gap-1.5 ml-1">
                        <Trash2 size={12}/> Entfernen
                    </button>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-5"/>

            {/* Fields */}
            {fields.map(field => (
                <FieldRenderer
                    key={field.key}
                    field={field}
                    value={item[field.key]}
                    onChange={v => {
                        item[field.key] = v;
                        onUpdate()
                    }}
                    contextItem={item}
                />
            ))}
        </div>
    )
}

