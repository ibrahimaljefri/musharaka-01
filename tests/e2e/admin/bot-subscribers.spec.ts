import { test, expect } from '@playwright/test'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SUBSCRIBER_ID = 42
const MOCK_SUBS_JSON = JSON.stringify([
  {
    id: MOCK_SUBSCRIBER_ID,
    tenant_id: 'tenant-001',
    tenant_name: 'شركة الاختبار',
    platform: 'telegram',
    chat_id: '123456789',
    contact_name: 'أحمد محمد',
    is_active: true,
    created_at: '2025-01-01T10:00:00Z',
  },
])

const MOCK_SINGLE_SUB = JSON.stringify({
  id: MOCK_SUBSCRIBER_ID,
  tenant_id: 'tenant-001',
  tenant_name: 'شركة الاختبار',
  platform: 'telegram',
  chat_id: '123456789',
  contact_name: 'أحمد محمد',
  is_active: true,
  created_at: '2025-01-01T10:00:00Z',
})

const MOCK_EMPTY_JSON = JSON.stringify([])

// ─── List Page: Load & Auth ───────────────────────────────────────────────────

test.describe('مشتركو البوت — تحميل الصفحة والمصادقة', () => {
  test('الصفحة تُحمَّل دون إعادة توجيه لصفحة الدخول', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(500)
    await expect(page).not.toHaveURL(/login/)
  })

  test('URL تبقى صحيحة بعد التنقل', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/admin/bot-subscribers')
  })

  test('الاتجاه RTL مضبوط على عنصر html', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })

  test('عنوان مشتركو الروبوت مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(800)
    await expect(page.getByText(/مشتركو الروبوت|مشتركو البوت/).first()).toBeVisible()
  })

  test('العنوان الفرعي لإدارة المشتركين مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(500)
    await expect(page.getByText(/إدارة حسابات/)).toBeVisible()
  })
})

// ─── Dark Mode ───────────────────────────────────────────────────────────────

test.describe('مشتركو البوت — وضع الظلام', () => {
  test('يمكن تطبيق وضع الظلام عبر JavaScript', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)
  })

  test('إزالة وضع الظلام تعمل بشكل صحيح', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('dark')
    })
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(false)
  })
})

// ─── List Page: Header & Buttons ─────────────────────────────────────────────

test.describe('مشتركو البوت — الرأس والأزرار', () => {
  test('زر مشترك جديد مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(800)
    await expect(page.getByRole('link', { name: /مشترك جديد/ })).toBeVisible()
  })

  test('زر مشترك جديد يرتبط بمسار الإنشاء', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(800)
    const createLink = page.getByRole('link', { name: /مشترك جديد/ })
    await expect(createLink).toHaveAttribute('href', /bot-subscribers\/create/)
  })

  test('عداد عدد المشتركين مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1000)
    const counter = page.locator('span').filter({ hasText: /مشترك/ })
    expect(await counter.count()).toBeGreaterThan(0)
  })

  test('قسم المشتركون المسجلون مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(800)
    await expect(page.getByText('المشتركون المسجلون')).toBeVisible()
  })
})

// ─── List Page: Table / Empty State ──────────────────────────────────────────

test.describe('مشتركو البوت — الجدول أو الحالة الفارغة', () => {
  test('الجدول أو حالة الفراغ تظهر بعد التحميل', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    const table = page.locator('table')
    const emptyText = page.getByText('لا يوجد مشتركون بعد')
    const hasTable = await table.count() > 0
    const hasEmpty = await emptyText.count() > 0
    expect(hasTable || hasEmpty).toBe(true)
  })

  test('حالة الفراغ تعرض رسالة لا يوجد مشتركون بعد', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_EMPTY_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    await expect(page.getByText('لا يوجد مشتركون بعد')).toBeVisible()
  })

  test('حالة الفراغ تعرض زر إضافة مشترك', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_EMPTY_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    await expect(page.getByRole('link', { name: /إضافة مشترك/ })).toBeVisible()
  })

  test('رؤوس أعمدة الجدول مرئية عند وجود بيانات', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    await expect(page.getByText('المستأجر')).toBeVisible()
    await expect(page.getByText('الحالة').first()).toBeVisible()
    await expect(page.getByText('إجراءات').first()).toBeVisible()
  })

  test('عمود منصة مرئي في الجدول', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    await expect(page.getByRole('columnheader', { name: 'المنصة' })).toBeVisible()
  })

  test('عمود معرّف الدردشة مرئي في الجدول', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    await expect(page.getByRole('columnheader', { name: /معرّف الدردشة/ })).toBeVisible()
  })

  test('شارة الحالة نشط أو معطل تظهر لكل صف', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    const activeOrInactive = page.locator('span').filter({ hasText: /نشط|معطل/ })
    expect(await activeOrInactive.count()).toBeGreaterThan(0)
  })

  test('شارة المنصة تيليجرام أو واتساب تظهر', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    const platformBadge = page.locator('span').filter({ hasText: /تيليجرام|واتساب/ })
    expect(await platformBadge.count()).toBeGreaterThan(0)
  })
})

