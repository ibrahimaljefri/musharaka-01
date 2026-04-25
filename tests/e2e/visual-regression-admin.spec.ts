/**
 * Visual regression suite — Admin pages (Phase I.2)
 *
 * Captures full-page screenshot baselines for admin pages at desktop-1440
 * in light theme only. Admin surfaces don't need full mobile/dark coverage
 * per the redesign plan.
 *
 * Baselines live under `tests/e2e/__screenshots__/`.
 * Re-run with `--update-snapshots` to refresh after intentional design changes.
 *
 * Auth: uses the admin storageState fixture.
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: 'fixtures/.auth/admin.json' })

interface AdminPageDef {
  name: string
  path: string
}

const ADMIN_PAGES: AdminPageDef[] = [
  { name: 'admin-dashboard', path: '/admin/dashboard' },
  { name: 'admin-tenants', path: '/admin/tenants' },
  { name: 'admin-tenant-form', path: '/admin/tenants/new' },
  { name: 'admin-users', path: '/admin/users' },
  { name: 'admin-api-keys', path: '/admin/api-keys' },
  { name: 'admin-tickets', path: '/admin/tickets' },
  { name: 'admin-bot-subs', path: '/admin/bot-subscribers' },
]

const VIEWPORT = { width: 1440, height: 900 }

for (const pageDef of ADMIN_PAGES) {
  test(`visual admin: ${pageDef.name} @ desktop-1440 light`, async ({ page }) => {
    await page.setViewportSize(VIEWPORT)
    await page.goto(pageDef.path)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot(`${pageDef.name}-desktop-1440-light.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    })
  })
}
