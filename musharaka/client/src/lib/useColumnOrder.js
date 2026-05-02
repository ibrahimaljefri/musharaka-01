/**
 * useColumnOrder — persist a column order array to localStorage.
 *
 * @param {string[]} defaultOrder  - Canonical column keys in default order.
 * @param {string} lsKey           - localStorage key (per-page, unique).
 * @returns {[string[], (next: string[]) => void]}
 */
import { useState } from 'react'

export function useColumnOrder(defaultOrder, lsKey) {
  const [order, setOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(lsKey) || 'null')
      if (
        Array.isArray(saved) &&
        saved.length === defaultOrder.length &&
        saved.every(k => defaultOrder.includes(k))
      ) return saved
    } catch { /* ignore parse errors */ }
    return [...defaultOrder]
  })

  function persist(next) {
    try { localStorage.setItem(lsKey, JSON.stringify(next)) } catch { /* quota / disabled */ }
    setOrder(next)
  }

  return [order, persist]
}