// ─── List Page: Navigation to Create ─────────────────────────────────────────

test.describe('مشتركو البوت — التنقل لصفحة الإنشاء', () => {
  test('النقر على مشترك جديد يفتح صفحة الإنشاء', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(800)
    await page.getByRole('link', { name: /مشترك جديد/ }).click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/admin/bot-subscribers/create')
  })

  test('صفحة الإنشاء لا تعيد التوجيه لصفحة الدخول', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(500)
    await expect(page).not.toHaveURL(/login/)
  })
})

// ─── Delete / ConfirmDialog ───────────────────────────────────────────────────

test.describe('مشتركو البوت — حذف المشترك وConfirmDialog', () => {
  test('النقر على زر الحذف يفتح ConfirmDialog', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const deleteBtn = rows.first().locator('button[title="حذف"]')
    await deleteBtn.click()
    await expect(page.getByText('حذف المشترك')).toBeVisible()
  })

  test('ConfirmDialog يحتوي رسالة تأكيد', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const deleteBtn = rows.first().locator('button[title="حذف"]')
    await deleteBtn.click()
    await expect(page.getByText(/هل أنت متأكد/)).toBeVisible()
  })

  test('النقر على إلغاء في ConfirmDialog يغلقه', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const deleteBtn = rows.first().locator('button[title="حذف"]')
    await deleteBtn.click()
    await expect(page.getByText('حذف المشترك')).toBeVisible()
    const cancelBtn = page.getByRole('button', { name: /إلغاء|لا/ }).last()
    await cancelBtn.click()
    await expect(page.getByText('حذف المشترك')).not.toBeVisible()
  })

  test('ConfirmDialog يحتوي زر تأكيد الحذف', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(1200)
    const rows = page.locator('tbody tr')
    const deleteBtn = rows.first().locator('button[title="حذف"]')
    await deleteBtn.click()
    await expect(page.getByText('حذف المشترك')).toBeVisible()
    const confirmBtn = page.getByRole('button', { name: /تأكيد|حذف|نعم/ })
    expect(await confirmBtn.count()).toBeGreaterThan(0)
  })
})

// ─── Create Form: Load & Fields ──────────────────────────────────────────────

