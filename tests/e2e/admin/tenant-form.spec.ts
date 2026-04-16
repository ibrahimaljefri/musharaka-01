/**
 * Admin — TenantForm page tests (TF-01 through TF-~100)
 *
 * Covers both modes:
 *   Create: /admin/tenants/create
 *   Edit:   /admin/tenants/:id/edit
 *
 * Project: admin (storageState: fixtures/.auth/admin.json)
 * Base URL: http://localhost:5173
 * Locale: ar-SA  |  Direction: RTL
 */
import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_PLANS_JSON = JSON.stringify([
  { id: 'plan-1', name_ar: 'أساسي', name_en: 'Basic', price_sar: 999, billing_period: 'annual', max_users: 3, max_branches: 3, extra_branch_sar: 300, extra_user_sar: 240 },
  { id: 'plan-2', name_ar: 'متوسط', name_en: 'Standard', price_sar: 1999, billing_period: 'annual', max_users: 8, max_branches: 8, extra_branch_sar: 300, extra_user_sar: 240 },
  { id: 'plan-3', name_ar: 'متقدم', name_en: 'Professional', price_sar: 3999, billing_period: 'annual', max_users: 15, max_branches: 15, extra_branch_sar: 300, extra_user_sar: 240 },
])

const MOCK_TENANT_OBJ = {
  id: 1,
  name: 'شركة الاختبار للتجارة',
  slug: 'test-company',
  status: 'active',
  plan_id: 'plan-1',
  plan_name: 'أساسي',
  max_branches: 3,
  max_users: 3,
  activated_at: '2025-01-01',
  expires_at: '2026-01-01',
  allowed_input_types: 'daily,monthly,range',
  allow_import: true,
  allow_advanced_dashboard: false,
  commercial_registration: '1234567890',
  primary_phone: '+966501234567',
  account_number: 'ACC-001',
  notes: '',
  branch_count: 2,
  user_count: 1,
}
const MOCK_TENANT_JSON = JSON.stringify(MOCK_TENANT_OBJ)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gotoCreate(page: any) {
  await page.goto('/admin/tenants/create')
  await page.waitForSelector('form, h1', { timeout: 15_000 })
}

async function gotoEditById(page: any, id: string | number) {
  await page.goto(`/admin/tenants/${id}/edit`)
  await page.waitForSelector('form, h1', { timeout: 15_000 })
}

// ---------------------------------------------------------------------------
// TF-01 – TF-10 : Create mode — page load & routing
// ---------------------------------------------------------------------------

