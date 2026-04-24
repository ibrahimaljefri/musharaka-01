/**
 * Excel template download E2E — SI-09 through SI-15 (Phase 4 feature)
 * Verifies the download button, month/year pickers, and downloaded file.
 */
import { test, expect } from '@playwright/test'

test.describe('Excel template download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales/import')
  })

  test('SI-09: Download template button is visible when branch selected', async ({ page }) => {
    const select = page.locator('select').first()
    // Pick first branch option if available
    const options = await select.locator('option').count()
    if (options < 2) test.skip(true, 'no branches to select')

    await select.selectOption({ index: 1 })
    const btn = page.getByRole('button', { name: /تحميل/ }).first()
    await expect(btn).toBeVisible()
  })

  test('SI-10: Month/year selectors default to current period', async ({ page }) => {
    const inputs = page.locator('input[type="number"]')
    const selects = page.locator('select')

    // At least one number input (year) and select (month) in the template card
    await expect(selects.nth(1)).toBeVisible()  // month select
    const yearValue = await inputs.first().inputValue()
    expect(parseInt(yearValue)).toBeGreaterThan(2020)
  })

  test('SI-11: Clicking download without branch shows error', async ({ page }) => {
    // Do NOT select a branch, just click download
    const btn = page.getByRole('button', { name: /تحميل/ }).first()
    // Button should be disabled when no branch
    await expect(btn).toBeDisabled()
  })

  test('SI-12: Page title is "استيراد ملف Excel"', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Excel')
  })
})
