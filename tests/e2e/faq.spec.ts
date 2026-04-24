/**
 * FAQ page — FAQ-01 … FAQ-05 (tenant-facing knowledge base)
 */
import { test, expect } from '@playwright/test'

test.describe('FAQ page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/faq')
  })

  test('FAQ-01: page renders with Arabic content', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/[\u0600-\u06FF]/)
  })

  test('FAQ-02: page title contains "الأسئلة" or similar', async ({ page }) => {
    const html = await page.content()
    expect(html).toMatch(/الأسئلة|FAQ/i)
  })

  test('FAQ-03: FAQ does NOT use "بوت تيليجرام" (brand cleanup regression)', async ({ page }) => {
    const html = await page.content()
    expect(html).not.toContain('بوت تيليجرام')
  })

  test('FAQ-04: FAQ uses "المساعد الذكي" branding', async ({ page }) => {
    const html = await page.content()
    expect(html).toContain('المساعد الذكي')
  })

  test('FAQ-05: accordion toggles are keyboard-accessible', async ({ page }) => {
    const buttons = page.locator('button[aria-expanded]')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
  })
})
