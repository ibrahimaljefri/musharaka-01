/**
 * Submit to Seinomy page tests — SB-01 through SB-06
 * Uses auth storage state.
 */
import { test, expect } from '@playwright/test'

test.describe('Submit to Seinomy page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/submit')
  })

  // SB-01: Page heading and form fields visible
  test('SB-01: "إرسال الفواتير" heading and selects are visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /إرسال الفواتير/ })).toBeVisible()
    // Branch, month, and year selects must all be present
    await expect(page.locator('select').nth(0)).toBeVisible() // branch
    await expect(page.locator('select').nth(1)).toBeVisible() // month
    await expect(page.locator('select').nth(2)).toBeVisible() // year
  })

  // SB-02: Submitting without branch shows Arabic error
  test('SB-02: submitting without selecting a branch shows Arabic error', async ({ page }) => {
    await page.getByRole('button', { name: /إرسال/ }).click()
    await expect(page.getByText(/يرجى اختيار الفرع/)).toBeVisible()
  })

  // SB-03: Seinomy sync status indicator is visible
  test('SB-03: Seinomy sync status badge is visible in the topbar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.getByText(/متصل بسينومي|غير متصل/)).toBeVisible()
  })

  // SB-04: Successful submission (mock) — requires live API + Supabase
  test('SB-04: successful submission shows Arabic success message with invoice count', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection and pending invoices')
    await page.locator('select').nth(0).selectOption({ index: 1 }) // pick first branch
    await page.locator('select').nth(1).selectOption('1')          // January
    await page.locator('select').nth(2).selectOption('2026')       // 2026
    await page.getByRole('button', { name: /إرسال/ }).click()
    await expect(page.getByText(/تم إرسال الفواتير/)).toBeVisible({ timeout: 15_000 })
  })

  // SB-05: Re-submitting same period shows Arabic duplicate error
  test('SB-05: re-submitting an already submitted period shows Arabic error', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection with a prior submission')
  })

  // SB-06: "تقرير الإرسالات" link navigates to /submissions
  test('SB-06: "تقرير الإرسالات" link navigates to /submissions page', async ({ page }) => {
    await page.getByRole('link', { name: /تقرير الإرسالات/ }).click()
    await expect(page).toHaveURL('/submissions')
  })

  // SB-07: RTL confirmed
  test('SB-07: html has dir="rtl"', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})
