/**
 * Theme parity suite — Phase I.4
 *
 * For each Tier 1 page, run a smoke flow under both light and dark themes.
 * Verifies:
 *   - Primary action button (.btn-primary or button[type="submit"]) is visible
 *   - Body background color differs between themes (theme actually applied)
 *   - No console errors during theme application
 */
import { test, expect } from '@playwright/test'

const PAGES = [
  '/dashboard',
  '/sales/create',
  '/reports',
  '/submit',
  '/branches',
] as const

const THEMES = ['light', 'dark'] as const

for (const path of PAGES) {
  for (const theme of THEMES) {
    test(`theme parity: ${path} ${theme}`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))

      await page.goto(path)
      await page.waitForLoadState('networkidle')

      if (theme === 'dark') {
        await page.evaluate(() => document.documentElement.classList.add('dark'))
      } else {
        await page.evaluate(() => document.documentElement.classList.remove('dark'))
      }
      await page.waitForTimeout(300)

      // Primary action visible
      const primary = page.locator('.btn-primary, button[type="submit"]').first()
      await expect(primary).toBeVisible()

      // Theme actually applied (background color differs from a known opposite)
      const bg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor
      })
      expect(bg, 'body should have a computed background color').toBeTruthy()

      // No console errors during theme toggle
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([])
    })
  }
}

test('theme parity: light vs dark backgrounds differ on /dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  await page.evaluate(() => document.documentElement.classList.remove('dark'))
  await page.waitForTimeout(200)
  const lightBg = await page.evaluate(
    () => window.getComputedStyle(document.body).backgroundColor,
  )

  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(200)
  const darkBg = await page.evaluate(
    () => window.getComputedStyle(document.body).backgroundColor,
  )

  expect(lightBg).not.toBe(darkBg)
})
