/**
 * DraggableHeaderRow — wraps children in a DndContext + horizontal SortableContext
 * so any contained <DraggableSortHeader> cells can be reordered by drag.
 *
 * Only the cells inside this wrapper participate in drag — surrounding fixed
 * <th>s (checkbox, actions, index) should be rendered as siblings OUTSIDE this
 * component, so they stay pinned in place.
 *
 * Props:
 *   order     - string[] of column keys (matches the ids of children)
 *   onReorder - (nextOrder: string[]) => void
 *   children  - the <DraggableSortHeader> cells, typically order.map(...)
 */
import {
  DndContext, closestCenter,
  PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'

export default function DraggableHeaderRow({ order, onReorder, children }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const next = arrayMove(order, order.indexOf(active.id), order.indexOf(over.id))
    onReorder(next)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}
