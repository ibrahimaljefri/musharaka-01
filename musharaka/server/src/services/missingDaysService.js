const { getDaysInMonth } = require('../utils/dateUtils')

/**
 * Find days in a calendar month that have no sent sales.
 * Groups consecutive missing dates into ranges.
 *
 * @param {number} month - 1-12
 * @param {number} year
 * @param {string[]} sentDates - Array of YYYY-MM-DD strings that were sent
 * @returns {Array<{start: string, end: string, count: number}>}
 */
function getMissingDays(month, year, sentDates) {
  const allDays = getDaysInMonth(month, year)
  const sentSet = new Set(sentDates)
  const missing = allDays.filter(d => !sentSet.has(d))

  if (missing.length === 0) return []

  // Group consecutive dates into ranges
  const ranges = []
  let rangeStart = missing[0]
  let prev       = missing[0]

  for (let i = 1; i < missing.length; i++) {
    const curr     = missing[i]
    const prevDate = new Date(prev)
    const currDate = new Date(curr)
    prevDate.setDate(prevDate.getDate() + 1)

    if (prevDate.toISOString().split('T')[0] !== curr) {
      // Gap — close current range
      ranges.push({ start: rangeStart, end: prev, count: _daysBetween(rangeStart, prev) })
      rangeStart = curr
    }
    prev = curr
  }
  ranges.push({ start: rangeStart, end: prev, count: _daysBetween(rangeStart, prev) })

  return ranges
}

function _daysBetween(start, end) {
  const s = new Date(start), e = new Date(end)
  return Math.round((e - s) / 86400000) + 1
}

module.exports = { missingDaysService: { getMissingDays } }