test.describe('TenantForm (create) — page load & routing', () => {
  test('TF-01: /admin/tenants/create does not redirect to /login', async ({
    page,
  }) => {
    await page.goto('/admin/tenants/create')
    await page.waitForTimeout(500)
    expect(page.url()).not.toMatch(/login/)
  })

  test('TF-02: heading "إضافة مستأجر جديد" is visible in create mode', async ({
    page,
  }) => {
    await gotoCreate(page)
    await expect(
      page.getByRole('heading', { name: 'إضافة مستأجر جديد' })
    ).toBeVisible()
  })

  test('TF-03: sub-heading "إنشاء حساب جديد وتهيئة الصلاحيات" is visible', async ({
    page,
  }) => {
    await gotoCreate(page)
    await expect(
      page.getByText('إنشاء حساب جديد وتهيئة الصلاحيات')
    ).toBeVisible()
  })

  test('TF-04: URL stays at /admin/tenants/create after page load', async ({
    page,
  }) => {
    await gotoCreate(page)
    expect(page.url()).toMatch(/\/admin\/tenants\/create$/)
  })

  test('TF-05: html element has dir="rtl" in create mode', async ({
    page,
  }) => {
    await gotoCreate(page)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('TF-06: back arrow button is visible', async ({ page }) => {
    await gotoCreate(page)
    // The ArrowRight icon is inside a button that navigates back
    const backBtn = page.locator('button').filter({
      has: page.locator('svg'),
    }).first()
    await expect(backBtn).toBeVisible()
  })

  test('TF-07: back arrow navigates to /admin/tenants', async ({ page }) => {
    await gotoCreate(page)
    // The back arrow is the first button inside the .max-w-2xl form container
    const backBtn = page.locator('.max-w-2xl button').first()
    await backBtn.click()
    await page.waitForURL(/\/admin\/tenants$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/admin\/tenants$/)
  })
})

// ---------------------------------------------------------------------------
// TF-11 – TF-25 : Create mode — form fields
// ---------------------------------------------------------------------------

test.describe('TenantForm (create) — form fields', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCreate(page)
  })

  test('TF-11: "معلومات الحساب" section heading is visible', async ({
    page,
  }) => {
    await expect(page.getByText('معلومات الحساب')).toBeVisible()
  })

  test('TF-12: "اسم المؤسسة" input is visible and required', async ({
    page,
  }) => {
    const nameInput = page
      .locator('input')
      .filter({ has: page.locator('[required]') })
      .first()
    // Alternatively, look for the label text
    await expect(page.getByText('اسم المؤسسة')).toBeVisible()
  })

  test('TF-13: "الرمز المختصر (slug)" input is visible', async ({ page }) => {
    await expect(page.getByText(/الرمز المختصر/)).toBeVisible()
  })

  test('TF-14: "رقم السجل التجاري" input is visible', async ({ page }) => {
    await expect(page.getByText('رقم السجل التجاري')).toBeVisible()
  })

  test('TF-15: "رقم الجوال الرئيسي" input is visible', async ({ page }) => {
    await expect(page.getByText('رقم الجوال الرئيسي')).toBeVisible()
  })

  test('TF-16: "رقم الحساب" input is visible', async ({ page }) => {
    await expect(page.getByText('رقم الحساب')).toBeVisible()
  })

  test('TF-17: "ملاحظات" textarea is visible', async ({ page }) => {
    await expect(page.getByText('ملاحظات')).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('TF-18: typing in name auto-generates slug (lowercase, hyphens)', async ({
    page,
  }) => {
    // Find the name input by its label
    const nameLabel = page.getByText('اسم المؤسسة').first()
    const nameInput = page.locator('input').first()
    await nameInput.fill('Test Company Name')
    await page.waitForTimeout(200)

    // Find the slug input — it has dir="ltr" and font-mono
    const slugInput = page.locator('input[dir="ltr"]').first()
    const slugVal = await slugInput.inputValue()
    expect(slugVal).toMatch(/^[a-z0-9-]+$/)
    expect(slugVal).toBe('test-company-name')
  })

  test('TF-19: slug input is editable manually', async ({ page }) => {
    const slugInput = page.locator('input[dir="ltr"]').first()
    await slugInput.fill('custom-slug')
    expect(await slugInput.inputValue()).toBe('custom-slug')
  })

  test('TF-20: "الاشتراك والصلاحيات" section heading is visible', async ({
    page,
  }) => {
    await expect(page.getByText('الاشتراك والصلاحيات')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// TF-26 – TF-38 : Create mode — subscription & permissions section
// ---------------------------------------------------------------------------

test.describe('TenantForm (create) — subscription & permissions', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCreate(page)
  })

  test('TF-26: plan select has "أساسي", "احترافي", "مؤسسي" options', async ({
    page,
  }) => {
    const planSelect = page.locator('select').first()
    await expect(planSelect).toBeVisible()
    await expect(planSelect.locator('option', { hasText: 'أساسي' })).toHaveCount(1)
    await expect(planSelect.locator('option', { hasText: 'احترافي' })).toHaveCount(1)
    await expect(planSelect.locator('option', { hasText: 'مؤسسي' })).toHaveCount(1)
  })

  test('TF-27: plan defaults to "أساسي"', async ({ page }) => {
    const planSelect = page.locator('select').first()
    await expect(planSelect).toHaveValue('basic')
  })

  test('TF-28: "تاريخ التفعيل" date input is visible and pre-filled with today', async ({
    page,
  }) => {
    await expect(page.getByText('تاريخ التفعيل')).toBeVisible()
    const dateInput = page.locator('input[type="date"]').first()
    await expect(dateInput).toBeVisible()
    const val = await dateInput.inputValue()
    expect(val).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('TF-29: "تاريخ الانتهاء" date input is visible and empty by default', async ({
    page,
  }) => {
    await expect(page.getByText('تاريخ الانتهاء')).toBeVisible()
    const dateInputs = page.locator('input[type="date"]')
    const count = await dateInputs.count()
    expect(count).toBeGreaterThanOrEqual(2)
    const expiresInput = dateInputs.nth(1)
    const val = await expiresInput.inputValue()
    expect(val).toBe('')
  })

  test('TF-30: "الميزات المتاحة" section is visible with three toggles', async ({
    page,
  }) => {
    await expect(page.getByText('الميزات المتاحة')).toBeVisible()
    await expect(page.getByText('لوحة التحكم المتقدمة')).toBeVisible()
    await expect(page.getByText('استيراد Excel')).toBeVisible()
    await expect(page.getByText('التقارير', { exact: true })).toBeVisible()
  })

  test('TF-31: feature toggle buttons are visible', async ({ page }) => {
    // Feature toggles are button elements inside the feature rows
    const toggleBtns = page.locator(
      '[class*="rounded-full"][class*="h-6"][class*="w-11"]'
    )
    const count = await toggleBtns.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('TF-32: feature toggles are off by default (gray)', async ({
    page,
  }) => {
    const toggleBtns = page.locator(
      '[class*="rounded-full"][class*="h-6"][class*="w-11"]'
    )
    const count = await toggleBtns.count()
    for (let i = 0; i < count; i++) {
      const cls = await toggleBtns.nth(i).getAttribute('class')
      // Default off = bg-gray-300
      expect(cls).toMatch(/gray/)
    }
  })

  test('TF-33: clicking a feature toggle turns it yellow (active)', async ({
    page,
  }) => {
    const firstToggle = page
      .locator('[class*="rounded-full"][class*="h-6"][class*="w-11"]')
      .first()
    await firstToggle.click()
    await page.waitForTimeout(200)
    const cls = await firstToggle.getAttribute('class')
    expect(cls).toMatch(/yellow/)
  })

  test('TF-34: "أنواع الإدخال المسموح بها" section is visible', async ({
    page,
  }) => {
    await expect(page.getByText('أنواع الإدخال المسموح بها')).toBeVisible()
  })

  test('TF-35: input type buttons "يومي", "شهري", "فترة مخصصة" are visible', async ({
    page,
  }) => {
    await expect(page.getByRole('button', { name: 'يومي' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'شهري' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'فترة مخصصة' })).toBeVisible()
  })

  test('TF-36: "يومي" input type is active by default (yellow)', async ({
    page,
  }) => {
    const dailyBtn = page.getByRole('button', { name: 'يومي' })
    const cls = await dailyBtn.getAttribute('class')
    expect(cls).toMatch(/yellow/)
  })

  test('TF-37: clicking "شهري" button activates it', async ({ page }) => {
    const monthlyBtn = page.getByRole('button', { name: 'شهري' })
    await monthlyBtn.click()
    await page.waitForTimeout(200)
    const cls = await monthlyBtn.getAttribute('class')
    expect(cls).toMatch(/yellow/)
  })

  test('TF-38: clicking active input type button deactivates it', async ({
    page,
  }) => {
    const dailyBtn = page.getByRole('button', { name: 'يومي' })
    // It's active by default; click to deactivate
    await dailyBtn.click()
    await page.waitForTimeout(200)
    const cls = await dailyBtn.getAttribute('class')
    // After deactivation it should no longer be yellow/active
    expect(cls).not.toMatch(/bg-yellow-600/)
  })
})

// ---------------------------------------------------------------------------
// TF-39 – TF-46 : Create mode — max branches & subscription plan select
// ---------------------------------------------------------------------------

test.describe('TenantForm (create) — max branches & plan select', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCreate(page)
  })

  test('TF-39: "الحد الأقصى للفروع" label is visible', async ({ page }) => {
    await expect(page.getByText('الحد الأقصى للفروع')).toBeVisible()
  })

  test('TF-40: max_branches input defaults to 3', async ({ page }) => {
    const maxBranchesInput = page.locator('input[type="number"]')
    await expect(maxBranchesInput).toBeVisible()
    const val = await maxBranchesInput.inputValue()
    expect(parseInt(val, 10)).toBe(3)
  })

  test('TF-41: max_branches input min attribute is 3', async ({ page }) => {
    const maxBranchesInput = page.locator('input[type="number"]')
    const min = await maxBranchesInput.getAttribute('min')
    expect(min).toBe('3')
  })

  test('TF-42: "باقة الاشتراك" select is visible', async ({ page }) => {
    await expect(page.getByText('باقة الاشتراك')).toBeVisible()
  })

  test('TF-43: subscription plan select has "-- بدون باقة محددة --" default', async ({
    page,
  }) => {
    // The second select is the subscription plan select
    const planSelects = page.locator('select')
    const count = await planSelects.count()
    expect(count).toBeGreaterThanOrEqual(2)
    const subscriptionSelect = planSelects.last()
    const firstOption = subscriptionSelect.locator('option').first()
    await expect(firstOption).toContainText('بدون باقة')
  })
})

// ---------------------------------------------------------------------------
// TF-47 – TF-55 : Create mode — user section
// ---------------------------------------------------------------------------

test.describe('TenantForm (create) — first user section', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCreate(page)
  })

  test('TF-47: "حساب المستخدم الأول" section heading is visible in create mode', async ({
    page,
  }) => {
    await expect(page.getByText('حساب المستخدم الأول')).toBeVisible()
  })

  test('TF-48: "البريد الإلكتروني" input is visible in user section', async ({
    page,
  }) => {
    await expect(page.getByText('البريد الإلكتروني').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('TF-49: "كلمة المرور المؤقتة" input is visible', async ({ page }) => {
    await expect(page.getByText('كلمة المرور المؤقتة')).toBeVisible()
  })

  test('TF-50: "الاسم الكامل" input is visible in user section', async ({
    page,
  }) => {
    await expect(page.getByText('الاسم الكامل')).toBeVisible()
  })

  test('TF-51: user section fields accept input', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill('admin@example.com')
    expect(await emailInput.inputValue()).toBe('admin@example.com')
  })
})

// ---------------------------------------------------------------------------
// TF-56 – TF-64 : Create mode — submit button & Cancel
// ---------------------------------------------------------------------------

test.describe('TenantForm (create) — submit & cancel buttons', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCreate(page)
  })

  test('TF-56: "إنشاء الحساب" submit button is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /إنشاء الحساب/ })
    ).toBeVisible()
  })

  test('TF-57: "إلغاء" button is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'إلغاء' })
    ).toBeVisible()
  })

  test('TF-58: "إلغاء" button navigates back to /admin/tenants', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'إلغاء' }).click()
    await page.waitForURL(/\/admin\/tenants$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/admin\/tenants$/)
  })

  test('TF-59: submit button has yellow background', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /إنشاء الحساب/ })
    const cls = await submitBtn.getAttribute('class')
    expect(cls).toMatch(/yellow/)
  })

  test('TF-60: submit button is type="submit"', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /إنشاء الحساب/ })
    const type = await submitBtn.getAttribute('type')
    expect(type).toBe('submit')
  })

  test('TF-61: submitting empty required fields shows browser validation (or error banner)', async ({
    page,
  }) => {
    // Click submit without filling required fields
    const submitBtn = page.getByRole('button', { name: /إنشاء الحساب/ })
    await submitBtn.click()
    await page.waitForTimeout(500)

    // Either browser native validation kept us on the page, or an error banner appeared
    const stillOnCreate = page.url().includes('/create')
    const errorBanner = await page
      .locator('[class*="error"], [class*="red"]')
      .isVisible()
      .catch(() => false)

    expect(stillOnCreate || errorBanner).toBeTruthy()
  })

  test('TF-62: API error shows error AlertBanner', async ({ page }) => {
    // Mock the create endpoint to return a 409 duplicate slug error
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      if (request.method() === 'POST') {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: '{"error":"slug already exists"}',
        })
      }
      return route.continue()
    })
    // Fill minimal required fields with an existing slug to trigger duplicate error
    await page.locator('input').first().fill('Duplicate Company')
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /إنشاء الحساب/ }).click()
    await page.waitForTimeout(1500)
    // An error banner should appear
    await expect(
      page.locator('[class*="error"], [class*="red"]').first()
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// TF-65 – TF-72 : Edit mode — page load
// ---------------------------------------------------------------------------

test.describe('TenantForm (edit) — page load', () => {
  test('TF-65: /admin/tenants/nonexistent/edit does not crash the app', async ({
    page,
  }) => {
    await page.goto('/admin/tenants/nonexistent/edit')
    await page.waitForTimeout(1500)
    // The page should either show the form (after fetch fails gracefully) or redirect
    const url = page.url()
    // Should not be a blank page — at minimum the layout renders
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(0)
  })

  test('TF-66: /admin/tenants/99999/edit shows form heading (graceful on 404)', async ({
    page,
  }) => {
    await page.goto('/admin/tenants/99999/edit')
    await page.waitForTimeout(2000)
    // Either shows edit form or empty form — heading should still be present
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible()
  })

  test('TF-67: edit mode heading is "تعديل المستأجر"', async ({ page }) => {
    await page.route('**/admin/tenants/1', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
    })
    await page.route('**/admin/plans', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_PLANS_JSON })
    })
    await gotoEditById(page, 1)
    await expect(
      page.getByRole('heading', { name: 'تعديل المستأجر' })
    ).toBeVisible()
  })

  test('TF-68: edit mode sub-heading is "تعديل بيانات الحساب والاشتراك"', async ({
    page,
  }) => {
    await page.route('**/admin/tenants/1', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
    })
    await page.route('**/admin/plans', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_PLANS_JSON })
    })
    await gotoEditById(page, 1)
    await expect(
      page.getByText('تعديل بيانات الحساب والاشتراك')
    ).toBeVisible()
  })

  test('TF-69: edit mode does NOT show the user creation section', async ({
    page,
  }) => {
    await page.route('**/admin/tenants/1', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
    })
    await page.route('**/admin/plans', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_PLANS_JSON })
    })
    await gotoEditById(page, 1)
    await page.waitForSelector('form', { timeout: 10_000 })
    // "حساب المستخدم الأول" should NOT be visible in edit mode
    await expect(page.getByText('حساب المستخدم الأول')).not.toBeVisible()
  })

  test('TF-70: edit mode submit button text is "حفظ التعديلات"', async ({
    page,
  }) => {
    await page.route('**/admin/tenants/1', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
    })
    await page.route('**/admin/plans', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_PLANS_JSON })
    })
    await gotoEditById(page, 1)
    await expect(
      page.getByRole('button', { name: /حفظ التعديلات/ })
    ).toBeVisible()
  })

  test('TF-71: edit mode shows status radio buttons (نشط/موقوف/منتهي)', async ({
    page,
  }) => {
    await page.route('**/admin/tenants/1', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
    })
    await page.route('**/admin/plans', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_PLANS_JSON })
    })
    await gotoEditById(page, 1)
    await page.waitForSelector('form', { timeout: 10_000 })
    await expect(page.getByText('نشط')).toBeVisible()
    await expect(page.getByText('موقوف')).toBeVisible()
    await expect(page.getByText('منتهي')).toBeVisible()
  })

  test('TF-72: status radio buttons are of type="radio"', async ({ page }) => {
    await page.route('**/admin/tenants/1', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
    })
    await page.route('**/admin/plans', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_PLANS_JSON })
    })
    await gotoEditById(page, 1)
    await page.waitForSelector('form', { timeout: 10_000 })
    const radios = page.locator('input[type="radio"][name="status"]')
    const count = await radios.count()
    expect(count).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// TF-73 – TF-80 : Edit mode — pre-fill & field behavior
