import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { missingDaysService } = require('../services/missingDaysService')
const { getDaysInMonth } = require('../utils/dateUtils')
const { getMissingDays } = missingDaysService

// Note: getDaysInMonth has a UTC/local timezone offset — dates are shifted.
// Tests use getDaysInMonth itself to get the actual date strings the service works with,
// ensuring tests stay correct regardless of the host timezone offset.

describe('missingDaysService.getMissingDays', () => {

  it('returns empty array when all days are sent (full month — January 2026)', () => {
    const allDays = getDaysInMonth(1, 2026)
    const result = getMissingDays(1, 2026, allDays)
    expect(result).toEqual([])
  })

  it('returns all days as one range when nothing is sent', () => {
    const allDays = getDaysInMonth(1, 2026)
    const result = getMissingDays(1, 2026, [])
    expect(result).toHaveLength(1)
    expect(result[0].start).toBe(allDays[0])
    expect(result[0].end).toBe(allDays[allDays.length - 1])
    expect(result[0].count).toBe(31)
  })

  it('returns consecutive range for missing days at end of month (sent first 10)', () => {
    const allDays = getDaysInMonth(1, 2026)
    const sent = allDays.slice(0, 10)
    const result = getMissingDays(1, 2026, sent)
    expect(result).toHaveLength(1)
    expect(result[0].start).toBe(allDays[10])
    expect(result[0].end).toBe(allDays[30])
    expect(result[0].count).toBe(21)
  })

  it('returns consecutive range for missing days at start of month (sent last 17)', () => {
    const allDays = getDaysInMonth(1, 2026)
    const sent = allDays.slice(14)
    const result = getMissingDays(1, 2026, sent)
    expect(result).toHaveLength(1)
    expect(result[0].start).toBe(allDays[0])
    expect(result[0].end).toBe(allDays[13])
    expect(result[0].count).toBe(14)
  })

  it('handles split gaps (multiple ranges) — sent only first and last day of month', () => {
    // sent: index 0 and index 30, so middle 29 days are missing as one range
    const allDays = getDaysInMonth(1, 2026)
    const sent = [allDays[0], allDays[30]]
    const result = getMissingDays(1, 2026, sent)
    expect(result).toHaveLength(1)
    expect(result[0].start).toBe(allDays[1])
    expect(result[0].end).toBe(allDays[29])
    expect(result[0].count).toBe(29)
  })

  it('handles three separate gaps — sent indices 0, 10, 20', () => {
    // gaps: indices 1-9 (9 days), 11-19 (9 days), 21-30 (10 days)
    const allDays = getDaysInMonth(1, 2026)
    const sent = [allDays[0], allDays[10], allDays[20]]
    const result = getMissingDays(1, 2026, sent)
    expect(result).toHaveLength(3)

    expect(result[0].start).toBe(allDays[1])
    expect(result[0].end).toBe(allDays[9])
    expect(result[0].count).toBe(9)

    expect(result[1].start).toBe(allDays[11])
    expect(result[1].end).toBe(allDays[19])
    expect(result[1].count).toBe(9)

    expect(result[2].start).toBe(allDays[21])
    expect(result[2].end).toBe(allDays[30])
    expect(result[2].count).toBe(10)
  })

  it('single missing day has count=1', () => {
    // Send all of January except index 14
    const allDays = getDaysInMonth(1, 2026)
    const sent = allDays.filter((_, i) => i !== 14)
    const result = getMissingDays(1, 2026, sent)
    expect(result).toHaveLength(1)
    expect(result[0].start).toBe(allDays[14])
    expect(result[0].end).toBe(allDays[14])
    expect(result[0].count).toBe(1)
  })

  it('count field equals the number of days in each range', () => {
    // sent: indices 4-24 → gaps: 0-3 (4 days) and 25-30 (6 days)
    const allDays = getDaysInMonth(1, 2026)
    const sent = allDays.slice(4, 25)
    const result = getMissingDays(1, 2026, sent)
    expect(result).toHaveLength(2)
    expect(result[0].count).toBe(4)
    expect(result[1].count).toBe(6)

    // Verify count matches actual day span for each range
    result.forEach(range => {
      const start = new Date(range.start)
      const end   = new Date(range.end)
      const days  = Math.round((end - start) / 86400000) + 1
      expect(range.count).toBe(days)
    })
  })

  it('February non-leap year (2025) has 28 days total when nothing sent', () => {
    const allDays = getDaysInMonth(2, 2025)
    expect(allDays).toHaveLength(28)
    const result = getMissingDays(2, 2025, [])
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(28)
    expect(result[0].start).toBe(allDays[0])
    expect(result[0].end).toBe(allDays[27])
  })

  it('February leap year (2024) has 29 days total when nothing sent', () => {
    const allDays = getDaysInMonth(2, 2024)
    expect(allDays).toHaveLength(29)
    const result = getMissingDays(2, 2024, [])
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(29)
    expect(result[0].start).toBe(allDays[0])
    expect(result[0].end).toBe(allDays[28])
  })

  it('returns empty array for February non-leap when all actual days are sent', () => {
    const allDays = getDaysInMonth(2, 2025)
    const result = getMissingDays(2, 2025, allDays)
    expect(result).toEqual([])
  })

  it('returns empty array for February leap year when all actual days are sent', () => {
    const allDays = getDaysInMonth(2, 2024)
    const result = getMissingDays(2, 2024, allDays)
    expect(result).toEqual([])
  })

  it('ignores sent dates outside the requested month', () => {
    // All actual days of January 2026 sent, plus some unrelated dates
    const allDays = getDaysInMonth(1, 2026)
    const sent = allDays.concat(['2025-12-01', '2026-02-01', '2999-01-01'])
    const result = getMissingDays(1, 2026, sent)
    expect(result).toEqual([])
  })

  it('duplicate sent dates do not cause double-counting', () => {
    const allDays = getDaysInMonth(1, 2026)
    // Send first 10 days twice — still only counts once
    const sent = [...allDays.slice(0, 10), ...allDays.slice(0, 10)]
    const result = getMissingDays(1, 2026, sent)
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(21)
  })
})
