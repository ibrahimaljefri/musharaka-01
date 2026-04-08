/**
 * Register page tests — R-01 through R-06
 *
 * All tests run without auth state.
 */
import { test, expect } from '@playwright/test'

// Override storage state: these tests must run unauthenticated
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  // -----------------------------------------------------------------------
  // R-01: Page renders with Arabic heading and all four fields visible
  // -----------------------------------------------------------------------
  test('R-01: register page renders Arabic heading and all form fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'إنشاء حساب جديد' })).toBeVisible()
    await expect(page.getByText('الاسم الكامل')).toBeVisible()
    await expect(page.getByText('البريد الإلكتروني')).toBeVisible()
    // Both password labels — "كلمة المرور" appears twice (password + confirm)
    const passLabels = page.getByText('كلمة المرور')
    await expect(passLabels.first()).toBeVisible()
    await expect(page.getByText('تأكيد كلمة المرور')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // R-02: Empty form → Arabic required-field validation errors
  // -----------------------------------------------------------------------
  test('R-02: empty form submission shows Arabic required-field errors', async ({ page }) => {
    await page.click('button[type="submit"]')

    // Each error is a small red paragraph under the relevant input
    await expect(page.getByText('الاسم الكامل مطلوب')).toBeVisible()
    await expect(page.getByText('البريد الإلكتروني مطلوب')).toBeVisible()
    await expect(page.getByText('كلمة المرور مطلوبة')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // R-03: Password mismatch → Arabic mismatch error
  // -----------------------------------------------------------------------
  test('R-03: mismatched passwords show Arabic mismatch error', async ({ page }) => {
    await page.fill('input[autocomplete="name"]', 'أحمد محمد')
    await page.fill('input[autocomplete="email"]', 'newuser@musharaka.com')
    await page.fill('input[autocomplete="password"]', 'Pass1234!')
    await page.fill('input[autocomplete="confirm"]', 'Mismatch999!')
    await page.click('button[type="submit"]')

    await expect(page.getByText('كلمة المرور غير متطابقة')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // R-04: Duplicate email → Arabic "already registered" error
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('R-04: duplicate email shows Arabic "already registered" error', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    const existingEmail = process.env.TEST_EMAIL ?? 'test@musharaka.com'
    await page.fill('input[autocomplete="name"]', 'مستخدم تجريبي')
    await page.fill('input[autocomplete="email"]', existingEmail)
    await page.fill('input[autocomplete="password"]', 'Test1234!')
    await page.fill('input[autocomplete="confirm"]', 'Test1234!')
    await page.click('button[type="submit"]')

    await expect(page.getByText('البريد الإلكتروني مسجل مسبقاً.')).toBeVisible({ timeout: 10_000 })
  })

  // -----------------------------------------------------------------------
  // R-05: Successful registration → redirects to /dashboard
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('R-05: valid unique credentials register and redirect to /dashboard', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    const uniqueEmail = `test+${Date.now()}@musharaka.com`
    await page.fill('input[autocomplete="name"]', 'مستخدم جديد')
    await page.fill('input[autocomplete="email"]', uniqueEmail)
    await page.fill('input[autocomplete="password"]', 'NewPass123!')
    await page.fill('input[autocomplete="confirm"]', 'NewPass123!')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard', { timeout: 15_000 })
  })

  // -----------------------------------------------------------------------
  // R-06: "تسجيل الدخول" link navigates back to /login
  // -----------------------------------------------------------------------
  test('R-06: "تسجيل الدخول" link navigates to /login', async ({ page }) => {
    await page.getByRole('link', { name: 'تسجيل الدخول' }).click()
    await expect(page).toHaveURL('/login')
  })

  // -----------------------------------------------------------------------
  // R-07: RTL layout confirmed
  // -----------------------------------------------------------------------
  test('R-07: html element has dir="rtl"', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  // -----------------------------------------------------------------------
  // R-08: Mobile responsive — no horizontal scroll at 375px
  // -----------------------------------------------------------------------
  test('R-08: no horizontal scroll at 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/register')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})
