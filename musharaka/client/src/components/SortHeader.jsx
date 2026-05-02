/**
 * SortHeader — clickable <th> for table column sorting.
 *
 *   <SortHeader k="amount" label="المبلغ"
 *               sortKey={sortKey} sortDir={sortDir} onToggle={toggle} />
 *
 * Props:
 *   k         column identifier (passed back to onToggle)
 *   label     visible header text
 *   sortKey   currently active sort column
 *   sortDir   'asc' | 'desc'
 *   onToggle  (key: string) => void — toggles direction or switches column
 *   align     optional 'start' | 'center' | 'end' (default 'start')
 */
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

export default function SortHeader({
  k, label, sortKey, sortDir, onToggle,
  align = 'start',
  className = '',
  style = {},
}) {
  const active = sortKey === k
  return (
    <th
      onClick={() => onToggle(k)}
      className={className}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        textAlign: align,
        whiteSpace: 'nowrap',
        ...style,
      }}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{
          opacity: active ? 0.9 : 0.35,
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 0,
        }}>
          {!active
            ? <ArrowUpDown size={11} />
            : sortDir === 'asc'
              ? <ArrowUp size={11} />
              : <ArrowDown size={11} />}
        </span>
      </span>
    </th>
  )
}
