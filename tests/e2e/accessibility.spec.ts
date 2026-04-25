/**
 * Accessibility regression suite — Phase I.3
 *
 * Uses @axe-core/playwright to scan every Tier 1 + Tier 2 page for WCAG 2.1 AA
 * violations under both light and dark themes.
 *
 * Tags: wcag2a, wcag2aa, wcag21aa.
 * A failure dumps the full violations array as the assertion message so the
 * offending rule, target selector, and suggested fix are visible in the report.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

interface PageDef {
  name: string
  path: string
  auth: boolean | 'tenant'
}

const PAGES: PageDef[] = [
  { name: 'landing', path: '/', auth: false },
  { name: 'login', path: '/login', auth: false },
  { name: 'register', path: '/register', auth: false },
  { name: 'forgot-password', path: '/forgot-password', auth: false },
  { name: 'dashboard', path: '/dashboard', auth: 'tenant' },
  { name: 'sale-create', path: '/sales/create', auth: 'tenant' },
  { name: 'reports', path: '/reports', auth: 'tenant' },
  { name: 'submit', path: '/submit', auth: 'tenant' },
  { name: 'submissions', path: '/submissions', auth: 'tenant' },
  { name: 'branches', path: '/branches', auth: 'tenant' },
  { name: 'sale-import', path: '/sales/import', auth: 'tenant' },
  { name: 'tickets-create', path: '/tickets/create', auth: 'tenant' },
  { name: 'faq', path: '/faq', auth: 'tenant' },
]

const THEMES = ['light', 'dark'] as const

for (const pageDef of PAGES) {
  test.describe(`a11y: ${pageDef.name}`, () => {
    if (pageDef.auth === false) {
      test.use({ storageState: { cookies: [], origins: [] } })
    }

    for (const theme of THEMES) {
      test(`${pageDef.name} ${theme} — no WCAG 2.1 AA violations`, async ({ page }) => {
        await page.goto(pageDef.path)
        await page.waitForLoadState('networkidle')

        if (theme === 'dark') {
          await page.evaluate(() => document.documentElement.classList.add('dark'))
          await page.waitForTimeout(200)
        }

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()

        expect(
          results.violations,
          JSON.stringify(results.violations, null, 2),
        ).toEqual([])
      })
    }
  })
}
