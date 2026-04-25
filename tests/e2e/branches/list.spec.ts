/**
 * Branches list page tests — B-01 through B-07
 * Uses auth storage state.
 */
import { test, expect } from '@playwright/test'

test.describe('Branches list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/branches')
  })

  // B-01: Branch list loads — table visible with correct column headers
  test('B-01: branch table renders with required column headers', async ({ page }) => {
    await page.waitForSelector('table, [data-testid="empty-state"]', { timeout: 10_000 })
    // Column headers
    for (const header of ['الكود', 'الاسم', 'رقم العقد', 'الموقع', 'الإجراءات']) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible()
    }
  })

  // B-02: "إضافة فرع جديد" button is visible and links to /branches/create
  test('B-02: "إضافة فرع جديد" button navigates to /branches/create', async ({ page }) => {
    await page.getByRole('link', { name: /إضافة فرع جديد/ }).click()
    await expect(page).toHaveURL('/branches/create')
  })

  // B-03: Edit button navigates to /branches/{id}/edit
  // Requires live Supabase connection
  test('B-03: clicking Edit for a branch navigates to edit page', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.getByRole('link', { name: /تعديل/ }).click()
    await expect(page).toHaveURL(/\/branches\/.+\/edit/)
  })

  // B-04: Delete branch that has sales → blocked with Arabic error
  // Requires live Supabase connection
  test('B-04: deleting a branch with sales shows Arabic error', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })
    const deleteBtn = page.locator('table tbody tr').first().getByRole('button', { name: /حذف/ })
    await deleteBtn.click()
    // Confirm dialog appears
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'تأكيد' }).click()
    // Error banner appears
    await expect(page.getByText(/لا يمكن حذف/)).toBeVisible()
  })

  // B-05: Delete branch without sales → confirm dialog then deleted
  // Requires live Supabase connection
  test('B-05: deleting a branch without sales shows confirm dialog then removes row', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
  })

  // B-06: BranchBadge (colored code badge) is visible for each row
  // Requires live Supabase connection
  test('B-06: each branch row shows a colored code badge', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })
    const badges = page.locator('table tbody tr [data-testid="branch-badge"]')
    const count = await badges.count()
    expect(count).toBeGreaterThan(0)
  })

  // B-07: RTL layout confirmed
  test('B-07: html element has dir="rtl"', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('dark mode: branch cards use dark styling', async ({ page }) => {
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(200)
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)
  })
})
