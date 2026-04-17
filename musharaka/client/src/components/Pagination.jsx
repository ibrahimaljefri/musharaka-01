import { ChevronRight, ChevronLeft } from 'lucide-react'

/**
 * Page pills + prev/next pagination.
 *
 * Props:
 *   page       {number}  — current page (1-indexed)
 *   totalPages {number}  — total number of pages
 *   onChange   {fn}      — called with new page number
 *   className  {string}  — extra wrapper classes
 */
export default function Pagination({ page, totalPages, onChange, className = '' }) {
  if (totalPages <= 1) return null

  // Build page numbers to show: always show first, last, and ±2 around current
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - 2 && i <= page + 2)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4 font-arabic" dir="rtl">
      {/* Prev */}
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="الصفحة السابقة"
      >
        <ChevronRight size={16} />
      </button>

      {/* Page pills */}
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-gray-400 dark:text-gray-500 text-sm select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-sm transition-colors ${
              p === page
                ? 'bg-yellow-600 text-white font-semibold'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="الصفحة التالية"
      >
        <ChevronLeft size={16} />
      </button>
    </div>
  )
}
