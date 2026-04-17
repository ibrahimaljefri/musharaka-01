import { Search, X } from 'lucide-react'

/**
 * Search bar + result count badge for tables.
 *
 * Props:
 *   value       {string}    — current search string
 *   onChange    {fn}        — called with new search string
 *   count       {number}    — number of visible rows after filter
 *   total       {number}    — total rows before filter
 *   placeholder {string}    — input placeholder (default: "بحث...")
 *   className   {string}    — extra wrapper classes
 */
export default function TableControls({
  value,
  onChange,
  count,
  total,
  placeholder = 'بحث...',
  className = '',
}) {
  const filtered = count !== undefined && count !== total

  return (
    <div className={`flex items-center gap-3 mb-4 ${className}`} dir="rtl">
      {/* Search input */}
      <div className="relative flex-1 max-w-xs">
        <Search
          size={15}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-base pr-9 py-1.5 text-sm"
          dir="rtl"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="مسح البحث"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Count badge */}
      {count !== undefined && (
        <span className={`text-xs font-arabic px-2 py-1 rounded-full flex-shrink-0 ${
          filtered
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        }`}>
          {filtered ? `${count} من ${total}` : `${total} سجل`}
        </span>
      )}
    </div>
  )
}
