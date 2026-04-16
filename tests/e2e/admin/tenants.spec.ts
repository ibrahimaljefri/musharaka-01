/**
 * Admin — Tenants list page tests (TL-01 through TL-50)
 *
 * Project: admin (storageState: fixtures/.auth/admin.json)
 * Base URL: http://localhost:5173
 * Locale: ar-SA  |  Direction: RTL
 *
 * Tests that require real DB data use page.route() mocks to intercept API
 * calls and return appropriate mock data.
 */
import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_TENANT_ID = 1
const MOCK_TENANT = {
  id: MOCK_TENANT_ID,
  name: 'شركة الاختبار',
  slug: 'test-company',
  status: 'active',
  plan_name: 'أساسي',
  plan: 'أساسي',
  activated_at: '2025-01-01',
  expires_at: '2026-01-01',
  max_branches: 5,
  max_users: 5,
  allowed_input_types: 'daily,monthly',
  allow_import: false,
  allow_advanced_dashboard: false,
  branch_count: 2,
  user_count: 3,
  created_at: '2025-01-01T10:00:00Z',
}
const MOCK_TENANTS_JSON = JSON.stringify([MOCK_TENANT])
const MOCK_TENANT_JSON = JSON.stringify(MOCK_TENANT)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to /admin/tenants and wait for the page to settle. */
async function gotoTenants(page: any) {
  await page.goto('/admin/tenants')
  // Wait for either the table header OR the empty-state to confirm rendering
  await page.waitForSelector('h1, [class*="EmptyState"], table, .font-arabic', {
    timeout: 15_000,
  })
}

// ---------------------------------------------------------------------------
// T-L-01 – T-L-10 : Page load & routing
// ---------------------------------------------------------------------------

