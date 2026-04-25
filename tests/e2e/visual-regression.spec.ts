/**
 * Visual regression suite — Phase I.2
 *
 * Captures full-page screenshot baselines for Tier 1 + Tier 2 pages across:
 *   - 3 viewports (mobile-375, tablet-768, desktop-1440)
 *   - 2 themes (light, dark)
 *
 * Baselines are committed under `tests/e2e/__screenshots__/`.
 * Re-run with `--update-snapshots` (or `npm run baseline`) whenever an
 * intentional design change lands. Maximum diff allowed: 1% per image.
 *
 * Auth: tenant pages reuse the default storageState from playwright.config.ts.
 * Public pages override storageState to an empty session.
 */
import { test, expect } from '@playwright/test'

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

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 720 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const

const THEMES = ['light', 'dark'] as const

for (const pageDef of PAGES) {
  test.describe(`visual: ${pageDef.name}`, () => {
    if (pageDef.auth === false) {
      test.use({ storageState: { cookies: [], origins: [] } })
    }

    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`${pageDef.name} @ ${vp.name} ${theme}`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height })
          await page.goto(pageDef.path)
          await page.waitForLoadState('networkidle')

          if (theme === 'dark') {
            await page.evaluate(() => document.documentElement.classList.add('dark'))
            await page.waitForTimeout(300)
          }

          await expect(page).toHaveScreenshot(`${pageDef.name}-${vp.name}-${theme}.png`, {
            fullPage: true,
            maxDiffPixelRatio: 0.01,
            animations: 'disabled',
          })
        })
      }
    }
  })
}
