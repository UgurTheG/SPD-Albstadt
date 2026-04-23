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
    onItemChange: (newItem: Record<string, unknown>) => void
    onRemove: () => void
    onMove: (from: number, to: number) => void
    dragDisabled?: boolean
}

export default function SortableItemCard({id, fields, item, index, total, onItemChange, onRemove, onMove, dragDisabled}: Props) {
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
            className={`bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-4 sm:p-6 transition-all duration-300 group/card ${
                isDragging
                    ? 'opacity-50 shadow-2xl scale-[1.01] border-spd-red/30'
                    : 'hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:border-gray-300/60 dark:hover:border-gray-600/50'
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <button
                        type="button"
                        aria-label="Verschieben"
                        className={`text-gray-400 dark:text-gray-500 shrink-0 touch-none p-1 -ml-1 rounded-lg transition-colors ${dragDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        {...attributes}
                        {...(dragDisabled ? {} : listeners)}
                        title={dragDisabled ? 'Filter deaktivieren um zu sortieren' : 'Ziehen zum Sortieren'}
                    >
                        <GripVertical size={16}/>
                    </button>
                    <div
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-spd-red/10 to-spd-red/5 dark:from-spd-red/20 dark:to-spd-red/10 flex items-center justify-center shrink-0">
                        <span className="text-[9px] sm:text-[10px] font-black text-spd-red">{index + 1}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
            {previewText}
          </span>
                </div>
                <div
                    className="flex items-center gap-1 sm:gap-1.5 shrink-0 opacity-100 sm:opacity-60 group-hover/card:opacity-100 transition-opacity">
                    {index > 0 && !dragDisabled && (
                        <button type="button" onClick={() => onMove(index, index - 1)}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl bg-gray-100/80 dark:bg-gray-800/60 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/80 dark:hover:bg-gray-700 transition-all">
                            <ChevronUp size={14}/>
                        </button>
                    )}
                    {index < total - 1 && !dragDisabled && (
                        <button type="button" onClick={() => onMove(index, index + 1)}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl bg-gray-100/80 dark:bg-gray-800/60 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/80 dark:hover:bg-gray-700 transition-all">
                            <ChevronDown size={14}/>
                        </button>
                    )}
                    <button type="button" onClick={onRemove}
                            className="h-7 sm:h-8 bg-red-50/80 dark:bg-red-900/15 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 px-2 sm:px-3 rounded-xl transition-all text-[10px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 ml-0.5 sm:ml-1">
                        <Trash2 size={12}/> <span className="hidden sm:inline">Entfernen</span>
                    </button>
                </div>
            </div>

            {/* Divider */}
            <div
                className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-4 sm:mb-5"/>

            {/* Fields */}
            {fields.map(field => (
                <FieldRenderer
                    key={field.key}
                    field={field}
                    value={item[field.key]}
                    onChange={(v, extras) => {
                        onItemChange({...item, [field.key]: v, ...(extras || {})})
                    }}
                    contextItem={item}
                />
            ))}
        </div>
    )
}
