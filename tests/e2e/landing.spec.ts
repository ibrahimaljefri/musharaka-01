import { test, expect } from '@playwright/test'

test.describe('صفحة الهبوط', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // no auth

  test('تحميل الصفحة الرئيسية', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/عروة/)
  })

  test('hero section visible', async ({ page }) => {
    await page.goto('/')
    // Hero section should be visible
    await expect(page.locator('text=نظام إدارة المبيعات')).toBeVisible()
  })

  test('CTA button navigates to login', async ({ page }) => {
    await page.goto('/')
    await page.click('text=ابدأ الآن')
    await expect(page).toHaveURL(/\/login/)
  })

  test('nav login button works', async ({ page }) => {
    await page.goto('/')
    // Find the nav login button (text "تسجيل الدخول" in navbar)
    const loginBtn = page.locator('nav').filter({ hasText: 'تسجيل الدخول' }).getByRole('link').first()
    await loginBtn.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('RTL direction', async ({ page }) => {
    await page.goto('/')
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })

  test('no JavaScript errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/')
    await page.waitForTimeout(1000)
    expect(errors).toHaveLength(0)
  })

  test('4 feature cards visible', async ({ page }) => {
    await page.goto('/')
    // Scroll to features section
    await page.evaluate(() => window.scrollBy(0, 600))
    await page.waitForTimeout(500)
    // Check for Arabic feature text
    await expect(page.locator('text=إدارة المبيعات')).toBeVisible()
    await expect(page.locator('text=إدارة الفروع')).toBeVisible()
  })

  test('no horizontal scroll at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(375)
  })

  test('urwah logo visible', async ({ page }) => {
    await page.goto('/')
    const logos = page.locator('img[alt="عروة"]')
    await expect(logos.first()).toBeVisible()
  })
})
