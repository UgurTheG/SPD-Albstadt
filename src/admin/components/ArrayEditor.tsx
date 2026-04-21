import {useState} from 'react'
import {Plus, Search} from 'lucide-react'
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    DragOverlay,
    type DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,} from '@dnd-kit/sortable'
import {restrictToVerticalAxis} from '@dnd-kit/modifiers'
import type {FieldConfig} from '../types'
import SortableItemCard from './SortableItemCard'
import ItemCard from './ItemCard'
import {useAdminStore} from '../store'


interface Props {
    fields: FieldConfig[]
    data: Record<string, unknown>[]
    tabKey: string
    onStructureChange?: (newArr: Record<string, unknown>[]) => void
}

export default function ArrayEditor({fields, data, tabKey, onStructureChange}: Props) {
    const updateState = useAdminStore(s => s.updateState)
    const state = useAdminStore(s => s.state)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [filter, setFilter] = useState('')

    const sensors = useSensors(
        useSensor(PointerSensor, {activationConstraint: {distance: 8}}),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
    )

    const commitArray = (newArr: Record<string, unknown>[]) => {
        if (onStructureChange) {
            // Section-level array: let parent handle the store update
            onStructureChange(newArr)
        } else {
            // Top-level array tab: update store directly
            updateState(tabKey, newArr)
        }
    }

    const handleMove = (from: number, to: number) => {
        const newArr = [...data]
        const [moved] = newArr.splice(from, 1)
        newArr.splice(to, 0, moved)
        commitArray(newArr)
    }

    const handleRemove = (index: number) => {
        const newArr = data.filter((_, i) => i !== index)
        commitArray(newArr)
    }

    const handleAdd = () => {
        const newItem: Record<string, unknown> = {}
        for (const f of fields) newItem[f.key] = f.type === 'stringlist' || f.type === 'imagelist' ? [] : ''
        if (data.length > 0 && data[0] && 'id' in data[0]) {
            newItem.id = crypto.randomUUID?.() ?? String(Date.now())
        }
        commitArray([...data, newItem])
    }

    const triggerUpdate = () => {
        // Called by child ItemCard when a field value changes (in-place mutation)
        updateState(tabKey, JSON.parse(JSON.stringify(state[tabKey])))
        onStructureChange?.(data)
    }

    // Generate stable IDs for sortable
    const ids = data.map((item, i) => (item.id as string) || `item-${i}`)

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null)
        const {active, over} = event
        if (!over || active.id === over.id) return
        const oldIndex = ids.indexOf(active.id as string)
        const newIndex = ids.indexOf(over.id as string)
        if (oldIndex !== -1 && newIndex !== -1) {
            handleMove(oldIndex, newIndex)
        }
    }

    const activeIndex = activeId ? ids.indexOf(activeId) : -1

    // Filter: match against text fields
    const filterLower = filter.toLowerCase()
    const matchesFilter = (item: Record<string, unknown>) => {
        if (!filterLower) return true
        for (const val of Object.values(item)) {
            if (typeof val === 'string' && val.toLowerCase().includes(filterLower)) return true
        }
        return false
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
        >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {/* Search filter */}
                {data.length > 3 && (
                    <div className="relative mb-4">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input
                            type="text"
                            placeholder="Einträge durchsuchen…"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="w-full bg-white/60 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-spd-red/20 focus:border-spd-red/40 dark:text-white dark:placeholder-gray-500 transition-all"
                        />
                    </div>
                )}
                <div className="space-y-4">
                    {data.map((item, i) => (
                        <div key={ids[i]} style={{display: matchesFilter(item) ? undefined : 'none'}}>
                            <SortableItemCard
                                id={ids[i]}
                                fields={fields}
                                item={item}
                                index={i}
                                total={data.length}
                                onUpdate={triggerUpdate}
                                onRemove={() => handleRemove(i)}
                                onMove={handleMove}
                            />
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="w-full border-2 border-dashed border-gray-300/60 dark:border-gray-700/40 text-gray-400 hover:border-spd-red/60 hover:text-spd-red rounded-2xl py-5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:bg-spd-red/[0.03] dark:hover:bg-spd-red/[0.05]"
                    >
                        <Plus size={16}/> Neuen Eintrag hinzufügen
                    </button>
                </div>
            </SortableContext>

            <DragOverlay>
                {activeIndex >= 0 ? (
                    <div className="opacity-90 rotate-1 scale-[1.02]">
                        <ItemCard
                            fields={fields}
                            item={data[activeIndex]}
                            index={activeIndex}
                            total={data.length}
                            onUpdate={() => {
                            }}
                            onRemove={() => {
                            }}
                            onMove={() => {
                            }}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
