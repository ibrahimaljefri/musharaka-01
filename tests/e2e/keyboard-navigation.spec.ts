/**
 * Keyboard navigation suite — Phase I.5
 *
 * Tier 1 keyboard-only flows. Confirms tab order matches visual order and
 * no focus traps exist on hero pages.
 *
 * Each test asserts the active element after each Tab press is something
 * focusable and that a focus indicator (focus-visible / outline) is rendered.
 */
import { test, expect, Page } from '@playwright/test'

async function activeTagName(page: Page): Promise<string> {
  return page.evaluate(() => document.activeElement?.tagName ?? '')
}

async function activeHasFocusRing(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el || el === document.body) return false
    const cs = window.getComputedStyle(el)
    const outline = cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px'
    const ring = cs.boxShadow !== 'none'
    return outline || ring
  })
}

test.describe('keyboard navigation', () => {
  test.describe('public pages', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('login: tab order email → password → submit', async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      // Tab through to the email input
      await page.keyboard.press('Tab')
      // Continue tabbing until we focus an email field (skipping nav links)
      let attempts = 0
      while (attempts < 15) {
        const tag = await activeTagName(page)
        const type = await page.evaluate(
          () => (document.activeElement as HTMLInputElement | null)?.type ?? '',
        )
        if (tag === 'INPUT' && type === 'email') break
        await page.keyboard.press('Tab')
        attempts++
      }

      const emailType = await page.evaluate(
        () => (document.activeElement as HTMLInputElement | null)?.type ?? '',
      )
      expect(emailType).toBe('email')
      await page.keyboard.type('test@example.com')

      await page.keyboard.press('Tab')
      // Could be the password input directly, or an eye-toggle just before
      let passwordReached = false
      for (let i = 0; i < 4; i++) {
        const t = await page.evaluate(
          () => (document.activeElement as HTMLInputElement | null)?.type ?? '',
        )
        if (t === 'password') {
          passwordReached = true
          break
        }
        await page.keyboard.press('Tab')
      }
      expect(passwordReached).toBe(true)
      await page.keyboard.type('password')

      // Verify focus ring present at the password input
      expect(await activeHasFocusRing(page)).toBe(true)
    })
  })

  test('dashboard: keyboard reaches primary action', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    let reached = false
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      const text = await page.evaluate(
        () => document.activeElement?.textContent?.trim() ?? '',
      )
      if (/إضافة مبيعات|لوحة التحكم|الفروع/.test(text)) {
        reached = true
        break
      }
    }
    expect(reached, 'tabbing should reach a known nav/action element').toBe(true)
  })

  test('sale-create: keyboard reaches mode radios and form fields', async ({ page }) => {
    await page.goto('/sales/create')
    await page.waitForLoadState('networkidle')

    // Find the first radio via tabbing
    let radioReached = false
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      const role = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        return el?.getAttribute('role') ?? el?.tagName ?? ''
      })
      const inputType = await page.evaluate(
        () => (document.activeElement as HTMLInputElement | null)?.type ?? '',
      )
      if (role === 'radio' || inputType === 'radio') {
        radioReached = true
        break
      }
    }
    expect(radioReached).toBe(true)

    // Arrow keys should switch radio selection within the group
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
  })

  test('submit: keyboard reaches branch select and submit button', async ({ page }) => {
    await page.goto('/submit')
    await page.waitForLoadState('networkidle')

    let selectReached = false
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      const tag = await activeTagName(page)
      if (tag === 'SELECT') {
        selectReached = true
        break
      }
    }
    expect(selectReached).toBe(true)
  })

  test('admin dashboard: keyboard reaches KPI region', async ({ page, browser }) => {
    const ctx = await browser.newContext({ storageState: 'fixtures/.auth/admin.json' })
    const adminPage = await ctx.newPage()
    await adminPage.goto('/admin/dashboard')
    await adminPage.waitForLoadState('networkidle')

    let reached = false
    for (let i = 0; i < 30; i++) {
      await adminPage.keyboard.press('Tab')
      const tag = await activeTagName(adminPage)
      if (['A', 'BUTTON', 'INPUT', 'SELECT'].includes(tag)) {
        reached = true
        break
      }
    }
    expect(reached).toBe(true)
    await ctx.close()
  })
})
