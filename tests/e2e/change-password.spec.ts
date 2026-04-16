import { test, expect } from '@playwright/test'

test.describe('تغيير كلمة المرور', () => {
  test('تحميل الصفحة', async ({ page }) => {
    await page.goto('/change-password')
    // Three password fields
    const inputs = page.locator('input[type="password"]')
    await expect(inputs).toHaveCount(3)
  })

  test('رسالة خطأ عند عدم تطابق كلمات المرور', async ({ page }) => {
    await page.goto('/change-password')
    const inputs = page.locator('input[type="password"]')
    await inputs.nth(1).fill('NewPass123!')
    await inputs.nth(2).fill('DifferentPass456!')
    await page.click('button[type="submit"]')
    // Should show error
    await expect(page.locator('text=كلمات المرور')).toBeVisible()
  })

  test('شعار عروة مرئي', async ({ page }) => {
    await page.goto('/change-password')
    await expect(page.locator('img[alt="عروة"]')).toBeVisible()
  })

  test('الاتجاه RTL', async ({ page }) => {
    await page.goto('/change-password')
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })
})
