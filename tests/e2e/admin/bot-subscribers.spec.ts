import { test, expect } from '@playwright/test'

test.describe('مشتركو البوت', () => {
  test('الصفحة تُحمَّل', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await expect(page).not.toHaveURL(/login/)
    await page.waitForTimeout(500)
  })

  test('المحتوى مرئي أو حالة فارغة', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1000)
    const content = page.locator('table, [class*="list"], [class*="empty"], [class*="card"]')
    expect(await content.count()).toBeGreaterThan(0)
  })

  test('الاتجاه RTL', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })
})