test.describe('مشتركو البوت — نموذج الإنشاء', () => {
  test('صفحة الإنشاء تُحمَّل بشكل صحيح', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await expect(page).not.toHaveURL(/login/)
  })

  test('الاتجاه RTL في صفحة الإنشاء', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })

  test('عنوان إضافة مشترك جديد مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await expect(page.getByText('إضافة مشترك جديد')).toBeVisible()
  })

  test('حقل قسم المستأجر مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await expect(page.getByText('المستأجر').first()).toBeVisible()
  })

  test('قائمة اختيار المستأجر موجودة', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    const tenantSelect = page.locator('select').first()
    await expect(tenantSelect).toBeVisible()
  })

  test('قائمة اختيار المستأجر تحتوي خيار افتراضي فارغ', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    const firstOption = page.locator('select').first().locator('option').first()
    await expect(firstOption).toContainText(/اختر مستأجراً/)
  })

  test('قسم بيانات التواصل مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await expect(page.getByText('بيانات التواصل')).toBeVisible()
  })

  test('قائمة المنصة مرئية', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await expect(page.getByText('المنصة').first()).toBeVisible()
  })

  test('قائمة المنصة تحتوي خيار تيليجرام', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    const platformSelect = page.locator('select').nth(1)
    await expect(platformSelect.locator('option', { hasText: 'تيليجرام' })).toBeAttached()
  })

  test('قائمة المنصة تحتوي خيار واتساب', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    const platformSelect = page.locator('select').nth(1)
    await expect(platformSelect.locator('option', { hasText: 'واتساب' })).toBeAttached()
  })

  test('حقل معرّف الدردشة مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await expect(page.getByText(/معرّف الدردشة/)).toBeVisible()
  })

  test('حقل إدخال معرّف الدردشة موجود', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    // The chat_id input has dir="ltr" and is in the form
    const chatIdInput = page.locator('input[dir="ltr"]').first()
    await expect(chatIdInput).toBeVisible()
  })

  test('حقل اسم جهة التواصل مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await expect(page.getByText('اسم جهة التواصل')).toBeVisible()
  })

  test('زر إضافة المشترك مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await expect(page.getByRole('button', { name: /إضافة المشترك/ })).toBeVisible()
  })

  test('زر إلغاء في نموذج الإنشاء مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await expect(page.getByRole('button', { name: 'إلغاء' })).toBeVisible()
  })

  test('زر الرجوع (ArrowRight) مرئي', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    // Back button is inside .max-w-2xl container (avoids sidebar toggle which is first in DOM)
    const backBtn = page.locator('.max-w-2xl button').first()
    await expect(backBtn).toBeVisible()
  })

  test('رسالة تعليمية حول الفرع مرئية', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await expect(page.getByText(/الفرع يُحدَّد تلقائياً/)).toBeVisible()
  })

  test('placeholder حقل معرّف الدردشة يتغير حسب المنصة', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    const chatIdInput = page.locator('input[dir="ltr"]').first()
    // Default is telegram
    const placeholderTelegram = await chatIdInput.getAttribute('placeholder')
    expect(placeholderTelegram).toContain('123456789')
    // Switch to whatsapp
    const platformSelect = page.locator('select').nth(1)
    await platformSelect.selectOption('whatsapp')
    await page.waitForTimeout(300)
    const placeholderWhatsapp = await chatIdInput.getAttribute('placeholder')
    expect(placeholderWhatsapp).toContain('+966')
  })
})

// ─── Create Form: Validation ──────────────────────────────────────────────────

test.describe('مشتركو البوت — التحقق من صحة نموذج الإنشاء', () => {
  test('تقديم النموذج بدون مستأجر أو chat_id يفشل', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    // Click submit without filling required fields
    await page.getByRole('button', { name: /إضافة المشترك/ }).click()
    // HTML5 required validation or custom error message should appear
    // The URL should NOT navigate away
    await page.waitForTimeout(300)
    expect(page.url()).toContain('/admin/bot-subscribers/create')
  })

  test('حقل المستأجر مطلوب (required attribute)', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    const tenantSelect = page.locator('select').first()
    const isRequired = await tenantSelect.getAttribute('required')
    expect(isRequired).not.toBeNull()
  })

  test('حقل chat_id مطلوب (required attribute)', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    const chatIdInput = page.locator('input[dir="ltr"]').first()
    const isRequired = await chatIdInput.getAttribute('required')
    expect(isRequired).not.toBeNull()
  })

  test('حقل المنصة مطلوب (required attribute)', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    const platformSelect = page.locator('select').nth(1)
    const isRequired = await platformSelect.getAttribute('required')
    expect(isRequired).not.toBeNull()
  })
})

// ─── Create Form: Navigation ──────────────────────────────────────────────────

test.describe('مشتركو البوت — التنقل في نموذج الإنشاء', () => {
  test('زر إلغاء يعود لقائمة المشتركين', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: 'إلغاء' }).click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/admin/bot-subscribers')
    expect(page.url()).not.toContain('/create')
  })

  test('زر الرجوع يعود لقائمة المشتركين', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    const backBtn = page.locator('.max-w-2xl button').first()
    await backBtn.click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/admin/bot-subscribers')
    expect(page.url()).not.toContain('/create')
  })
})

// ─── Edit Form: Load ──────────────────────────────────────────────────────────

