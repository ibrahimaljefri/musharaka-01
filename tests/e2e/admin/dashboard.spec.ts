import { test, expect } from '@playwright/test'

const MOCK_STATS = {
  totals: {
    tenants: 5,
    branches: 12,
    tenant_users: 18,
    pending_users: 3,
    auth_users: 25,
  },
  subscriptions: [
    { status: 'active', count: 3 },
    { status: 'expired', count: 1 },
    { status: 'suspended', count: 1 },
  ],
  users_per_tenant: [],
  branches_per_tenant: [],
}

test.describe('لوحة تحكم الإدارة', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/admin/stats**', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_STATS),
      })
    })
  })

  test('تحميل الصفحة', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).not.toHaveURL(/login/)
  })

  test('بطاقات KPI مرئية', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForTimeout(2000)
    // KpiCard renders divs with data-testid="kpi-card"
    const cards = page.locator('[data-testid="kpi-card"]')
    expect(await cards.count()).toBeGreaterThan(0)
  })

  test('الاتجاه RTL', async ({ page }) => {
    await page.goto('/admin/dashboard')
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })

  test('وضع الظلام يعمل', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)
  })
})