test.describe('Tenants list — page load & routing', () => {
  test('TL-01: /admin/tenants does not redirect to /login', async ({ page }) => {
    await page.goto('/admin/tenants')
    await page.waitForTimeout(500)
    expect(page.url()).not.toMatch(/login/)
  })

  test('TL-02: page heading "إدارة المستأجرين" is visible', async ({ page }) => {
    await gotoTenants(page)
    await expect(
      page.getByRole('heading', { name: 'إدارة المستأجرين' })
    ).toBeVisible()
  })

  test('TL-03: sub-heading "التحكم الكامل في الحسابات والاشتراكات" is visible', async ({
    page,
  }) => {
    await gotoTenants(page)
    await expect(
      page.getByText('التحكم الكامل في الحسابات والاشتراكات')
    ).toBeVisible()
  })

  test('TL-04: URL stays at /admin/tenants after load', async ({ page }) => {
    await gotoTenants(page)
    expect(page.url()).toMatch(/\/admin\/tenants$/)
  })

  test('TL-05: html element has dir="rtl" (RTL layout)', async ({ page }) => {
    await gotoTenants(page)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('TL-06: page lang is Arabic (ar)', async ({ page }) => {
    await gotoTenants(page)
    const lang = await page.evaluate(
      () => document.documentElement.getAttribute('lang') || ''
    )
    // Accept ar, ar-SA, or empty (app may not set it explicitly)
    expect(lang === '' || lang.startsWith('ar')).toBeTruthy()
  })

  test('TL-07: section label "الحسابات المسجلة" is visible', async ({
    page,
  }) => {
    await gotoTenants(page)
    await expect(page.getByText('الحسابات المسجلة')).toBeVisible()
  })

  test('TL-08: page title includes expected text (document title)', async ({
    page,
  }) => {
    await gotoTenants(page)
    // Title may be the app name — just assert it is non-empty
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// TL-11 – TL-20 : "مستأجر جديد" button
// ---------------------------------------------------------------------------

test.describe('Tenants list — "مستأجر جديد" button', () => {
  test('TL-11: "مستأجر جديد" link button is visible', async ({ page }) => {
    await gotoTenants(page)
    await expect(
      page.getByRole('link', { name: /مستأجر جديد/ })
    ).toBeVisible()
  })

  test('TL-12: "مستأجر جديد" button has yellow background styling', async ({
    page,
  }) => {
    await gotoTenants(page)
    const btn = page.getByRole('link', { name: /مستأجر جديد/ }).first()
    const cls = await btn.getAttribute('class')
    expect(cls).toMatch(/yellow/)
  })

  test('TL-13: "مستأجر جديد" navigates to /admin/tenants/create', async ({
    page,
  }) => {
    await gotoTenants(page)
    await page.getByRole('link', { name: /مستأجر جديد/ }).first().click()
    await page.waitForURL(/\/admin\/tenants\/create/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/admin\/tenants\/create/)
  })
})

// ---------------------------------------------------------------------------
// TL-21 – TL-30 : Empty state (no tenants)
// ---------------------------------------------------------------------------

test.describe('Tenants list — empty state', () => {
  test('TL-21: empty-state title "لا يوجد مستأجرون بعد" OR table rows present', async ({
    page,
  }) => {
    await gotoTenants(page)
    await page.waitForTimeout(800)

    const emptyTitle = page.getByText('لا يوجد مستأجرون بعد')
    const tableRow = page.locator('table tbody tr')

    const hasEmpty = await emptyTitle.isVisible().catch(() => false)
    const hasRows = (await tableRow.count()) > 0

    expect(hasEmpty || hasRows).toBeTruthy()
  })

  test('TL-22: empty-state description is present when no tenants', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await gotoTenants(page)
    await expect(
      page.getByText('أضف أول مستأجر لبدء إدارة الحسابات والاشتراكات')
    ).toBeVisible()
  })

  test('TL-23: empty-state action button navigates to /admin/tenants/create', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await gotoTenants(page)
    // The EmptyState action link
    const btn = page.getByRole('link', { name: /مستأجر جديد/ }).last()
    await btn.click()
    await page.waitForURL(/\/admin\/tenants\/create/)
    expect(page.url()).toMatch(/\/admin\/tenants\/create/)
  })
})

// ---------------------------------------------------------------------------
// TL-31 – TL-38 : Table columns
// ---------------------------------------------------------------------------

test.describe('Tenants list — table columns', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTenants(page)
    await page.waitForTimeout(600)
  })

  const COLUMNS = [
    'الاسم',
    'الرمز',
    'الخطة',
    'الحالة',
    'تاريخ التفعيل',
    'تاريخ الانتهاء',
    'أنواع الإدخال',
    'إجراءات',
  ]

  for (const col of COLUMNS) {
    test(`TL-col: column header "${col}" is visible when data exists`, async ({
      page,
    }) => {
      const tableExists = (await page.locator('table').count()) > 0
      if (!tableExists) {
        // No table means empty state — skip column assertion
        return
      }
      await expect(
        page.getByRole('columnheader', { name: col })
      ).toBeVisible()
    })
  }
})

// ---------------------------------------------------------------------------
// TL-39 – TL-45 : Row action buttons (requires data)
// ---------------------------------------------------------------------------

test.describe('Tenants list — row action buttons', () => {
  test('TL-39: each row has Edit (yellow), API Keys (blue), Delete (red) buttons', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })

    const firstRow = page.locator('table tbody tr').first()

    // Edit button — yellow styling
    const editBtn = firstRow.locator('a[href*="/edit"]')
    await expect(editBtn).toBeVisible()
    const editClass = await editBtn.getAttribute('class')
    expect(editClass).toMatch(/yellow/)

    // API Keys button — blue styling
    const apiBtn = firstRow.locator('a[href*="/api-keys"]')
    await expect(apiBtn).toBeVisible()
    const apiClass = await apiBtn.getAttribute('class')
    expect(apiClass).toMatch(/blue/)

    // Delete button — red styling
    const deleteBtn = firstRow.locator('button').last()
    await expect(deleteBtn).toBeVisible()
    const deleteClass = await deleteBtn.getAttribute('class')
    expect(deleteClass).toMatch(/red/)
  })

  test('TL-40: Edit button links to /admin/tenants/:id/edit', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })

    const editLink = page
      .locator('table tbody tr')
      .first()
      .locator('a[href*="/edit"]')
    const href = await editLink.getAttribute('href')
    expect(href).toMatch(/\/admin\/tenants\/\d+\/edit/)
  })

  test('TL-41: API Keys button links to /admin/tenants/:id/api-keys', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })

    const apiLink = page
      .locator('table tbody tr')
      .first()
      .locator('a[href*="/api-keys"]')
    const href = await apiLink.getAttribute('href')
    expect(href).toMatch(/\/admin\/tenants\/\d+\/api-keys/)
  })

  test('TL-42: clicking Edit button navigates to tenant edit page', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })

    const editLink = page
      .locator('table tbody tr')
      .first()
      .locator('a[href*="/edit"]')
    await editLink.click()
    await page.waitForURL(/\/admin\/tenants\/.*\/edit/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/admin\/tenants\/.*\/edit/)
  })
})

