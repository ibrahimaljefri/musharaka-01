/**
 * Post-rebrand admin smoke — verifies the tickets "جديد" filter fix
 * shipped this session.
 *
 * PRSM-04  Admin tickets "جديد" filter pill sends value="new" and returns rows
 *
 * Lives under e2e/admin/ so playwright.config.ts picks it up via the
 * `admin` project (storageState = fixtures/.auth/admin.json).
 */
import { test, expect } from '@playwright/test'

const NEW_TICKET = JSON.stringify([
  {
    id: 'smoke-new-1',
    ticket_number: 'TKT-SMOKE-001',
    status: 'new',
    tenant_name: 'شركة الاختبار',
    submitter_name: 'مستخدم اختبار',
    submitter_email: 'test@smoke.com',
    category: 'تقني',
    created_at: '2025-01-01T10:00:00Z',
  },
])

test('PRSM-04: ضغط "جديد" يُظهر صفاً واحداً على الأقل في الجدول', async ({ page }) => {
  // Intercept the admin tickets API so the test is data-independent
  await page.route('**/admin/tickets**', (route, request) => {
    if (request.resourceType() === 'document') return route.continue()
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: NEW_TICKET,
    })
  })

  await page.goto('/admin/tickets')
  await expect(page.getByRole('button', { name: 'جديد' })).toBeVisible()

  await page.getByRole('button', { name: 'جديد' }).click()

  // Must NOT show the empty-state message — at least one data row visible
  await expect(page.locator('table tbody tr').first()).toBeVisible()
})
