/**
 * useSortable — generic client-side sort hook for table rows.
 *
 *   const { sorted, sortKey, sortDir, toggle } = useSortable(rows, 'created_at', 'desc')
 *
 * Sorts numbers numerically and strings via Arabic-aware localeCompare.
 * Null/undefined always sort to the end regardless of direction.
 *
 * Pass a custom `getter(row, key)` if a column maps to a nested or computed
 * value (e.g., key='tenant.name' or key='created_at' but you want a Date object).
 */
import { useState, useMemo } from 'react'

export function useSortable(rows, defaultKey = null, defaultDir = 'desc', getter = null) {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir)

  const get = getter || ((row, key) => row?.[key])

  const sorted = useMemo(() => {
    if (!sortKey || !Array.isArray(rows)) return rows
    // ISO date string pattern: YYYY-MM-DD or YYYY-MM-DDTHH:...
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}/
    const arr = [...rows]
    arr.sort((a, b) => {
      const av = get(a, sortKey)
      const bv = get(b, sortKey)
      // Nulls always last
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      // Numbers (explicit number type from getter, e.g. parseFloat)
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      const an = Number(av), bn = Number(bv)
      if (!Number.isNaN(an) && !Number.isNaN(bn) && typeof av !== 'string' && typeof bv !== 'string') {
        return an - bn
      }
      // ISO date strings — compare lexicographically (YYYY-MM-DD sorts correctly as string)
      const sa = String(av), sb = String(bv)
      if (ISO_DATE.test(sa) && ISO_DATE.test(sb)) {
        return sa < sb ? -1 : sa > sb ? 1 : 0
      }
      // Default: Arabic-aware locale compare
      return sa.localeCompare(sb, 'ar', { numeric: true })
    })
    return sortDir === 'desc' ? arr.reverse() : arr
  }, [rows, sortKey, sortDir, get])

  const toggle = (k) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else                { setSortKey(k); setSortDir('asc') }
  }

  return { sorted, sortKey, sortDir, toggle, setSortKey, setSortDir }
}
