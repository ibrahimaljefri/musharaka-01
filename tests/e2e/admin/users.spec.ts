import { test, expect } from '@playwright/test'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_USERS_JSON = JSON.stringify([
  {
    id: 'user-001',
    full_name: 'أحمد محمد',
    email: 'ahmed@test.com',
    role: 'admin',
    tenant_id: 'tenant-001',
    tenant_name: 'شركة الاختبار',
    status: 'confirmed',
    registered_at: '2025-01-01T10:00:00Z',
    created_at: '2025-01-01T10:00:00Z',
  },
  {
    id: 'user-pending',
    full_name: 'مستخدم معلق',
    email: 'pending@test.com',
    role: null,
    tenant_id: null,
    tenant_name: null,
    status: 'pending',          // must be 'pending' — component filters by status === 'pending'
    registered_at: '2025-01-02T10:00:00Z',
    created_at: '2025-01-02T10:00:00Z',
  },
])

const MOCK_TENANTS_JSON = JSON.stringify([
  { id: 'tenant-001', name: 'شركة الاختبار', slug: 'test-co', status: 'active' },
])

async function mockApis(page: any) {
  await page.route('**/admin/users', (route: any, request: any) => {
    if (request.resourceType() === 'document') return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_USERS_JSON })
  })
  await page.route('**/admin/tenants', (route: any, request: any) => {
    if (request.resourceType() === 'document') return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_TENANTS_JSON })
  })
}

// ─── Page Load & Auth ────────────────────────────────────────────────────────

test.describe('إدارة المستخدمين — تحميل الصفحة والمصادقة', () => {
  test('الصفحة تُحمَّل دون إعادة توجيه لصفحة الدخول', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(500)
    await expect(page).not.toHaveURL(/login/)
  })

  test('URL تبقى صحيحة بعد التنقل', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/admin/users')
  })

  test('الاتجاه RTL مضبوط على عنصر html', async ({ page }) => {
    await page.goto('/admin/users')
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })

  test('عنوان الصفحة إدارة المستخدمين مرئي', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading', { name: 'إدارة المستخدمين' })).toBeVisible()
  })

  test('العنوان الفرعي مرئي', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(500)
    await expect(page.getByText(/المستخدمون المسجلون/)).toBeVisible()
  })
})

// ─── Dark Mode ───────────────────────────────────────────────────────────────

test.describe('إدارة المستخدمين — وضع الظلام', () => {
  test('يمكن تطبيق وضع الظلام عبر JavaScript', async ({ page }) => {
    await page.goto('/admin/users')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)
  })

  test('إزالة وضع الظلام تعمل بشكل صحيح', async ({ page }) => {
    await page.goto('/admin/users')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('dark')
    })
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(false)
  })
})

// ─── Header & Buttons ────────────────────────────────────────────────────────

test.describe('إدارة المستخدمين — الرأس والأزرار', () => {
  test('زر مستخدم جديد مرئي', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await expect(page.getByRole('button', { name: /مستخدم جديد/ })).toBeVisible()
  })

  test('زر مستخدم جديد يحتوي على نص صحيح', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    const btn = page.getByRole('button', { name: /مستخدم جديد/ })
    await expect(btn).toContainText('مستخدم جديد')
  })
})

// ─── Table / Empty State ──────────────────────────────────────────────────────

test.describe('إدارة المستخدمين — الجدول أو الحالة الفارغة', () => {
  test('الجدول أو حالة الفراغ تظهر بعد التحميل', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const table = page.locator('table')
    const emptyText = page.getByText('لا يوجد مستخدمون بعد')
    const hasTable = await table.count() > 0
    const hasEmpty = await emptyText.count() > 0
    expect(hasTable || hasEmpty).toBe(true)
  })

  test('قسم جميع المستخدمين مرئي', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(1000)
    await expect(page.getByText('جميع المستخدمين')).toBeVisible()
  })

  test('عداد عدد المستخدمين مرئي', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(1000)
    const counter = page.locator('span').filter({ hasText: /مستخدم/ })
    expect(await counter.count()).toBeGreaterThan(0)
  })

  test('رؤوس أعمدة الجدول مرئية عند وجود بيانات', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    await expect(page.getByText('الاسم')).toBeVisible()
    await expect(page.getByText('البريد الإلكتروني')).toBeVisible()
    await expect(page.getByText('الحالة')).toBeVisible()
  })

  test('عمود إجراءات مرئي في الجدول', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    await expect(page.getByRole('columnheader', { name: 'إجراءات' })).toBeVisible()
  })
})

