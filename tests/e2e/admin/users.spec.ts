import { test, expect } from '@playwright/test'

test.describe('إدارة المستخدمين', () => {
  test('قائمة المستخدمين تُحمَّل', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).not.toHaveURL(/login/)
    await page.waitForTimeout(500)
  })

  test('الجدول أو القائمة مرئية', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(1000)
    // Should have some table rows, list items, or empty state
    const content = page.locator('table, [class*="list"], [class*="empty"]')
    expect(await content.count()).toBeGreaterThan(0)
  })
})
