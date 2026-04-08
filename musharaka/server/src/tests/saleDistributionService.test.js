import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { saleDistributionService } = require('../services/saleDistributionService')
const { getDaysInMonth } = require('../utils/dateUtils')
const { expand } = saleDistributionService

describe('saleDistributionService.expand', () => {
  const BASE = { branch_id: 'uuid-1', invoice_number: null, notes: null }

  // ─── daily ───────────────────────────────────────────────────────────────────

  describe('daily input', () => {
    it('returns exactly 1 row', () => {
      const rows = expand({ ...BASE, input_type: 'daily', amount: 50, sale_date: '2026-03-15' })
      expect(rows).toHaveLength(1)
    })

    it('row has correct amount, sale_date, and status=pending', () => {
      const rows = expand({ ...BASE, input_type: 'daily', amount: 123.45, sale_date: '2026-03-15' })
      expect(rows[0].amount).toBe(123.45)
      expect(rows[0].sale_date).toBe('2026-03-15')
      expect(rows[0].status).toBe('pending')
    })

    it('row carries branch_id, invoice_number, notes', () => {
      const rows = expand({
        branch_id: 'branch-abc',
        input_type: 'daily',
        amount: 10,
        sale_date: '2026-01-01',
        invoice_number: 'INV-001',
        notes: 'test note',
      })
      expect(rows[0].branch_id).toBe('branch-abc')
      expect(rows[0].invoice_number).toBe('INV-001')
      expect(rows[0].notes).toBe('test note')
    })

    it('throws if sale_date is missing', () => {
      expect(() =>
        expand({ ...BASE, input_type: 'daily', amount: 50 })
      ).toThrow()
    })
  })

  // ─── monthly — January 2026 (31 days) ────────────────────────────────────────

  describe('monthly input — January 2026 (31 days)', () => {
    // Use getDaysInMonth to get what the service actually produces
    const actualDays = getDaysInMonth(1, 2026)
    const DATA = { ...BASE, input_type: 'monthly', amount: 310, month: 1, year: 2026 }

    it('returns exactly 31 rows', () => {
      expect(expand(DATA)).toHaveLength(31)
    })

    it('SUM of row amounts equals original amount exactly (no float drift)', () => {
      const rows = expand(DATA)
      const sumFils = rows.reduce((acc, r) => acc + Math.round(r.amount * 100), 0)
      expect(sumFils).toBe(Math.round(DATA.amount * 100))
    })

    it('remainder distributed to first N rows only — 100.01 SAR / 31 days', () => {
      // totalFils=10001, baseFils=322, remainder=10001 - 322*31 = 19
      // first 19 rows get 3.23, rest get 3.22
      const rows = expand({ ...BASE, input_type: 'monthly', amount: 100.01, month: 1, year: 2026 })
      const totalFils = Math.round(100.01 * 100)   // 10001
      const baseFils  = Math.floor(totalFils / 31)  // 322
      const remainder = totalFils - baseFils * 31   // 19

      for (let i = 0; i < 31; i++) {
        const expectedFils = baseFils + (i < remainder ? 1 : 0)
        expect(Math.round(rows[i].amount * 100)).toBe(expectedFils)
      }
    })

    it('all rows have correct month=1, year=2026', () => {
      const rows = expand(DATA)
      rows.forEach(r => {
        expect(r.month).toBe(1)
        expect(r.year).toBe(2026)
      })
    })

    it('all sale_dates match what getDaysInMonth(1, 2026) produces', () => {
      const rows = expand(DATA)
      rows.forEach((r, i) => {
        expect(r.sale_date).toBe(actualDays[i])
      })
    })

    it('first and last sale_date match getDaysInMonth boundaries', () => {
      const rows = expand(DATA)
      expect(rows[0].sale_date).toBe(actualDays[0])
      expect(rows[30].sale_date).toBe(actualDays[30])
    })
  })

  // ─── monthly — February 2024 (leap year, 29 days) ────────────────────────────

  describe('monthly input — February 2024 (leap year, 29 days)', () => {
    const actualDays = getDaysInMonth(2, 2024)
    const DATA = { ...BASE, input_type: 'monthly', amount: 290, month: 2, year: 2024 }

    it('returns exactly 29 rows', () => {
      expect(expand(DATA)).toHaveLength(29)
    })

    it('SUM equals original amount', () => {
      const rows = expand(DATA)
      const sumFils = rows.reduce((acc, r) => acc + Math.round(r.amount * 100), 0)
      expect(sumFils).toBe(Math.round(DATA.amount * 100))
    })

    it('last sale_date matches getDaysInMonth(2, 2024) last entry', () => {
      const rows = expand(DATA)
      expect(rows[28].sale_date).toBe(actualDays[28])
    })

    it('all sale_dates match getDaysInMonth(2, 2024) output', () => {
      const rows = expand(DATA)
      rows.forEach((r, i) => {
        expect(r.sale_date).toBe(actualDays[i])
      })
    })
  })

  // ─── monthly — February 2025 (non-leap, 28 days) ─────────────────────────────

  describe('monthly input — February 2025 (non-leap, 28 days)', () => {
    const actualDays = getDaysInMonth(2, 2025)
    const DATA = { ...BASE, input_type: 'monthly', amount: 280, month: 2, year: 2025 }

    it('returns exactly 28 rows', () => {
      expect(expand(DATA)).toHaveLength(28)
    })

    it('last sale_date matches getDaysInMonth(2, 2025) last entry', () => {
      const rows = expand(DATA)
      expect(rows[27].sale_date).toBe(actualDays[27])
    })

    it('SUM equals original amount', () => {
      const rows = expand(DATA)
      const sumFils = rows.reduce((acc, r) => acc + Math.round(r.amount * 100), 0)
      expect(sumFils).toBe(Math.round(DATA.amount * 100))
    })

    it('all sale_dates match getDaysInMonth(2, 2025) output', () => {
      const rows = expand(DATA)
      rows.forEach((r, i) => {
        expect(r.sale_date).toBe(actualDays[i])
      })
    })
  })

  // ─── range input ─────────────────────────────────────────────────────────────
  // Note: getDaysInRange uses new Date(dateString) which parses as UTC, so range
  // dates passed as YYYY-MM-DD strings are returned correctly (no shift).

  describe('range input', () => {
    it('5-day range returns 5 rows', () => {
      const rows = expand({
        ...BASE, input_type: 'range', amount: 50,
        period_start_date: '2026-03-01', period_end_date: '2026-03-05',
      })
      expect(rows).toHaveLength(5)
    })

    it('SUM equals original amount', () => {
      const rows = expand({
        ...BASE, input_type: 'range', amount: 99.99,
        period_start_date: '2026-03-01', period_end_date: '2026-03-05',
      })
      const sumFils = rows.reduce((acc, r) => acc + Math.round(r.amount * 100), 0)
      expect(sumFils).toBe(Math.round(99.99 * 100))
    })

    it('throws if start > end', () => {
      expect(() =>
        expand({
          ...BASE, input_type: 'range', amount: 50,
          period_start_date: '2026-03-10', period_end_date: '2026-03-01',
        })
      ).toThrow()
    })

    it('throws if start is missing', () => {
      expect(() =>
        expand({
          ...BASE, input_type: 'range', amount: 50,
          period_end_date: '2026-03-05',
        })
      ).toThrow()
    })

    it('throws if end is missing', () => {
      expect(() =>
        expand({
          ...BASE, input_type: 'range', amount: 50,
          period_start_date: '2026-03-01',
        })
      ).toThrow()
    })

    it('1-day range returns 1 row with full amount', () => {
      const rows = expand({
        ...BASE, input_type: 'range', amount: 77.77,
        period_start_date: '2026-06-15', period_end_date: '2026-06-15',
      })
      expect(rows).toHaveLength(1)
      expect(rows[0].amount).toBe(77.77)
    })

    it('1-day range sale_date equals period_start_date', () => {
      const rows = expand({
        ...BASE, input_type: 'range', amount: 77.77,
        period_start_date: '2026-06-15', period_end_date: '2026-06-15',
      })
      expect(rows[0].sale_date).toBe('2026-06-15')
    })

    it('range rows carry period_start_date and period_end_date', () => {
      const rows = expand({
        ...BASE, input_type: 'range', amount: 100,
        period_start_date: '2026-04-01', period_end_date: '2026-04-03',
      })
      rows.forEach(r => {
        expect(r.period_start_date).toBe('2026-04-01')
        expect(r.period_end_date).toBe('2026-04-03')
      })
    })

    it('sale_dates are sequential across range', () => {
      const rows = expand({
        ...BASE, input_type: 'range', amount: 100,
        period_start_date: '2026-04-01', period_end_date: '2026-04-05',
      })
      expect(rows[0].sale_date).toBe('2026-04-01')
      expect(rows[4].sale_date).toBe('2026-04-05')
    })
  })

  // ─── amount precision ─────────────────────────────────────────────────────────

  describe('amount precision', () => {
    it('10 SAR / 3 days: rows sum to exactly 10 SAR (no float drift)', () => {
      // 1000 fils / 3 = 333 base, remainder 1 → first row gets 334, rest 333
      const rows = expand({
        ...BASE, input_type: 'range', amount: 10,
        period_start_date: '2026-01-01', period_end_date: '2026-01-03',
      })
      expect(rows).toHaveLength(3)
      const sumFils = rows.reduce((acc, r) => acc + Math.round(r.amount * 100), 0)
      expect(sumFils).toBe(1000)
      // first row gets the extra fils
      expect(Math.round(rows[0].amount * 100)).toBe(334)
      expect(Math.round(rows[1].amount * 100)).toBe(333)
      expect(Math.round(rows[2].amount * 100)).toBe(333)
    })

    it('1 SAR / 7 days: rows sum to exactly 1 SAR', () => {
      // 100 fils / 7 = 14 base, remainder 2 → first 2 rows get 15, rest 14
      const rows = expand({
        ...BASE, input_type: 'range', amount: 1,
        period_start_date: '2026-01-01', period_end_date: '2026-01-07',
      })
      expect(rows).toHaveLength(7)
      const sumFils = rows.reduce((acc, r) => acc + Math.round(r.amount * 100), 0)
      expect(sumFils).toBe(100)
      expect(Math.round(rows[0].amount * 100)).toBe(15)
      expect(Math.round(rows[1].amount * 100)).toBe(15)
      expect(Math.round(rows[2].amount * 100)).toBe(14)
    })

    it('monthly 1000.00 SAR / 31 days: sum is exact', () => {
      const rows = expand({ ...BASE, input_type: 'monthly', amount: 1000, month: 1, year: 2026 })
      const sumFils = rows.reduce((acc, r) => acc + Math.round(r.amount * 100), 0)
      expect(sumFils).toBe(100000)
    })

    it('evenly-divisible amount has zero remainder (all rows equal)', () => {
      // 3.00 SAR / 3 days = exactly 1.00 per day
      const rows = expand({
        ...BASE, input_type: 'range', amount: 3,
        period_start_date: '2026-05-01', period_end_date: '2026-05-03',
      })
      rows.forEach(r => {
        expect(Math.round(r.amount * 100)).toBe(100)
      })
    })
  })

  // ─── invalid input_type ───────────────────────────────────────────────────────

  describe('invalid input', () => {
    it('throws on unknown input_type', () => {
      expect(() =>
        expand({ ...BASE, input_type: 'weekly', amount: 100 })
      ).toThrow()
    })
  })
})
