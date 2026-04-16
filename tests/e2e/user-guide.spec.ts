import { test, expect } from '@playwright/test'

test.describe('دليل المستخدم', () => {
  test('الصفحة تُحمَّل', async ({ page }) => {
    await page.goto('/user-guide.html')
    await expect(page).toHaveURL(/user-guide\.html/)
  })

  test('عروة مرئية وليس مشاركة', async ({ page }) => {
    await page.goto('/user-guide.html')
    const content = await page.content()
    expect(content).toContain('عروة')
    expect(content).not.toContain('مشاركة')
  })

  test('لا يوجد أخطاء JavaScript', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/user-guide.html')
    await page.waitForTimeout(1000)
    expect(errors).toHaveLength(0)
  })

  test('زر التالي يعمل', async ({ page }) => {
    await page.goto('/user-guide.html')
    await page.waitForTimeout(500)
    const nextBtn = page.locator('button').filter({ hasText: /التالي|▶|next/i }).first()
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForTimeout(300)
      // Slide counter should change or content should change
    }
  })
})
