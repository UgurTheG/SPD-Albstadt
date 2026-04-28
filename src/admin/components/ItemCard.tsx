import { GripVertical } from 'lucide-react'
import type { FieldConfig } from '../types'
import ItemCardBody from './ItemCardBody'

interface Props {
  fields: FieldConfig[]
  item: Record<string, unknown>
  index: number
  total: number
  onItemChange: (newItem: Record<string, unknown>) => void
  onRemove: () => void
  onMove: (from: number, to: number) => void
}

/** Static (non-sortable) card — used as the DragOverlay ghost and as a fallback. */
export default function ItemCard({
  fields,
  item,
  index,
  total,
  onItemChange,
  onRemove,
  onMove,
}: Props) {
  return (
    <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:border-gray-300/60 dark:hover:border-gray-600/50 group/card">
      <ItemCardBody
        fields={fields}
        item={item}
        index={index}
        total={total}
        onItemChange={onItemChange}
        onRemove={onRemove}
        onMove={onMove}
        gripSlot={
          <GripVertical
            size={16}
            className="text-gray-400 dark:text-gray-500 shrink-0 cursor-grab active:cursor-grabbing"
          />
        }
      />
    </div>
  )
}
