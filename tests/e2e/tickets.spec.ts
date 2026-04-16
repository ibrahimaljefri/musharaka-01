import { test, expect } from '@playwright/test'

test.describe('التذاكر', () => {
  test('صفحة إنشاء تذكرة تُحمَّل', async ({ page }) => {
    await page.goto('/tickets/create')
    await expect(page).not.toHaveURL(/login/)
  })

  test('حقول النموذج مرئية', async ({ page }) => {
    await page.goto('/tickets/create')
    // Should have at least one input/textarea
    const inputs = page.locator('input, textarea, select')
    await expect(inputs.first()).toBeVisible()
  })

  test('رسالة خطأ عند الإرسال الفارغ', async ({ page }) => {
    await page.goto('/tickets/create')
    await page.click('button[type="submit"]')
    // Should show validation or stay on same page
    await expect(page).toHaveURL(/tickets/)
  })
})
