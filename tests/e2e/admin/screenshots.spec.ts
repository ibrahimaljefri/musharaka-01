import { test } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const OUT = 'C:/Users/ibrahim/Desktop/admin-screenshots'
fs.mkdirSync(OUT, { recursive: true })

const TENANTS = JSON.stringify([
  { id: 1, name: 'شركة الأمل للتجارة', slug: 'amal', status: 'active', plan: 'متوسط', max_branches: 8, max_users: 8, activated_at: '2025-03-01', expires_at: '2026-03-01', allowed_input_types: 'daily,monthly', allow_advanced_dashboard: false, created_at: '2025-03-01T10:00:00Z', branch_count: 3, user_count: 5 },
  { id: 2, name: 'مؤسسة النور', slug: 'nour', status: 'suspended', plan: 'أساسي', max_branches: 3, max_users: 3, activated_at: '2024-06-01', expires_at: '2025-06-01', allowed_input_types: 'daily', allow_advanced_dashboard: false, created_at: '2024-06-01T10:00:00Z', branch_count: 2, user_count: 2 },
  { id: 3, name: 'شركة المستقبل', slug: 'mustaqbal', status: 'active', plan: 'متقدم', max_branches: 15, max_users: 15, activated_at: '2025-01-01', expires_at: '2027-01-01', allowed_input_types: 'daily,monthly,range', allow_advanced_dashboard: true, created_at: '2025-01-01T10:00:00Z', branch_count: 9, user_count: 12 },
])
const USERS = JSON.stringify([
  { id: 'u1', full_name: 'محمد السالم', email: 'msalem@amal.com', role: 'admin', tenant_id: 1, tenant_name: 'شركة الأمل للتجارة', status: 'confirmed', registered_at: '2025-03-05T10:00:00Z', created_at: '2025-03-05T10:00:00Z' },
  { id: 'u2', full_name: 'سارة الأحمد', email: 'sahmad@amal.com', role: 'member', tenant_id: 1, tenant_name: 'شركة الأمل للتجارة', status: 'confirmed', registered_at: '2025-03-10T10:00:00Z', created_at: '2025-03-10T10:00:00Z' },
  { id: 'u3', full_name: 'خالد العمري', email: 'komri@nour.com', role: 'admin', tenant_id: 2, tenant_name: 'مؤسسة النور', status: 'confirmed', registered_at: '2024-06-02T10:00:00Z', created_at: '2024-06-02T10:00:00Z' },
  { id: 'u4', full_name: 'نورة الزهراني', email: 'nzahrani@new.com', role: null, tenant_id: null, tenant_name: null, status: 'pending', registered_at: '2026-04-15T10:00:00Z', created_at: '2026-04-15T10:00:00Z' },
])
const SUBS = JSON.stringify([
  { id: 1, tenant_id: 1, tenant_name: 'شركة الأمل للتجارة', platform: 'telegram', chat_id: '123456789', contact_name: 'محمد مدير الأمل', is_active: true, created_at: '2025-03-06T10:00:00Z' },
  { id: 2, tenant_id: 3, tenant_name: 'شركة المستقبل', platform: 'telegram', chat_id: '987654321', contact_name: 'علي مدير المستقبل', is_active: true, created_at: '2025-01-15T10:00:00Z' },
  { id: 3, tenant_id: 2, tenant_name: 'مؤسسة النور', platform: 'telegram', chat_id: '555444333', contact_name: 'خالد مدير النور', is_active: false, created_at: '2024-06-03T10:00:00Z' },
])
const TICKETS = JSON.stringify([
  { id: 'tk1', tenant_id: 1, tenant_name: 'شركة الأمل للتجارة', subject: 'مشكلة في تسجيل المبيعات اليومية', status: 'new', category: 'مبيعات', created_at: '2026-04-16T08:00:00Z', updated_at: '2026-04-16T08:00:00Z' },
  { id: 'tk2', tenant_id: 3, tenant_name: 'شركة المستقبل', subject: 'طلب تجديد الترخيص', status: 'in_progress', category: 'ترخيص', created_at: '2026-04-14T10:00:00Z', updated_at: '2026-04-15T14:30:00Z' },
  { id: 'tk3', tenant_id: 1, tenant_name: 'شركة الأمل للتجارة', subject: 'استفسار عن إضافة فرع جديد', status: 'resolved', category: 'فروع', created_at: '2026-04-10T09:00:00Z', updated_at: '2026-04-11T11:00:00Z' },
])
const PLANS = JSON.stringify([
  { id: 'p1', name_ar: 'أساسي', name_en: 'Basic', price_sar: 999, billing_period: 'annual', max_branches: 3, max_users: 3, extra_branch_sar: 300, extra_user_sar: 240 },
  { id: 'p2', name_ar: 'متوسط', name_en: 'Standard', price_sar: 1999, billing_period: 'annual', max_branches: 8, max_users: 8, extra_branch_sar: 300, extra_user_sar: 240 },
  { id: 'p3', name_ar: 'متقدم', name_en: 'Professional', price_sar: 3999, billing_period: 'annual', max_branches: 15, max_users: 15, extra_branch_sar: 300, extra_user_sar: 240 },
])

