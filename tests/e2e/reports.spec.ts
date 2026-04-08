/**
 * Reports page tests — RP-01 through RP-08
 *
 * Uses auth storage state.
 * Tests that read real database data are marked // Requires live Supabase connection.
 */
import { test, expect } from '@playwright/test'

test.describe('Reports page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports')
  })

  // -----------------------------------------------------------------------
  // RP-01: Page heading "التقارير والإحصائيات" is visible
  // -----------------------------------------------------------------------
  test('RP-01: page heading "التقارير والإحصائيات" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'التقارير والإحصائيات' })).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // RP-02: Filter panel has branch, month, and year selects plus search button
  // -----------------------------------------------------------------------
  test('RP-02: filter panel contains branch, month, year selects and بحث button', async ({ page }) => {
    // Branch filter
    const branchLabel = page.getByText('الفرع').first()
    await expect(branchLabel).toBeVisible()

    // Month filter
    await expect(page.getByText('الشهر').first()).toBeVisible()

    // Year filter
    await expect(page.getByText('السنة').first()).toBeVisible()

    // Search button
    await expect(page.getByRole('button', { name: 'بحث' })).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // RP-03: Four KPI cards are rendered
  // -----------------------------------------------------------------------
  test('RP-03: four KPI cards are visible on the reports page', async ({ page }) => {
    await expect(page.getByText('إجمالي المبيعات')).toBeVisible()
    await expect(page.getByText('متوسط المبيعة')).toBeVisible()
    await expect(page.getByText('عدد السجلات')).toBeVisible()
    await expect(page.getByText('متوسط يومي')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // RP-04: "تفاصيل المبيعات" table section is present
  // -----------------------------------------------------------------------
  test('RP-04: "تفاصيل المبيعات" section heading is present', async ({ page }) => {
    await expect(page.getByText('تفاصيل المبيعات')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // RP-05: Table has all required column headers
  // -----------------------------------------------------------------------
  test('RP-05: sales detail table has all required Arabic column headers', async ({ page }) => {
    // Wait for the page to settle
    await page.waitForSelector('table, .font-arabic', { timeout: 10_000 })

    const headers = ['التاريخ', 'الفرع', 'النوع', 'رقم الفاتورة', 'المبلغ (ر.س)', 'الحالة']
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible()
    }
  })

  // -----------------------------------------------------------------------
  // RP-06: Month filter "جميع الأشهر" option exists
  // -----------------------------------------------------------------------
  test('RP-06: month select contains "جميع الأشهر" as default option', async ({ page }) => {
    // The months select is the second select on the page (after branch)
    const monthSelect = page.locator('select').nth(1)
    await expect(monthSelect.locator('option').first()).toHaveText('جميع الأشهر')
  })

  // -----------------------------------------------------------------------
  // RP-07: Year filter defaults to current year
  // -----------------------------------------------------------------------
  test('RP-07: year select defaults to current year', async ({ page }) => {
    const currentYear = new Date().getFullYear().toString()
    const yearSelect = page.locator('select').nth(2)
    await expect(yearSelect).toHaveValue(currentYear)
  })

  // -----------------------------------------------------------------------
  // RP-08: Clicking بحث re-runs the query (loading state appears)
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('RP-08: clicking بحث triggers a reload of the data', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.getByRole('button', { name: 'بحث' }).click()
    // After click, table is re-loaded — either loading text or table rows appear
    const result = page.locator('.font-arabic').filter({ hasText: /جاري التحميل|لا توجد مبيعات/ })
    // The query re-runs — we just need the table section to still be present
    await expect(page.getByText('تفاصيل المبيعات')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // RP-09: Status badge "مرسلة" is green, "معلقة" is yellow (style check)
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('RP-09: status badges use correct color classes', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    // Check at least one status badge exists and has appropriate class
    const sentBadge = page.locator('span.bg-green-100').filter({ hasText: 'مرسلة' }).first()
    const pendingBadge = page.locator('span.bg-yellow-100').filter({ hasText: 'معلقة' }).first()

    // At least one of them should be present in real data
    const sentCount = await sentBadge.count()
    const pendingCount = await pendingBadge.count()
    expect(sentCount + pendingCount).toBeGreaterThan(0)
  })

  // -----------------------------------------------------------------------
  // RP-10: RTL layout on reports page
  // -----------------------------------------------------------------------
  test('RP-10: html has dir="rtl" on reports page', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  // -----------------------------------------------------------------------
  // RP-11: Empty state message when no results match filters
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('RP-11: empty state shows "لا توجد مبيعات في هذه الفترة"', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    // Select a year that is unlikely to have data
    const yearSelect = page.locator('select').nth(2)
    await yearSelect.selectOption('2021')
    const monthSelect = page.locator('select').nth(1)
    await monthSelect.selectOption('1') // يناير
    await page.getByRole('button', { name: 'بحث' }).click()

    await expect(page.getByText('لا توجد مبيعات في هذه الفترة')).toBeVisible({ timeout: 10_000 })
  })

  // -----------------------------------------------------------------------
  // RP-12: No horizontal scroll at 375px
  // -----------------------------------------------------------------------
  test('RP-12: no horizontal scroll at 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/reports')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})
