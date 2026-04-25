/**
 * Cross-browser smoke suite — Phase I.6
 *
 * Critical user flows that must work across chromium, firefox, webkit,
 * mobile (iPhone 14), and tablet (iPad Pro). Run via:
 *   npm run test:cross-browser
 *
 * Tests are written once; Playwright executes them under each project.
 */
import { test, expect } from '@playwright/test'

test.describe('cross-browser smoke', () => {
  test.describe('public', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('landing loads with hero heading', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveTitle(/عروة/)
      // Some pages render the hero text inside a non-h1 element; accept either
      const heroVisible = await page.locator('text=نظام إدارة المبيعات').first().isVisible()
      expect(heroVisible).toBe(true)
    })

    test('login form renders email + password + submit', async ({ page }) => {
      await page.goto('/login')
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })
  })

  test('dashboard renders heading after auth', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible()
  })

  test('sale-create form renders mode radios', async ({ page }) => {
    await page.goto('/sales/create')
    await expect(page.getByRole('heading', { name: 'إضافة مبيعات' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'يومي' })).toBeVisible()
  })

  test('branches page renders table or empty state', async ({ page }) => {
    await page.goto('/branches')
    await page.waitForSelector('table, [data-testid="empty-state"]', { timeout: 10_000 })
  })
})