test.use({ viewport: { width: 1400, height: 900 } })

/** Navigate, wait for auth + page to fully settle, then capture. */
async function gotoAndCapture(page: any, url: string, heading: string, outFile: string) {
  await page.goto(url)
  // Wait for the page-specific heading — use a long timeout to ride out the
  // isSuperAdmin redirect chain (false → /dashboard → back to /admin/xxx → true)
  // NOTE: some headings (e.g. "إدارة المستأجرين") also appear as sidebar nav labels
  //       which are outside the .page-enter animated div, so we must NOT rely solely
  //       on text presence to know the main content is visible.
  await page.waitForFunction(
    (text: string) => document.body.innerText.includes(text),
    heading,
    { timeout: 28000 }
  )
  // Wait for all pending network requests to finish (mocked API calls resolve quickly;
  // real calls may take longer).  Failure is non-fatal — we continue with the opacity check.
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
  // The .page-enter div wraps <Outlet /> with `animation: pageEnter 0.22s ease-out both`
  // (opacity 0 → 1).  We poll until opacity ≥ 0.99 so the screenshot catches real content.
  // If the element doesn't exist (e.g. error boundary), we proceed immediately.
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.page-enter')
      if (!el) return true
      return parseFloat(window.getComputedStyle(el).opacity) >= 0.99
    },
    { timeout: 10000 }
  )
  // Small render-flush buffer
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, outFile) })
}

test('00 - warm up browser', async ({ page }) => {
  // Navigate first to warm up Vite dev server JS bundle cache
  await page.goto('/admin/users')
  await page.waitForFunction(
    (text: string) => document.body.innerText.includes(text),
    'إدارة المستخدمين',
    { timeout: 30000 }
  )
})

test('01 - admin dashboard', async ({ page }) => {
  // Use RegExp to guarantee the mock intercepts regardless of base URL
  await page.route(/admin\/stats/, (route, req) => {
    if (req.resourceType() === 'document') return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ totals: { tenants: 12, branches: 38, tenant_users: 44, auth_users: 47, pending_users: 3 }, subscriptions: { expiring_3m: 1, expiring_6m: 2, expiring_11m: 3, expiring_12m_plus: 5, no_expiry: 1 }, users_per_tenant: { 'شركة الأمل': 5, 'شركة المستقبل': 12, 'مؤسسة النور': 2 }, branches_per_tenant: { 'شركة الأمل': 3, 'شركة المستقبل': 9, 'مؤسسة النور': 2 } }) })
  })
  await page.goto('/admin/dashboard')
  // Dashboard h1 ("لوحة الإدارة") only renders after stats load successfully.
  // Accept either success heading OR error text so the test never times out.
  await page.waitForFunction(
    () => document.body.innerText.includes('لوحة الإدارة') ||
          document.body.innerText.includes('تعذّر تحميل'),
    { timeout: 28000 }
  )
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.page-enter')
      if (!el) return true
      return parseFloat(window.getComputedStyle(el).opacity) >= 0.99
    },
    { timeout: 10000 }
  )
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, '01-dashboard.png') })
})

test('02 - tenants list', async ({ page }) => {
  // Use RegExp to guarantee the mock intercepts regardless of base URL
  await page.route(/\/admin\/tenants(?!\/)/, (route, req) => {
    if (req.resourceType() === 'document') return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: TENANTS })
  })
  await gotoAndCapture(page, '/admin/tenants', 'إدارة المستأجرين', '02-tenants.png')
})

test('03 - tenant form (new)', async ({ page }) => {
  await page.route('**/admin/plans', (route, req) => {
    if (req.resourceType() === 'document') return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: PLANS })
  })
  await gotoAndCapture(page, '/admin/tenants/create', 'إضافة مستأجر جديد', '03-tenant-form.png')
})

test('04 - users list', async ({ page }) => {
  await page.route('**/admin/users', (route, req) => {
    if (req.resourceType() === 'document') return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: USERS })
  })
  await gotoAndCapture(page, '/admin/users', 'إدارة المستخدمين', '04-users.png')
})

test('05 - bot subscribers', async ({ page }) => {
  await page.route('**/admin/bot-subscribers', (route, req) => {
    if (req.resourceType() === 'document') return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: SUBS })
  })
  await gotoAndCapture(page, '/admin/bot-subscribers', 'مشتركو الروبوت', '05-bot-subscribers.png')
})

test('06 - tickets list', async ({ page }) => {
  await page.route('**/admin/tickets', (route, req) => {
    if (req.resourceType() === 'document') return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: TICKETS })
  })
  await gotoAndCapture(page, '/admin/tickets', 'تذاكر الدعم', '06-tickets.png')
})
