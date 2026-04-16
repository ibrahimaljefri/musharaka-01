import { test, expect } from '@playwright/test'

test.describe('إدارة المستأجرين', () => {
  test('قائمة المستأجرين تُحمَّل', async ({ page }) => {
    await page.goto('/admin/tenants')
    await expect(page).not.toHaveURL(/login/)
    await page.waitForTimeout(500)
  })

  test('زر الإنشاء مرئي', async ({ page }) => {
    await page.goto('/admin/tenants')
    await page.waitForTimeout(500)
    const createBtn = page.locator('button').filter({ hasText: /إنشاء|إضافة|جديد/ })
    expect(await createBtn.count()).toBeGreaterThan(0)
  })

  test('الاتجاه RTL', async ({ page }) => {
    await page.goto('/admin/tenants')
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })
})