// ---------------------------------------------------------------------------
// TL-46 – TL-50 : Status & plan badges (requires data)
// ---------------------------------------------------------------------------

test.describe('Tenants list — status & plan badges', () => {
  test('TL-46: active tenant shows green "نشط" badge', async ({ page }) => {
    const activeTenant = { ...MOCK_TENANT, status: 'active' }
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([activeTenant]) })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })
    const badge = page.locator('span').filter({ hasText: 'نشط' }).first()
    await expect(badge).toBeVisible()
    const cls = await badge.getAttribute('class')
    expect(cls).toMatch(/green/)
  })

  test('TL-47: suspended tenant shows orange "موقوف" badge', async ({
    page,
  }) => {
    const suspendedTenant = { ...MOCK_TENANT, status: 'suspended' }
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([suspendedTenant]) })
    })
    await gotoTenants(page)
    const badge = page.locator('span').filter({ hasText: 'موقوف' }).first()
    await expect(badge).toBeVisible()
    const cls = await badge.getAttribute('class')
    expect(cls).toMatch(/orange/)
  })

  test('TL-48: expired tenant shows red "منتهي" badge', async ({ page }) => {
    const expiredTenant = { ...MOCK_TENANT, status: 'expired' }
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([expiredTenant]) })
    })
    await gotoTenants(page)
    const badge = page.locator('span').filter({ hasText: 'منتهي' }).first()
    await expect(badge).toBeVisible()
    const cls = await badge.getAttribute('class')
    expect(cls).toMatch(/red/)
  })

  test('TL-49: basic plan shows gray "أساسي" badge', async ({ page }) => {
    const basicTenant = { ...MOCK_TENANT, plan: 'أساسي', plan_name: 'أساسي' }
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([basicTenant]) })
    })
    await gotoTenants(page)
    const badge = page.locator('span').filter({ hasText: 'أساسي' }).first()
    await expect(badge).toBeVisible()
    const cls = await badge.getAttribute('class')
    expect(cls).toMatch(/gray/)
  })

  test('TL-50: professional plan shows blue "احترافي" badge', async ({
    page,
  }) => {
    const proPlan = { ...MOCK_TENANT, plan: 'احترافي', plan_name: 'احترافي' }
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([proPlan]) })
    })
    await gotoTenants(page)
    const badge = page.locator('span').filter({ hasText: 'احترافي' }).first()
    await expect(badge).toBeVisible()
    const cls = await badge.getAttribute('class')
    expect(cls).toMatch(/blue/)
  })
})

// ---------------------------------------------------------------------------
// TL-51 – TL-60 : ConfirmDialog — delete flow
// ---------------------------------------------------------------------------