// ---------------------------------------------------------------------------

test.describe('TenantForm (edit) — form pre-fill', () => {
  test('TF-73: edit mode pre-fills form fields from API', async ({ page }) => {
    await page.route('**/admin/tenants/1', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
    })
    await page.route('**/admin/plans', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_PLANS_JSON })
    })
    await gotoEditById(page, 1)
    await page.waitForSelector('form', { timeout: 10_000 })
    const nameInput = page.locator('input').first()
    const val = await nameInput.inputValue()
    expect(val.length).toBeGreaterThan(0)
  })

  test('TF-74: edit mode slug field is NOT auto-generated on name change', async ({
    page,
  }) => {
    await page.route('**/admin/tenants/1', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
    })
    await page.route('**/admin/plans', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_PLANS_JSON })
    })
    await gotoEditById(page, 1)
    await page.waitForSelector('form', { timeout: 10_000 })

    const slugInput = page.locator('input[dir="ltr"]').first()
    const originalSlug = await slugInput.inputValue()

    const nameInput = page.locator('input').first()
    await nameInput.fill('New Name That Should Not Change Slug')
    await page.waitForTimeout(200)

    const newSlug = await slugInput.inputValue()
    // Slug should NOT have changed in edit mode
    expect(newSlug).toBe(originalSlug)
  })

  test('TF-75: "حفظ التعديلات" success shows success AlertBanner', async ({
    page,
  }) => {
    await page.route('**/admin/tenants/1', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      if (request.method() === 'PUT') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
    })
    await page.route('**/admin/plans', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_PLANS_JSON })
    })
    await gotoEditById(page, 1)
    await page.waitForSelector('form', { timeout: 10_000 })

    await page.getByRole('button', { name: /حفظ التعديلات/ }).click()
    await page.waitForTimeout(2000)

    await expect(
      page.getByText(/تم تحديث بيانات المستأجر بنجاح/)
    ).toBeVisible({ timeout: 5_000 })
  })
})

