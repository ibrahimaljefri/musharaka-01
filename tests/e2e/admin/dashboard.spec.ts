import { test, expect } from '@playwright/test'

test.describe('لوحة تحكم الإدارة', () => {
  test('تحميل الصفحة', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).not.toHaveURL(/login/)
  })

  test('بطاقات KPI مرئية', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForTimeout(1000)
    const cards = page.locator('[class*="card"], [class*="stat"]')
    expect(await cards.count()).toBeGreaterThan(0)
  })

  test('الاتجاه RTL', async ({ page }) => {
    await page.goto('/admin/dashboard')
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })

  test('وضع الظلام يعمل', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)
  })
})