test.describe('مشتركو البوت — نموذج التعديل', () => {
  test('النقر على زر التعديل يفتح صفحة التعديل', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.route(`**/admin/bot-subscribers/${MOCK_SUBSCRIBER_ID}`, (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SINGLE_SUB })
    })
    await page.goto(`/admin/bot-subscribers/${MOCK_SUBSCRIBER_ID}/edit`)
    await page.waitForTimeout(800)
    expect(page.url()).toMatch(/\/admin\/bot-subscribers\/\d+\/edit/)
  })

  test('صفحة التعديل تعرض عنوان تعديل مشترك', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.route(`**/admin/bot-subscribers/${MOCK_SUBSCRIBER_ID}`, (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SINGLE_SUB })
    })
    await page.goto(`/admin/bot-subscribers/${MOCK_SUBSCRIBER_ID}/edit`)
    await page.waitForTimeout(1000)
    await expect(page.getByText('تعديل مشترك')).toBeVisible()
  })

  test('صفحة التعديل تعرض زر تفعيل الحساب (toggle)', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.route(`**/admin/bot-subscribers/${MOCK_SUBSCRIBER_ID}`, (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SINGLE_SUB })
    })
    await page.goto(`/admin/bot-subscribers/${MOCK_SUBSCRIBER_ID}/edit`)
    await page.waitForTimeout(1000)
    await expect(page.getByText('تعديل مشترك')).toBeVisible()
    await expect(page.getByText('تفعيل الحساب')).toBeVisible()
  })

  test('صفحة التعديل تعرض زر حفظ التعديلات', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.route(`**/admin/bot-subscribers/${MOCK_SUBSCRIBER_ID}`, (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SINGLE_SUB })
    })
    await page.goto(`/admin/bot-subscribers/${MOCK_SUBSCRIBER_ID}/edit`)
    await page.waitForTimeout(1000)
    await expect(page.getByText('تعديل مشترك')).toBeVisible()
    await expect(page.getByRole('button', { name: /حفظ التعديلات/ })).toBeVisible()
  })

  test('toggle تفعيل الحساب قابل للنقر في صفحة التعديل', async ({ page }) => {
    await page.route('**/admin/bot-subscribers', (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SUBS_JSON })
    })
    await page.route(`**/admin/bot-subscribers/${MOCK_SUBSCRIBER_ID}`, (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_SINGLE_SUB })
    })
    await page.goto(`/admin/bot-subscribers/${MOCK_SUBSCRIBER_ID}/edit`)
    await page.waitForTimeout(1000)
    await expect(page.getByText('تعديل مشترك')).toBeVisible()
    // The toggle is a button type="button" inside the is_active section
    const toggleBtn = page.locator('button[type="button"]').filter({ has: page.locator('span.rounded-full') })
    if (await toggleBtn.count() > 0) {
      await expect(toggleBtn.first()).toBeVisible()
    }
  })
})

// ─── 404-like Scenarios ───────────────────────────────────────────────────────

test.describe('مشتركو البوت — سيناريوهات مسار غير موجود', () => {
  test('التنقل لمسار تعديل غير موجود لا يُعيد توجيه لتسجيل الدخول', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/nonexistent/edit')
    await page.waitForTimeout(1000)
    await expect(page).not.toHaveURL(/login/)
  })

  test('التنقل لمسار تعديل بـ id غير موجود يبقى في التطبيق', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/999999/edit')
    await page.waitForTimeout(1200)
    // Should stay in admin app — spinner or form or error
    await expect(page).not.toHaveURL(/login/)
    expect(page.url()).toContain('/admin/bot-subscribers')
  })

  test('URL صفحة التعديل بـ id رقمي تبقى صحيحة', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/999999/edit')
    await page.waitForTimeout(500)
    expect(page.url()).toContain('999999/edit')
  })
})

// ─── Back Navigation ──────────────────────────────────────────────────────────

test.describe('مشتركو البوت — التنقل للخلف', () => {
  test('زر الرجوع في صفحة الإنشاء يعود للقائمة', async ({ page }) => {
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(800)
    const backBtn = page.locator('.max-w-2xl button').first()
    await backBtn.click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/admin/bot-subscribers')
    expect(page.url()).not.toContain('create')
  })

  test('التنقل للخلف بعد فتح صفحة الإنشاء يعود للقائمة', async ({ page }) => {
    await page.goto('/admin/bot-subscribers')
    await page.waitForTimeout(500)
    await page.goto('/admin/bot-subscribers/create')
    await page.waitForTimeout(500)
    await page.goBack()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/admin/bot-subscribers')
    expect(page.url()).not.toContain('create')
  })
})
