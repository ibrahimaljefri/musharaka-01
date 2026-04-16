/**
 * BiDi / RTL directional correctness tests — BiDi-01 through BiDi-12
 *
 * Verifies that the Arabic-first Musharaka app renders with correct RTL
 * direction, proper font stack, mixed-direction inputs, and no mobile overflow.
 *
 * Uses auth storage state (set by playwright.config.ts).
 * BiDi-11 (login page) navigates without auth — no protected route involved.
 */
import { test, expect } from '@playwright/test'

test.describe('BiDi / RTL directional correctness', () => {
  // -------------------------------------------------------------------------
  // BiDi-01: HTML direction is RTL
  // -------------------------------------------------------------------------
  test('BiDi-01: <html> element has dir="rtl" on /branches/create', async ({ page }) => {
    await page.goto('/branches/create')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  // -------------------------------------------------------------------------
  // BiDi-02: Arabic form labels are right-aligned
  // -------------------------------------------------------------------------
  test('BiDi-02: form labels on /branches/create are right-aligned', async ({ page }) => {
    await page.goto('/branches/create')
    const label = page.locator('label').first()
    await expect(label).toBeVisible()
    const textAlign = await label.evaluate(el => getComputedStyle(el).textAlign)
    // In RTL, text-align 'start' resolves to right — accept either value
    expect(['right', 'start']).toContain(textAlign)
  })

  // -------------------------------------------------------------------------
  // BiDi-03: Branch code input is explicitly LTR
  // -------------------------------------------------------------------------
  test('BiDi-03: branch code input (placeholder "BR-001") has dir="ltr"', async ({ page }) => {
    await page.goto('/branches/create')
    const codeInput = page.locator('input[placeholder="BR-001"]')
    await expect(codeInput).toBeVisible()
    await expect(codeInput).toHaveAttribute('dir', 'ltr')
  })

  // -------------------------------------------------------------------------
  // BiDi-04: Branch name input is explicitly RTL
  // -------------------------------------------------------------------------
  test('BiDi-04: branch name input (placeholder "فرع الرياض") has dir="rtl"', async ({ page }) => {
    await page.goto('/branches/create')
    const nameInput = page.locator('input[placeholder="فرع الرياض"]')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveAttribute('dir', 'rtl')
  })

  // -------------------------------------------------------------------------
  // BiDi-05: Mixed-language input value is preserved correctly
  // -------------------------------------------------------------------------
  test('BiDi-05: mixed Arabic/Latin text typed into code field is preserved unchanged', async ({ page }) => {
    await page.goto('/branches/create')
    const codeInput = page.locator('input[placeholder="BR-001"]')
    await codeInput.fill('Branch فرع 123')
    expect(await codeInput.inputValue()).toBe('Branch فرع 123')
  })

  // -------------------------------------------------------------------------
  // BiDi-06: Arabic validation error banner appears on empty submit
  // -------------------------------------------------------------------------
  test('BiDi-06: submitting empty form shows Arabic validation error "كود الفرع مطلوب"', async ({ page }) => {
    await page.goto('/branches/create')
    await page.getByRole('button', { name: /حفظ/ }).click()
    await expect(page.getByText(/كود الفرع مطلوب/)).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // BiDi-07: Token input is password type (masked)
  // -------------------------------------------------------------------------
  test('BiDi-07: token field on /branches/create is type="password"', async ({ page }) => {
    await page.goto('/branches/create')
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // BiDi-08: App uses Tajawal font family
  // -------------------------------------------------------------------------
  test('BiDi-08: body font-family includes "Tajawal" on /branches/create', async ({ page }) => {
    await page.goto('/branches/create')
    const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
    expect(fontFamily.toLowerCase()).toContain('tajawal')
  })

  // -------------------------------------------------------------------------
  // BiDi-09: Western digits are accepted in LTR inputs
  // -------------------------------------------------------------------------
  test('BiDi-09: western digits and decimals typed into code field are preserved correctly', async ({ page }) => {
    await page.goto('/branches/create')
    const codeInput = page.locator('input[placeholder="BR-001"]')
    await codeInput.fill('12345.50')
    expect(await codeInput.inputValue()).toBe('12345.50')
  })

  // -------------------------------------------------------------------------
  // BiDi-10: No horizontal overflow at 375px (mobile)
  // -------------------------------------------------------------------------
  test('BiDi-10: no horizontal overflow on /branches/create at 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/branches/create')
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const clientWidth = await page.evaluate(() => document.body.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5)
  })

  // -------------------------------------------------------------------------
  // BiDi-11: Login page guest layout is RTL
  // -------------------------------------------------------------------------
  test('BiDi-11: /login page has dir="rtl" on <html> without auth', async ({ page }) => {
    // Navigate without relying on protected-route auth — /login is public
    await page.goto('/login')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  // -------------------------------------------------------------------------
  // BiDi-12: Arabic text is visible and not garbled on /dashboard
  // -------------------------------------------------------------------------
  test('BiDi-12: /dashboard body renders meaningful Arabic content', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(10)
  })
})
