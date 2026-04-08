/**
 * Login page tests — L-01 through L-10
 *
 * All tests run without auth state because GuestRoute redirects
 * authenticated users away from /login.
 */
import { test, expect } from '@playwright/test'

// Override storage state: these tests must run unauthenticated
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  // -----------------------------------------------------------------------
  // L-01: Valid credentials → redirect to /dashboard
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('L-01: valid credentials redirect to /dashboard', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.fill('input[type="email"]', process.env.TEST_EMAIL ?? 'test@musharaka.com')
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD ?? 'Test1234!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard', { timeout: 15_000 })
  })

  // -----------------------------------------------------------------------
  // L-02: Wrong password → Arabic error, no redirect
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('L-02: wrong password shows Arabic error and stays on /login', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.fill('input[type="email"]', 'test@musharaka.com')
    await page.fill('input[type="password"]', 'WrongPass999!')
    await page.click('button[type="submit"]')
    await expect(page.getByText('بيانات الدخول غير صحيحة. يرجى المحاولة مجدداً.')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL('/login')
  })

  // -----------------------------------------------------------------------
  // L-03: Wrong email → Arabic error
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('L-03: non-existent email shows Arabic error', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.fill('input[type="email"]', 'no-such-user@musharaka.com')
    await page.fill('input[type="password"]', 'AnyPass123!')
    await page.click('button[type="submit"]')
    await expect(page.getByText('بيانات الدخول غير صحيحة. يرجى المحاولة مجدداً.')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL('/login')
  })

  // -----------------------------------------------------------------------
  // L-04: Empty form → Arabic required-field errors (pure UI — no backend)
  // -----------------------------------------------------------------------
  test('L-04: submitting empty form shows Arabic required-field errors', async ({ page }) => {
    // Leave both fields empty and submit
    await page.click('button[type="submit"]')

    // The component sets a single error string — either email or password required
    // Based on the validation logic: email is checked first
    const errorBanner = page.locator('.bg-red-50')
    await expect(errorBanner).toBeVisible()
    await expect(errorBanner).toContainText('البريد الإلكتروني مطلوب')
  })

  // -----------------------------------------------------------------------
  // L-04b: Missing password only → Arabic password-required error
  // -----------------------------------------------------------------------
  test('L-04b: missing password only shows Arabic password-required error', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@musharaka.com')
    // Leave password empty
    await page.click('button[type="submit"]')

    const errorBanner = page.locator('.bg-red-50')
    await expect(errorBanner).toBeVisible()
    await expect(errorBanner).toContainText('كلمة المرور مطلوبة')
  })

  // -----------------------------------------------------------------------
  // L-05: Rate limit — UI feedback after repeated failures
  // The app itself does not have its own rate-limit UI; this test verifies
  // that the Supabase error is surfaced in Arabic.  We assert the error
  // banner is visible after 3 failed attempts.
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('L-05: rate-limit or repeated-failure Arabic feedback', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')

    const badPass = 'BadPass123!'
    // Attempt 1
    await page.fill('input[type="email"]', 'test@musharaka.com')
    await page.fill('input[type="password"]', badPass)
    await page.click('button[type="submit"]')
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10_000 })

    // Attempt 2 — clear and retry
    await page.fill('input[type="password"]', badPass)
    await page.click('button[type="submit"]')
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10_000 })

    // Attempt 3
    await page.fill('input[type="password"]', badPass)
    await page.click('button[type="submit"]')

    // Either the standard wrong-credentials Arabic message or a rate-limit
    // message is shown — both are Arabic and appear in the error banner
    const errorBanner = page.locator('.bg-red-50')
    await expect(errorBanner).toBeVisible({ timeout: 10_000 })
    // The text is non-empty Arabic feedback
    const text = await errorBanner.innerText()
    expect(text.length).toBeGreaterThan(0)
  })

  // -----------------------------------------------------------------------
  // L-06: ?redirect=/reports preserved after login
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('L-06: ?redirect=/reports is preserved after successful login', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.goto('/login?redirect=/reports')
    await page.fill('input[type="email"]', process.env.TEST_EMAIL ?? 'test@musharaka.com')
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD ?? 'Test1234!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/reports', { timeout: 15_000 })
  })

  // -----------------------------------------------------------------------
  // L-07: ?redirect=https://evil.com → lands on /dashboard (open redirect blocked)
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('L-07: open redirect to external URL is blocked — lands on /dashboard', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.goto('/login?redirect=https://evil.com')
    await page.fill('input[type="email"]', process.env.TEST_EMAIL ?? 'test@musharaka.com')
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD ?? 'Test1234!')
    await page.click('button[type="submit"]')
    // Must land on /dashboard, NOT on evil.com
    await expect(page).toHaveURL('/dashboard', { timeout: 15_000 })
    await expect(page).not.toHaveURL(/evil\.com/)
  })

  // -----------------------------------------------------------------------
  // L-08: Register link navigates to /register
  // -----------------------------------------------------------------------
  test('L-08: "إنشاء حساب جديد" link navigates to /register', async ({ page }) => {
    await page.getByRole('link', { name: 'إنشاء حساب جديد' }).click()
    await expect(page).toHaveURL('/register')
  })

  // -----------------------------------------------------------------------
  // L-09: RTL layout — dir="rtl" on html element
  // -----------------------------------------------------------------------
  test('L-09: html element has dir="rtl" (Arabic RTL layout)', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  // -----------------------------------------------------------------------
  // L-10: Mobile responsive — no horizontal scroll at 375px
  // -----------------------------------------------------------------------
  test('L-10: no horizontal scroll at 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')

    // The document body must not overflow horizontally
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })

  // -----------------------------------------------------------------------
  // Additional — page title / heading visible
  // -----------------------------------------------------------------------
  test('L-00: login page heading "تسجيل الدخول" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // Additional — email and password labels are visible
  // -----------------------------------------------------------------------
  test('L-00b: email and password labels are present in Arabic', async ({ page }) => {
    await expect(page.getByText('البريد الإلكتروني')).toBeVisible()
    await expect(page.getByText('كلمة المرور')).toBeVisible()
  })
})