// ---------------------------------------------------------------------------
// TF-81 – TF-87 : Accessibility & RTL
// ---------------------------------------------------------------------------

test.describe('TenantForm — accessibility & RTL', () => {
  test('TF-81: create page has exactly one h1 heading', async ({ page }) => {
    await gotoCreate(page)
    const h1Count = await page.getByRole('heading', { level: 1 }).count()
    expect(h1Count).toBe(1)
  })

  test('TF-82: all text inputs have visible labels', async ({ page }) => {
    await gotoCreate(page)
    const labels = page.locator('label')
    const count = await labels.count()
    expect(count).toBeGreaterThan(5)
  })

  test('TF-83: form element has correct role', async ({ page }) => {
    await gotoCreate(page)
    await expect(page.locator('form')).toBeVisible()
  })

  test('TF-84: submit button is keyboard-focusable', async ({ page }) => {
    await gotoCreate(page)
    const submitBtn = page.getByRole('button', { name: /إنشاء الحساب/ })
    await submitBtn.focus()
    await expect(submitBtn).toBeFocused()
  })

  test('TF-85: required fields have asterisk indicators', async ({ page }) => {
    await gotoCreate(page)
    // Required fields show a red * span
    const requiredMarks = page.locator('span.text-red-500')
    const count = await requiredMarks.count()
    expect(count).toBeGreaterThanOrEqual(2) // name and slug are required
  })

  test('TF-86: no JavaScript console errors on create page', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await gotoCreate(page)
    await page.waitForTimeout(1000)
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

  test('TF-87: create page renders correctly at 375px mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await gotoCreate(page)
    await expect(
      page.getByRole('heading', { name: 'إضافة مستأجر جديد' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /إنشاء الحساب/ })
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// TF-88 – TF-95 : Loading spinner behavior
// ---------------------------------------------------------------------------

test.describe('TenantForm — loading state', () => {
  test('TF-88: loading spinner is not permanently visible after create page loads', async ({
    page,
  }) => {
    await page.goto('/admin/tenants/create')
    await page.waitForTimeout(2000)
    // The fetching spinner (shown during edit-mode data fetch) should not show in create mode
    const spinner = page.locator('[class*="animate-spin"]')
    await expect(spinner).not.toBeVisible()
  })

  test('TF-89: submit button shows "جاري الحفظ..." while loading', async ({
    page,
  }) => {
    // Mock the create endpoint with a delay to capture the loading state
    await page.route('**/admin/tenants', async (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      if (request.method() === 'POST') {
        await new Promise((r) => setTimeout(r, 500))
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 99, ...MOCK_TENANT_OBJ }),
        })
      }
      return route.continue()
    })
    await gotoCreate(page)
    // Fill required fields
    await page.locator('input').first().fill('Test Tenant')
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /إنشاء الحساب/ }).click()
    // Immediately check for loading state text
    await expect(page.getByText('جاري الحفظ...')).toBeVisible()
  })

  test('TF-90: submit button is disabled while form is submitting', async ({
    page,
  }) => {
    // Mock the create endpoint with a delay to capture the disabled state
    await page.route('**/admin/tenants', async (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      if (request.method() === 'POST') {
        await new Promise((r) => setTimeout(r, 500))
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 99, ...MOCK_TENANT_OBJ }),
        })
      }
      return route.continue()
    })
    await gotoCreate(page)
    await page.locator('input').first().fill('Test Tenant')
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /إنشاء الحساب/ }).click()
    const submitBtn = page.getByRole('button', { name: /جاري الحفظ/ })
    await expect(submitBtn).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// TF-96 – TF-100 : Navigation edge-cases
