/**
 * Post-rebrand smoke tests — verifies behavioural changes shipped in the
 * branding / sidebar session.
 *
 * PRSM-01  Tab title updated to "نظام مشاركة البيانات"
 * PRSM-02  Landing H2 updated to "كل ما تحتاجه لتشارك البيانات"
 * PRSM-03a Sidebar toggle shows ChevronLeft (lucide-chevron-left) when expanded
 * PRSM-03b Sidebar toggle shows ChevronRight (lucide-chevron-right) when collapsed
 *
 * PRSM-04 (admin tickets "جديد" filter) lives at
 * tests/e2e/admin/post-rebrand-tickets.spec.ts so the `admin` project's
 * storageState (fixtures/.auth/admin.json) is wired up correctly.
 */
import { test, expect } from '@playwright/test'

// ─── PRSM-01 & PRSM-02 — public landing page (no auth required) ──────────────
test.describe('ريبراند الصفحة العامة', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('PRSM-01: عنوان تبويب المتصفح يحمل "نظام مشاركة البيانات"', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/نظام مشاركة البيانات/)
  })

  test('PRSM-02: H2 يحتوي على "كل ما تحتاجه لتشارك البيانات"', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 2 }).filter({ hasText: 'كل ما تحتاجه لتشارك البيانات' }),
    ).toBeVisible()
  })
})

// ─── PRSM-03 — sidebar chevron flips with collapse state ─────────────────────
test.describe('أيقونة الشريط الجانبي تتبدل مع الحالة', () => {
  test('PRSM-03a: الشريط موسَّع → يظهر ChevronLeft (lucide-chevron-left)', async ({ page }) => {
    await page.goto('/dashboard')
    const toggleBtn = page.getByRole('button', { name: /طي القائمة|توسيع القائمة/ })
    await expect(toggleBtn).toBeVisible()

    // If currently collapsed, expand it first
    const label = await toggleBtn.getAttribute('aria-label')
    if (label === 'توسيع القائمة') {
      await toggleBtn.click()
      await expect(page.getByRole('button', { name: 'طي القائمة' })).toBeVisible()
    }

    // Expanded state must render ChevronLeft
    const svg = page.getByRole('button', { name: 'طي القائمة' }).locator('svg')
    await expect(svg).toHaveClass(/lucide-chevron-left/)
  })

  test('PRSM-03b: الشريط مطوي → يظهر ChevronRight (lucide-chevron-right)', async ({ page }) => {
    await page.goto('/dashboard')
    const toggleBtn = page.getByRole('button', { name: /طي القائمة|توسيع القائمة/ })
    await expect(toggleBtn).toBeVisible()

    // Ensure sidebar is expanded before we collapse it
    const label = await toggleBtn.getAttribute('aria-label')
    if (label === 'توسيع القائمة') {
      await toggleBtn.click()
      await expect(page.getByRole('button', { name: 'طي القائمة' })).toBeVisible()
    }

    // Collapse the sidebar
    await page.getByRole('button', { name: 'طي القائمة' }).click()
    await expect(page.getByRole('button', { name: 'توسيع القائمة' })).toBeVisible()

    // Collapsed state must render ChevronRight
    const svg = page.getByRole('button', { name: 'توسيع القائمة' }).locator('svg')
    await expect(svg).toHaveClass(/lucide-chevron-right/)
  })
})
