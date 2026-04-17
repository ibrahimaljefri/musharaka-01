import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'

/**
 * Sortable <th> column header.
 *
 * Props:
 *   field      {string}   — the field key this header sorts by
 *   sort       {object}   — { field, dir } current sort state
 *   onSort     {fn}       — called with new sort: { field, dir: 'asc'|'desc' }
 *   children   {ReactNode}— header label
 *   className  {string}   — extra th classes
 *
 * Usage:
 *   const [sort, setSort] = useState({ field: null, dir: 'asc' })
 *   <SortableHeader field="name" sort={sort} onSort={setSort}>الاسم</SortableHeader>
 */
export default function SortableHeader({ field, sort, onSort, children, className = '' }) {
  const active = sort?.field === field
  const dir = active ? sort.dir : null

  const handleClick = () => {
    if (!active) {
      onSort({ field, dir: 'asc' })
    } else if (dir === 'asc') {
      onSort({ field, dir: 'desc' })
    } else {
      onSort({ field: null, dir: 'asc' })
    }
  }

  const Icon = !active
    ? ChevronsUpDown
    : dir === 'asc'
      ? ChevronUp
      : ChevronDown

  return (
    <th
      onClick={handleClick}
      className={`cursor-pointer select-none group px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide font-arabic ${className}`}
    >
      <span className={`inline-flex items-center gap-1 transition-colors ${
        active
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-gray-500 dark:text-gray-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400'
      }`}>
        {children}
        <Icon size={13} className="flex-shrink-0" />
      </span>
    </th>
  )
}