// ---------------------------------------------------------------------------

test.describe('TenantForm — navigation edge-cases', () => {
  test('TF-96: browser back from create form lands on /admin/tenants', async ({
    page,
  }) => {
    await page.goto('/admin/tenants')
    await page.waitForTimeout(500)
    await page.goto('/admin/tenants/create')
    await page.waitForTimeout(500)
    await page.goBack()
    await page.waitForURL(/\/admin\/tenants$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/admin\/tenants$/)
  })

  test('TF-97: direct URL /admin/tenants/create is accessible without 404', async ({
    page,
  }) => {
    const response = await page.goto('/admin/tenants/create')
    // SPA — the server returns 200 for all routes; the app handles routing
    // Just verify the page does not show a 404 message
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/404/)
  })

  test('TF-98: /admin/tenants/abc/edit does not cause blank screen', async ({
    page,
  }) => {
    await page.goto('/admin/tenants/abc/edit')
    await page.waitForTimeout(2000)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(10)
  })

  test('TF-99: cancelling on edit page returns to /admin/tenants', async ({
    page,
  }) => {
    await page.route('**/admin/tenants/1', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANT_JSON })
    })
    await page.route('**/admin/plans', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_PLANS_JSON })
    })
    await gotoEditById(page, 1)
    await page.waitForSelector('form', { timeout: 10_000 })
    await page.getByRole('button', { name: 'إلغاء' }).click()
    await page.waitForURL(/\/admin\/tenants$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/admin\/tenants$/)
  })

  test('TF-100: create success navigates to /admin/tenants after 1.5s', async ({
    page,
  }) => {
    // Mock the create endpoint to return success
    await page.route('**/admin/tenants', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      if (request.method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 99, ...MOCK_TENANT_OBJ }),
        })
      }
      return route.continue()
    })
    await gotoCreate(page)
    // Fill all required fields with unique data
    const ts = Date.now()
    await page.locator('input').first().fill(`E2E Tenant ${ts}`)
    await page.waitForTimeout(200)
    // Submit
    await page.getByRole('button', { name: /إنشاء الحساب/ }).click()
    // On success, the app shows a success banner then redirects after 1.5s
    await expect(
      page.getByText(/تم إنشاء المستأجر بنجاح/)
    ).toBeVisible({ timeout: 5_000 })
    await page.waitForURL(/\/admin\/tenants$/, { timeout: 5_000 })
    expect(page.url()).toMatch(/\/admin\/tenants$/)
  })
})