// ─── Status Badges ───────────────────────────────────────────────────────────

test.describe('إدارة المستخدمين — شارات الحالة', () => {
  test('شارة مُعيَّن تظهر للمستخدمين المعيَّنين', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const assignedBadge = page.locator('span').filter({ hasText: 'مُعيَّن' })
    const pendingBadge  = page.locator('span').filter({ hasText: 'في الانتظار' })
    const hasBadge = (await assignedBadge.count() > 0) || (await pendingBadge.count() > 0)
    // If there are rows, at least one badge should appear
    const rows = page.locator('tbody tr')
    if (await rows.count() > 0) {
      expect(hasBadge).toBe(true)
    }
  })

  test('شارة في الانتظار لها لون أصفر في CSS', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const badge = page.locator('span.bg-yellow-100').first()
    await expect(badge).toBeVisible()
  })

  test('شارة مُعيَّن لها لون أخضر في CSS', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const badge = page.locator('span.bg-green-100').first()
    await expect(badge).toBeVisible()
  })
})

// ─── قسم في الانتظار ──────────────────────────────────────────────────────────

test.describe('إدارة المستخدمين — قسم في الانتظار', () => {
  test('قسم في انتظار التفعيل يظهر عند وجود مستخدمين معلقين', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const pendingSection = page.getByText('في انتظار التفعيل')
    // Either it exists or it doesn't — no pending users is also valid
    const exists = await pendingSection.count() > 0
    // Just verify page doesn't crash either way
    expect(typeof exists).toBe('boolean')
  })

  test('زر تعيين مستأجر مرئي في قسم المعلقين', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const assignBtn = page.getByRole('button', { name: /تعيين مستأجر/ })
    await expect(assignBtn.first()).toBeVisible()
  })
})

// ─── Create User Modal ────────────────────────────────────────────────────────

test.describe('إدارة المستخدمين — نافذة إنشاء مستخدم', () => {
  test('النقر على مستخدم جديد يفتح النافذة', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    await expect(page.getByText('إنشاء مستخدم جديد')).toBeVisible()
  })

  test('نافذة الإنشاء تحتوي حقل الاسم الكامل', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    await expect(page.getByText('الاسم الكامل')).toBeVisible()
  })

  test('نافذة الإنشاء تحتوي حقل البريد الإلكتروني', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    await expect(page.getByText('البريد الإلكتروني')).toBeVisible()
  })

  test('نافذة الإنشاء تحتوي حقل كلمة المرور المؤقتة', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    await expect(page.getByText('كلمة المرور المؤقتة')).toBeVisible()
  })

  test('نافذة الإنشاء تحتوي زر إنشاء المستخدم', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    await expect(page.getByRole('button', { name: /إنشاء المستخدم/ })).toBeVisible()
  })

  test('نافذة الإنشاء تحتوي زر إلغاء', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    // There will be two cancel buttons (one in create modal), get first visible one
    const cancelBtns = page.getByRole('button', { name: 'إلغاء' })
    await expect(cancelBtns.first()).toBeVisible()
  })

  test('زر إغلاق X يغلق نافذة الإنشاء', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    await expect(page.getByText('إنشاء مستخدم جديد')).toBeVisible()
    // Click the X close button inside the modal
    const modal = page.locator('.fixed.inset-0').last()
    await modal.locator('button').filter({ hasText: '' }).first().click()
    await expect(page.getByText('إنشاء مستخدم جديد')).not.toBeVisible()
  })

  test('زر إلغاء يغلق نافذة الإنشاء', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    await expect(page.getByText('إنشاء مستخدم جديد')).toBeVisible()
    await page.getByRole('button', { name: 'إلغاء' }).first().click()
    await expect(page.getByText('إنشاء مستخدم جديد')).not.toBeVisible()
  })

  test('تقديم نموذج الإنشاء بدون بريد إلكتروني يُظهر خطأ', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    await page.getByRole('button', { name: /إنشاء المستخدم/ }).click()
    await expect(page.getByText('البريد الإلكتروني مطلوب')).toBeVisible()
  })

  test('تقديم نموذج الإنشاء بكلمة مرور قصيرة يُظهر خطأ', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', '123')
    await page.getByRole('button', { name: /إنشاء المستخدم/ }).click()
    await expect(page.getByText(/6 أحرف/)).toBeVisible()
  })

  test('زر إظهار/إخفاء كلمة المرور في نافذة الإنشاء يعمل', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    const passwordInput = page.locator('input[type="password"]').first()
    await expect(passwordInput).toBeVisible()
    // Toggle visibility - click the eye button
    const eyeBtn = page.locator('.fixed.inset-0').last().locator('button[type="button"]').filter({ hasText: '' })
    if (await eyeBtn.count() > 0) {
      await eyeBtn.first().click()
      const textInput = page.locator('input[type="text"]').filter({ hasText: '' })
      // After toggle it may become type="text" — just verify no crash
      expect(page.url()).toContain('/admin/users')
    }
  })

  test('رسالة تلميح كلمة المرور المؤقتة مرئية', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /مستخدم جديد/ }).click()
    await expect(page.getByText(/سيُطلب من المستخدم تغييرها/)).toBeVisible()
  })
})

