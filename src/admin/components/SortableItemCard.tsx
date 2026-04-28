import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { FieldConfig } from '../types'
import ItemCardBody from './ItemCardBody'

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

export default function SortableItemCard({
  id,
  fields,
  item,
  index,
  total,
  onItemChange,
  onRemove,
  onMove,
  dragDisabled,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

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
      <ItemCardBody
        fields={fields}
        item={item}
        index={index}
        total={total}
        onItemChange={onItemChange}
        onRemove={onRemove}
        onMove={onMove}
        dragDisabled={dragDisabled}
        gripSlot={
          <button
            type="button"
            aria-label="Verschieben"
            className={`text-gray-400 dark:text-gray-500 shrink-0 touch-none p-1 -ml-1 rounded-lg transition-colors ${dragDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'}`}
            {...attributes}
            {...(dragDisabled ? {} : listeners)}
            title={dragDisabled ? 'Filter deaktivieren um zu sortieren' : 'Ziehen zum Sortieren'}
          >
            <GripVertical size={16} />
          </button>
        }
      />
    </div>
  )
}
