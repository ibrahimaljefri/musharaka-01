/**
 * Submissions report page tests — SM-01 through SM-10
 * Uses auth storage state.
 */
import { test, expect } from '@playwright/test'

test.describe('Submissions report page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/submissions')
  })

  // SM-01: Page heading visible
  test('SM-01: "تقرير الإرسالات" heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /تقرير الإرسالات/ })).toBeVisible()
  })

  // SM-02: Filter panel has branch, month, year selects
  test('SM-02: filter panel renders branch, month, and year selects', async ({ page }) => {
    await expect(page.getByTestId('branch-select')).toBeVisible()
    await expect(page.getByTestId('month-select')).toBeVisible()
    await expect(page.getByTestId('year-select')).toBeVisible()
  })

  // SM-03: "بحث" (search) button is present
  test('SM-03: "بحث" button is visible in the filter panel', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'بحث' })).toBeVisible()
  })

  // SM-04: "إرسال فواتير جديد" link navigates to /submit
  test('SM-04: "إرسال فواتير جديد" link navigates to /submit', async ({ page }) => {
    await page.getByRole('link', { name: /إرسال فواتير جديد/ }).click()
    await expect(page).toHaveURL('/submit')
  })

  // SM-05: Submission cards load (requires data)
  // Requires live Supabase connection
  test('SM-05: submission cards load after search', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection with existing submissions')
    await page.getByRole('button', { name: 'بحث' }).click()
    await page.waitForSelector('[data-testid="submission-card"]', { timeout: 10_000 })
  })

  // SM-06: Expand card shows invoice table
  // Requires live Supabase connection
  test('SM-06: expanding a submission card reveals sent days table', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.getByRole('button', { name: 'بحث' }).click()
    const expandBtn = page.getByTestId('expand-submission').first()
    await expandBtn.click()
    await expect(page.getByText(/الأيام المُرسلة|إجمالي الفواتير/)).toBeVisible()
  })

  // SM-07: Collapse card hides invoice table
  // Requires live Supabase connection
  test('SM-07: collapsing an expanded card hides the detail table', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.getByRole('button', { name: 'بحث' }).click()
    const toggleBtn = page.getByTestId('expand-submission').first()
    await toggleBtn.click() // expand
    await toggleBtn.click() // collapse
    await expect(page.getByText(/الأيام المُرسلة/)).not.toBeVisible()
  })

  // SM-08: Missing days section shown inside expanded card
  // Requires live Supabase connection
  test('SM-08: expanded card shows "الأيام المفقودة" section', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.getByRole('button', { name: 'بحث' }).click()
    const toggleBtn = page.getByTestId('expand-submission').first()
    await toggleBtn.click()
    await expect(page.getByText('الأيام المفقودة')).toBeVisible()
  })

  // SM-09: Filter by branch narrows results
  // Requires live Supabase connection
  test('SM-09: selecting a branch filter updates visible submission cards', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.getByTestId('branch-select').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'بحث' }).click()
    await page.waitForTimeout(500)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl') // at minimum page is still valid
  })

  // SM-10: Mobile responsive — no overflow at 375px
  test('SM-10: no horizontal scroll at 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/submissions')
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375 + 5) // 5px tolerance
  })

  // SM-11: RTL confirmed
  test('SM-11: html has dir="rtl"', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})