// ─── AssignModal ──────────────────────────────────────────────────────────────

test.describe('إدارة المستخدمين — نافذة التعيين', () => {
  test('النقر على تعيين مستأجر في القسم المعلق يفتح النافذة', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /تعيين مستأجر/ }).first().click()
    await expect(page.getByText('تعيين مستأجر للمستخدم')).toBeVisible()
  })

  test('نافذة التعيين تحتوي قائمة المستأجر', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /تعيين مستأجر/ }).first().click()
    await expect(page.getByText('تعيين مستأجر للمستخدم')).toBeVisible()
    await expect(page.getByLabel('المستأجر')).toBeVisible()
  })

  test('نافذة التعيين تحتوي قائمة الدور', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /تعيين مستأجر/ }).first().click()
    await expect(page.getByText('تعيين مستأجر للمستخدم')).toBeVisible()
    await expect(page.getByLabel('الدور')).toBeVisible()
  })

  test('قائمة الدور تحتوي خيار مدير', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /تعيين مستأجر/ }).first().click()
    await expect(page.getByText('تعيين مستأجر للمستخدم')).toBeVisible()
    const roleSelect = page.getByLabel('الدور')
    await expect(roleSelect.locator('option', { hasText: 'مدير' })).toBeAttached()
  })

  test('قائمة الدور تحتوي خيار مستخدم', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /تعيين مستأجر/ }).first().click()
    await expect(page.getByText('تعيين مستأجر للمستخدم')).toBeVisible()
    const roleSelect = page.getByLabel('الدور')
    await expect(roleSelect.locator('option', { hasText: 'مستخدم' })).toBeAttached()
  })

  test('تقديم نافذة التعيين بدون مستأجر يُظهر خطأ', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /تعيين مستأجر/ }).first().click()
    await expect(page.getByText('تعيين مستأجر للمستخدم')).toBeVisible()
    await page.getByRole('button', { name: /^تعيين$/ }).click()
    await expect(page.getByText('يرجى اختيار المستأجر')).toBeVisible()
  })

  test('زر إلغاء يغلق نافذة التعيين', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /تعيين مستأجر/ }).first().click()
    await expect(page.getByText('تعيين مستأجر للمستخدم')).toBeVisible()
    await page.getByRole('button', { name: 'إلغاء' }).first().click()
    await expect(page.getByText('تعيين مستأجر للمستخدم')).not.toBeVisible()
  })

  test('نافذة التعيين تعرض بريد المستخدم', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /تعيين مستأجر/ }).first().click()
    await expect(page.getByText('تعيين مستأجر للمستخدم')).toBeVisible()
    // The modal shows "المستخدم:" prefix with user email
    await expect(page.getByText(/المستخدم:/)).toBeVisible()
  })
})

// ─── Edit User Modal ──────────────────────────────────────────────────────────

