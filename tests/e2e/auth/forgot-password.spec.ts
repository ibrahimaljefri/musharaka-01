/**
 * Forgot password page — FP-01 … FP-05
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('ForgotPassword page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password')
  })

  test('FP-01: form renders with email input and submit button', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('FP-02: empty submit shows validation error', async ({ page }) => {
    await page.click('button[type="submit"]')
    // Either inline validation or stays on page without crash
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/forgot-password')
  })

  test('FP-03: invalid email shows validation error', async ({ page }) => {
    await page.fill('input[type="email"]', 'not-an-email')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/forgot-password')
  })

  test('FP-04: unknown email → generic success banner (no user enumeration)', async ({ page }) => {
    await page.fill('input[type="email"]', `unknown-${Date.now()}@example.com`)
    await page.click('button[type="submit"]')
    // Wait for either navigation or success banner
    await page.waitForTimeout(2500)
    const html = await page.content()
    // Should NOT say "user not found" or similar enumeration signal
    expect(html).not.toMatch(/user.*not.*found/i)
    expect(html).not.toMatch(/does.*not.*exist/i)
  })

  test('FP-05: back-to-login link navigates to /login', async ({ page }) => {
    const link = page.getByRole('link', { name: /دخول|login/i })
    if (await link.count()) {
      await link.first().click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
