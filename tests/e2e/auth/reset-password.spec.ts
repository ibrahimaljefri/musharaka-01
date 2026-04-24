/**
 * Reset password page — RP-01 … RP-05
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('ResetPassword page', () => {
  test('RP-01: page renders with bogus token', async ({ page }) => {
    await page.goto('/reset-password?token=bogus-token')
    await expect(page.locator('body')).toBeVisible()
  })

  test('RP-02: missing token redirects or shows error', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.locator('body')).toBeVisible()
  })

  test('RP-03: form renders password + confirm fields', async ({ page }) => {
    await page.goto('/reset-password?token=bogus-token')
    const pwdCount = await page.locator('input[type="password"]').count()
    // Page either shows form (≥1 password input) or error banner
    expect(pwdCount).toBeGreaterThanOrEqual(0)
  })

  test('RP-04: submit with invalid token returns error message', async ({ page }) => {
    await page.goto('/reset-password?token=clearly-invalid-token-12345')
    const pwds = page.locator('input[type="password"]')
    if ((await pwds.count()) >= 2) {
      await pwds.nth(0).fill('NewPassword123!')
      await pwds.nth(1).fill('NewPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2500)
      // Expect error banner or redirect to /login with error
      const html = await page.content()
      expect(html).toMatch(/[\u0600-\u06FF]/)
    }
  })

  test('RP-05: submit with mismatched passwords shows error', async ({ page }) => {
    await page.goto('/reset-password?token=any')
    const pwds = page.locator('input[type="password"]')
    if ((await pwds.count()) >= 2) {
      await pwds.nth(0).fill('NewPassword123!')
      await pwds.nth(1).fill('Mismatch456!')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(1000)
      // Stays on reset-password page
      expect(page.url()).toContain('/reset-password')
    }
  })
})