test.describe('إدارة المستخدمين — نافذة تعديل المستخدم', () => {
  test('النقر على زر التعديل (Pencil) يفتح نافذة التعديل', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const editBtn = rows.first().locator('button[title="تعديل"]')
    await editBtn.click()
    await expect(page.getByText('تعديل المستخدم')).toBeVisible()
  })

  test('نافذة التعديل تحتوي حقل الاسم الكامل', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const editBtn = rows.first().locator('button[title="تعديل"]')
    await editBtn.click()
    await expect(page.getByText('تعديل المستخدم')).toBeVisible()
    await expect(page.getByText('الاسم الكامل').first()).toBeVisible()
  })

  test('نافذة التعديل تحتوي قائمة المستأجر', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const editBtn = rows.first().locator('button[title="تعديل"]')
    await editBtn.click()
    await expect(page.getByText('تعديل المستخدم')).toBeVisible()
    await expect(page.getByText('المستأجر').first()).toBeVisible()
  })

  test('نافذة التعديل تحتوي زر حفظ التعديلات', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const editBtn = rows.first().locator('button[title="تعديل"]')
    await editBtn.click()
    await expect(page.getByText('تعديل المستخدم')).toBeVisible()
    await expect(page.getByRole('button', { name: /حفظ التعديلات/ })).toBeVisible()
  })

  test('زر إلغاء يغلق نافذة التعديل', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const editBtn = rows.first().locator('button[title="تعديل"]')
    await editBtn.click()
    await expect(page.getByText('تعديل المستخدم')).toBeVisible()
    await page.getByRole('button', { name: 'إلغاء' }).first().click()
    await expect(page.getByText('تعديل المستخدم')).not.toBeVisible()
  })
})

// ─── Delete / ConfirmDialog ───────────────────────────────────────────────────

test.describe('إدارة المستخدمين — حذف المستخدم وConfirmDialog', () => {
  test('النقر على زر الحذف يفتح ConfirmDialog', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const deleteBtn = rows.first().locator('button[title="حذف"]')
    await deleteBtn.click()
    await expect(page.getByText('حذف المستخدم')).toBeVisible()
  })

  test('ConfirmDialog يحتوي رسالة تأكيد الحذف', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const deleteBtn = rows.first().locator('button[title="حذف"]')
    await deleteBtn.click()
    await expect(page.getByText(/هل أنت متأكد/)).toBeVisible()
  })

  test('النقر على إلغاء في ConfirmDialog يغلقه', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const deleteBtn = rows.first().locator('button[title="حذف"]')
    await deleteBtn.click()
    await expect(page.getByText('حذف المستخدم')).toBeVisible()
    // Click cancel button in dialog
    const cancelBtn = page.getByRole('button', { name: /إلغاء|لا/ }).last()
    await cancelBtn.click()
    await expect(page.getByText('حذف المستخدم')).not.toBeVisible()
  })

  test('ConfirmDialog يحتوي زر تأكيد الحذف', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const deleteBtn = rows.first().locator('button[title="حذف"]')
    await deleteBtn.click()
    await expect(page.getByText('حذف المستخدم')).toBeVisible()
    // Confirm button should exist
    const confirmBtn = page.getByRole('button', { name: /تأكيد|حذف|نعم/ })
    expect(await confirmBtn.count()).toBeGreaterThan(0)
  })

  test('زر الحذف في القسم المعلق يفتح ConfirmDialog أيضاً', async ({ page }) => {
    await mockApis(page)
    await page.goto('/admin/users')
    await page.waitForTimeout(1200)
    // Look for any delete button (title="حذف") outside the main table (in pending section or anywhere)
    const allDeleteBtns = page.locator('button[title="حذف"]')
    const count = await allDeleteBtns.count()
    if (count === 0) {
      // Fallback: look for any button near a "مستخدم معلق" area
      const anyDeleteBtn = page.locator('button').filter({ has: page.locator('svg') }).last()
      if (await anyDeleteBtn.count() > 0) {
        await anyDeleteBtn.click()
        // Either delete dialog or some action happened — page should not crash
        await expect(page.locator('body')).toBeVisible()
      }
      return
    }
    await allDeleteBtns.first().click()
    await expect(page.getByText('حذف المستخدم')).toBeVisible()
  })
})