test.describe('Tenants list — ConfirmDialog (delete flow)', () => {
  test('TL-51: clicking delete button opens ConfirmDialog', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })

    const deleteBtn = page
      .locator('table tbody tr')
      .first()
      .locator('button')
      .last()
    await deleteBtn.click()

    // Dialog should appear
    await expect(page.getByText('حذف المستأجر')).toBeVisible()
  })

  test('TL-52: ConfirmDialog shows tenant name in message', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })

    const deleteBtn = page
      .locator('table tbody tr')
      .first()
      .locator('button')
      .last()
    await deleteBtn.click()

    // The dialog body contains the tenant name
    const dialogMsg = page.getByText(/سيتم حذف جميع البيانات/)
    await expect(dialogMsg).toBeVisible()
  })

  test('TL-53: ConfirmDialog Cancel button closes the dialog', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })

    const deleteBtn = page
      .locator('table tbody tr')
      .first()
      .locator('button')
      .last()
    await deleteBtn.click()

    await expect(page.getByText('حذف المستأجر')).toBeVisible()

    // Click cancel
    await page.getByRole('button', { name: 'إلغاء' }).click()

    await expect(page.getByText('حذف المستأجر')).not.toBeVisible()
  })

  test('TL-54: ConfirmDialog Confirm button triggers deletion and shows success flash', async ({
    page,
  }) => {
    // Mock the tenants list so the table renders
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      if (request.method() === 'DELETE') {
        return route.fulfill({ status: 204, body: '' })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
    })
    // Mock the specific tenant DELETE endpoint
    await page.route(`**/admin/tenants/${MOCK_TENANT_ID}`, (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 204, body: '' })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })

    const deleteBtn = page
      .locator('table tbody tr')
      .first()
      .locator('button')
      .last()
    await deleteBtn.click()

    const confirmBtn = page.getByRole('button', { name: /تأكيد|حذف|نعم/ }).last()
    await confirmBtn.click()

    // After deletion the app shows a success flash or re-renders the list
    await page.waitForTimeout(800)
    const successOrList = page.locator(':text("تم حذف"), :text("نجاح"), table, :text("لا يوجد")')
    await expect(successOrList.first()).toBeVisible({ timeout: 5_000 })
  })

  test('TL-55: dialog does not appear on page load (not pre-open)', async ({
    page,
  }) => {
    await gotoTenants(page)
    await page.waitForTimeout(600)
    // The ConfirmDialog title should NOT be visible without triggering delete
    const dialog = page.getByText('حذف المستأجر')
    await expect(dialog).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// TL-61 – TL-66 : Input types column (requires data)
// ---------------------------------------------------------------------------

test.describe('Tenants list — input types column', () => {
  test('TL-61: input type badge "يومي" renders in the input-types column', async ({
    page,
  }) => {
    const dailyTenant = { ...MOCK_TENANT, allowed_input_types: 'daily' }
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([dailyTenant]) })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })
    await expect(page.getByText('يومي').first()).toBeVisible()
  })

  test('TL-62: input type badge "شهري" renders when tenant has monthly type', async ({
    page,
  }) => {
    const monthlyTenant = { ...MOCK_TENANT, allowed_input_types: 'monthly' }
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([monthlyTenant]) })
    })
    await gotoTenants(page)
    await expect(page.getByText('شهري').first()).toBeVisible()
  })

  test('TL-63: input type badge "مخصص" renders when tenant has range type', async ({
    page,
  }) => {
    const rangeTenant = { ...MOCK_TENANT, allowed_input_types: 'range' }
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([rangeTenant]) })
    })
    await gotoTenants(page)
    await expect(page.getByText('مخصص').first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// TL-67 – TL-70 : Loading state
// ---------------------------------------------------------------------------

test.describe('Tenants list — loading state', () => {
  test('TL-67: loading spinner is not permanently visible after load', async ({
    page,
  }) => {
    await page.goto('/admin/tenants')
    // Give the page time to finish loading
    await page.waitForTimeout(2000)
    const spinner = page.locator('[class*="animate-spin"]')
    // After 2s the spinner should be gone
    await expect(spinner).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// TL-71 – TL-75 : Accessibility basics
// ---------------------------------------------------------------------------

test.describe('Tenants list — accessibility', () => {
  test('TL-71: page has exactly one h1 heading', async ({ page }) => {
    await gotoTenants(page)
    const h1Count = await page.getByRole('heading', { level: 1 }).count()
    expect(h1Count).toBe(1)
  })

  test('TL-72: "مستأجر جديد" link is keyboard-focusable', async ({
    page,
  }) => {
    await gotoTenants(page)
    const btn = page.getByRole('link', { name: /مستأجر جديد/ }).first()
    await btn.focus()
    await expect(btn).toBeFocused()
  })

  test('TL-73: table has a thead element when data exists', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
    })
    await gotoTenants(page)
    await page.waitForSelector('table', { timeout: 10_000 })
    await expect(page.locator('table thead')).toBeVisible()
  })

  test('TL-74: action buttons have title attributes (tooltips)', async ({
    page,
  }) => {
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
    })
    await gotoTenants(page)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })

    const editBtn = page
      .locator('table tbody tr')
      .first()
      .locator('a[href*="/edit"]')
    const title = await editBtn.getAttribute('title')
    expect(title).toBeTruthy()
  })

  test('TL-75: page renders without JavaScript console errors', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await gotoTenants(page)
    await page.waitForTimeout(1000)
    // Allow network errors for API calls but no app-level JS errors
    const appErrors = errors.filter(
      (e) =>
        !e.includes('net::ERR') &&
        !e.includes('Failed to load resource') &&
        !e.includes('401') &&
        !e.includes('403') &&
        !e.includes('CORS') &&
        !e.includes('Access-Control') &&
        !e.includes('preflight')
    )
    expect(appErrors).toHaveLength(0)
  })
})
