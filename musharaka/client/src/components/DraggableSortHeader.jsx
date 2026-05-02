/**
 * DraggableSortHeader — a `<th>` that is BOTH click-to-sort and drag-to-reorder.
 *
 * Click on the label area → toggles sort.
 * Drag the small grip (appears on hover) → reorders the column.
 *
 * Pairs with <DraggableHeaderRow> which provides the DndContext + SortableContext.
 *
 * Props:
 *   id        - column key (matches the SortableContext items)
 *   label     - Arabic label rendered in the header
 *   sortKey   - currently active sort key (from useSortable hook)
 *   sortDir   - 'asc' | 'desc'
 *   onToggle  - (key) => void — called when the user clicks the label
 *   align     - 'start' (default) | 'center' | 'end'
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripHorizontal } from 'lucide-react'

export default function DraggableSortHeader({ id, label, sortKey, sortDir, onToggle, align = 'start' }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
    textAlign: align,
  }

  const active = sortKey === id

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`dh-th${isDragging ? ' dh-th-dragging' : ''}`}
    >
      <span
        className="dh-sort-area"
        onClick={() => onToggle && onToggle(id)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && onToggle) {
            e.preventDefault()
            onToggle(id)
          }
        }}
        aria-label={`ترتيب حسب ${label}`}
      >
        {label}
        {onToggle && (
          <span className={`dh-sort-arrow${active ? ' dh-sort-active' : ''}`}>
            {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        )}
      </span>

      <span
        className="dh-drag-handle"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        title="اسحب لإعادة الترتيب"
        aria-label="اسحب لإعادة ترتيب العمود"
      >
        <GripHorizontal size={11} />
      </span>
    </th>
  )
}
