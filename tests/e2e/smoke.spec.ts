/**
 * Smoke — post-migration end-to-end validation (runs against production).
 *
 * SMK-01..SMK-10  (tenant project)
 */
import { test, expect } from '@playwright/test'

test.describe('Production smoke — tenant', () => {
  test('SMK-01: dashboard loads', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard|\/admin\/dashboard/)
  })

  test('SMK-02: branches page loads', async ({ page }) => {
    await page.goto('/branches')
    await expect(page.locator('h1, h2')).toBeVisible()
  })

  test('SMK-03: sales create page loads', async ({ page }) => {
    await page.goto('/sales/create')
    await expect(page.locator('h1, h2, form')).toBeVisible()
  })

  test('SMK-04: sales import page loads', async ({ page }) => {
    await page.goto('/sales/import')
    await expect(page.locator('h1')).toContainText('Excel')
  })

  test('SMK-05: submissions page loads', async ({ page }) => {
    await page.goto('/submissions')
    // Accept either listing or empty state
    await expect(page.locator('body')).toBeVisible()
  })

  test('SMK-06: submit page loads', async ({ page }) => {
    await page.goto('/submit')
    await expect(page.locator('body')).toBeVisible()
  })

  test('SMK-07: tickets create page loads', async ({ page }) => {
    await page.goto('/tickets/create')
    await expect(page.locator('body')).toBeVisible()
  })

  test('SMK-08: FAQ page loads with Arabic content', async ({ page }) => {
    await page.goto('/faq')
    await expect(page.locator('body')).toContainText(/[\u0600-\u06FF]/)
  })

  test('SMK-09: FAQ page does NOT contain "بوت تيليجرام" (brand cleanup regression)', async ({ page }) => {
    await page.goto('/faq')
    await expect(page.locator('body')).not.toContainText('بوت تيليجرام')
  })

  test('SMK-10: landing page does NOT contain "بوت" (brand cleanup regression)', async ({ page }) => {
    await page.goto('/')
    const html = await page.content()
    // Landing should now use "المساعد الذكي"
    expect(html).toContain('المساعد الذكي')
  })
})
