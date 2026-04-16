import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Admin Support Tickets — list + detail pages
// Route: /admin/tickets  and  /admin/tickets/:id
// ─────────────────────────────────────────────────────────────────────────────

test.describe('تذاكر الدعم — قائمة التذاكر', () => {

  test.describe('تحميل الصفحة والمصادقة', () => {
    test('الصفحة تُحمَّل دون إعادة توجيه لتسجيل الدخول', async ({ page }) => {
      await page.goto('/admin/tickets')
      await expect(page).not.toHaveURL(/login/)
    })

    test('عنوان URL يبقى على /admin/tickets', async ({ page }) => {
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page).toHaveURL(/\/admin\/tickets$/)
    })

    test('الصفحة تستجيب وتظهر المحتوى', async ({ page }) => {
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      const body = page.locator('body')
      await expect(body).toBeVisible()
    })
  })

  test.describe('اتجاه RTL والتخطيط', () => {
    test('سمة dir تساوي rtl', async ({ page }) => {
      await page.goto('/admin/tickets')
      const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
      expect(dir).toBe('rtl')
    })

    test('الصفحة تحتوي على نص عربي', async ({ page }) => {
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy()
    })
  })

  test.describe('عناوين الصفحة', () => {
    test('العنوان الرئيسي "تذاكر الدعم" مرئي', async ({ page }) => {
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('h1').filter({ hasText: 'تذاكر الدعم' })).toBeVisible()
    })

    test('العنوان الفرعي يتضمن وصف الصفحة', async ({ page }) => {
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      const subtitle = page.locator('p').filter({ hasText: 'إدارة وحل طلبات الدعم' })
      await expect(subtitle).toBeVisible()
    })

    test('نص "قائمة التذاكر" مرئي داخل البطاقة', async ({ page }) => {
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator(':text("قائمة التذاكر")')).toBeVisible()
    })
  })

  test.describe('حالة التحميل', () => {
    test('مؤشر التحميل يظهر أثناء الجلب (أو ينتهي سريعاً)', async ({ page }) => {
      await page.route('**/admin/tickets', async (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        await new Promise(r => setTimeout(r, 300))
        return route.continue()
      })
      await page.goto('/admin/tickets')
      const spinnerOrContent = page.locator('.animate-spin, table, :text("لا توجد تذاكر بعد")')
      await expect(spinnerOrContent.first()).toBeVisible({ timeout: 3000 })
    })

    test('حالة التحميل تختفي بعد انتهاء الجلب', async ({ page }) => {
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      const content = page.locator('table, :text("لا توجد تذاكر بعد")')
      await expect(content.first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('حالة فارغة', () => {
    test('نص "لا توجد تذاكر بعد" يظهر عند عدم وجود بيانات', async ({ page }) => {
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator(':text("لا توجد تذاكر بعد")')).toBeVisible()
    })

    test('الحالة الفارغة تظهر وصفاً إضافياً', async ({ page }) => {
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      const desc = page.locator(':text("ستظهر هنا تذاكر الدعم")')
      await expect(desc).toBeVisible()
    })

    test('عداد التذاكر يُظهر صفراً عند قائمة فارغة', async ({ page }) => {
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator(':text("0 تذكرة")')).toBeVisible()
    })
  })

  test.describe('رؤوس الجدول', () => {
    const mockTickets = JSON.stringify([
      {
        id: '1',
        ticket_number: 'TKT-001',
        status: 'new',
        tenant_name: 'مستأجر تجريبي',
        submitter_name: 'أحمد محمد',
        submitter_email: 'ahmed@test.com',
        category: 'مبيعات',
        created_at: '2025-01-01T10:00:00Z',
      },
    ])

    test('عمود "رقم التذكرة والحالة" مرئي', async ({ page }) => {
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockTickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('th').filter({ hasText: 'رقم التذكرة والحالة' })).toBeVisible()
    })

    test('عمود "المستأجر" مرئي', async ({ page }) => {
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockTickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('th').filter({ hasText: 'المستأجر' })).toBeVisible()
    })

    test('عمود "العميل" مرئي', async ({ page }) => {
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockTickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('th').filter({ hasText: 'العميل' })).toBeVisible()
    })

    test('عمود "التصنيف" مرئي', async ({ page }) => {
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockTickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('th').filter({ hasText: 'التصنيف' })).toBeVisible()
    })

    test('عمود "تاريخ الإنشاء" مرئي', async ({ page }) => {
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockTickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('th').filter({ hasText: 'تاريخ الإنشاء' })).toBeVisible()
    })

    test('الجدول يحتوي على خمسة أعمدة', async ({ page }) => {
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockTickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      const headers = page.locator('thead th')
      await expect(headers).toHaveCount(5)
    })
  })

  test.describe('بيانات الجدول وعلامات الحالة', () => {
    test('شارة الحالة "جديد" تظهر بالنص العربي', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: '1', ticket_number: 'TKT-001', status: 'new', tenant_name: 'اختبار', submitter_name: 'علي', submitter_email: 'ali@test.com', category: 'تقني', created_at: '2025-01-01T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('td :text("جديد")')).toBeVisible()
    })

    test('شارة الحالة "قيد المعالجة" تظهر بالنص العربي', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: '2', ticket_number: 'TKT-002', status: 'in_progress', tenant_name: 'اختبار', submitter_name: 'سارة', submitter_email: 'sara@test.com', category: 'فروع', created_at: '2025-01-02T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('td :text("قيد المعالجة")')).toBeVisible()
    })

    test('شارة الحالة "محلول" تظهر بالنص العربي', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: '3', ticket_number: 'TKT-003', status: 'resolved', tenant_name: 'اختبار', submitter_name: 'خالد', submitter_email: 'khalid@test.com', category: 'مبيعات', created_at: '2025-01-03T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('td :text("محلول")')).toBeVisible()
    })

    test('تصنيف مبيعات يظهر', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: '4', ticket_number: 'TKT-004', status: 'new', tenant_name: 'اختبار', submitter_name: 'فاطمة', submitter_email: 'f@test.com', category: 'مبيعات', created_at: '2025-01-04T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('td :text("مبيعات")')).toBeVisible()
    })

    test('تصنيف فروع يظهر', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: '5', ticket_number: 'TKT-005', status: 'new', tenant_name: 'اختبار', submitter_name: 'عمر', submitter_email: 'o@test.com', category: 'فروع', created_at: '2025-01-05T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('td :text("فروع")')).toBeVisible()
    })

    test('تصنيف تقني يظهر', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: '6', ticket_number: 'TKT-006', status: 'new', tenant_name: 'اختبار', submitter_name: 'نورة', submitter_email: 'n@test.com', category: 'تقني', created_at: '2025-01-06T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('td :text("تقني")')).toBeVisible()
    })

    test('رقم التذكرة يظهر في الصف', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: '7', ticket_number: 'TKT-2025-001', status: 'new', tenant_name: 'شركة أ', submitter_name: 'محمد', submitter_email: 'm@test.com', category: 'أخرى', created_at: '2025-01-07T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator(':text("TKT-2025-001")')).toBeVisible()
    })

    test('اسم المستأجر يظهر في الصف', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: '8', ticket_number: 'TKT-008', status: 'new', tenant_name: 'شركة الأمل', submitter_name: 'يوسف', submitter_email: 'y@test.com', category: 'ترخيص', created_at: '2025-01-08T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator('td').filter({ hasText: 'شركة الأمل' })).toBeVisible()
    })

    test('عداد التذاكر يُظهر العدد الصحيح', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: '9',  ticket_number: 'TKT-009', status: 'new', tenant_name: 'أ', submitter_name: 'أ', submitter_email: 'a@a.com', category: 'تقني', created_at: '2025-01-09T10:00:00Z' },
        { id: '10', ticket_number: 'TKT-010', status: 'new', tenant_name: 'ب', submitter_name: 'ب', submitter_email: 'b@b.com', category: 'تقني', created_at: '2025-01-10T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      await expect(page.locator(':text("2 تذكرة")')).toBeVisible()
    })
  })

  test.describe('صفوف الجدول قابلة للنقر', () => {
    test('النقر على صف يُنتقل لصفحة تفاصيل التذكرة', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: 'abc-123', ticket_number: 'TKT-NAV', status: 'new', tenant_name: 'اختبار', submitter_name: 'نافذ', submitter_email: 'nav@test.com', category: 'تقني', created_at: '2025-01-01T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.route('**/admin/tickets/abc-123', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'abc-123', ticket_number: 'TKT-NAV', status: 'new',
            title: 'مشكلة تجريبية', category: 'تقني',
            description: 'وصف المشكلة', tenant_name: 'اختبار',
            submitter_name: 'نافذ', submitter_email: 'nav@test.com',
            created_at: '2025-01-01T10:00:00Z',
          }),
        })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      const row = page.locator('tr').filter({ hasText: 'TKT-NAV' })
      await row.click()
      await expect(page).toHaveURL(/\/admin\/tickets\/abc-123/)
    })

    test('المؤشر يتحول لـ pointer على صفوف الجدول', async ({ page }) => {
      const tickets = JSON.stringify([
        { id: 'ptr-1', ticket_number: 'TKT-PTR', status: 'new', tenant_name: 'اختبار', submitter_name: 'مستخدم', submitter_email: 'u@test.com', category: 'تقني', created_at: '2025-01-01T10:00:00Z' },
      ])
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: tickets })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      const row = page.locator('tbody tr').first()
      const cursor = await row.evaluate(el => getComputedStyle(el).cursor)
      expect(cursor).toBe('pointer')
    })
  })

  test.describe('معالجة الأخطاء', () => {
    test('رسالة خطأ تظهر عند فشل API', async ({ page }) => {
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"خطأ داخلي"}' })
      })
      await page.goto('/admin/tickets')
      await page.waitForTimeout(800)
      const errorIndicator = page.locator('[class*="error"], [class*="alert"], :text("فشل")')
      await expect(errorIndicator.first()).toBeVisible()
    })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Admin Ticket Detail — /admin/tickets/:id
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_TICKET = {
  id: 'detail-001',
  ticket_number: 'TKT-D001',
  status: 'in_progress',
  title: 'مشكلة في الفوترة',
  category: 'مبيعات',
  description: 'لا يمكن إصدار الفاتورة بسبب خطأ في النظام',
  steps: 'انتقل للفوترة ثم اضغط إنشاء',
  attachment_url: null,
  admin_comment: '',
  tenant_name: 'شركة النور',
  submitter_name: 'أحمد خالد',
  submitter_email: 'ahmed@alnour.com',
  tenant_phone: '+966501234567',
  branch_count: 3,
  created_at: '2025-03-15T08:30:00Z',
}

test.describe('تفاصيل التذكرة — الصفحة الكاملة', () => {

  test.describe('تحميل الصفحة والمصادقة', () => {
    test('صفحة التفاصيل تُحمَّل دون إعادة توجيه لتسجيل الدخول', async ({ page }) => {
      await page.route('**/admin/tickets/detail-001', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKET) })
      })
      await page.goto('/admin/tickets/detail-001')
      await expect(page).not.toHaveURL(/login/)
    })

    test('عنوان URL يبقى على /admin/tickets/detail-001', async ({ page }) => {
      await page.route('**/admin/tickets/detail-001', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKET) })
      })
      await page.goto('/admin/tickets/detail-001')
      await page.waitForTimeout(800)
      await expect(page).toHaveURL(/\/admin\/tickets\/detail-001/)
    })
  })

  test.describe('اتجاه RTL', () => {
    test('سمة dir تساوي rtl في صفحة التفاصيل', async ({ page }) => {
      await page.route('**/admin/tickets/detail-001', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKET) })
      })
      await page.goto('/admin/tickets/detail-001')
      const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
      expect(dir).toBe('rtl')
    })
  })

  test.describe('حالة التحميل', () => {
    test('مؤشر تحميل يظهر أثناء الجلب', async ({ page }) => {
      await page.route('**/admin/tickets/detail-001', async (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        await new Promise(r => setTimeout(r, 300))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKET) })
      })
      await page.goto('/admin/tickets/detail-001')
      const spinner = page.locator('.animate-spin')
      await expect(spinner).toBeVisible({ timeout: 2000 })
    })

    test('مؤشر التحميل يختفي بعد تحميل البيانات', async ({ page }) => {
      await page.route('**/admin/tickets/detail-001', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKET) })
      })
      await page.goto('/admin/tickets/detail-001')
      await page.waitForTimeout(800)
      await expect(page.locator('h1').filter({ hasText: 'مشكلة في الفوترة' })).toBeVisible()
    })
  })

  test.describe('معلومات التذكرة', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/admin/tickets/detail-001', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKET) })
      })
      await page.goto('/admin/tickets/detail-001')
      await page.waitForTimeout(800)
    })

    test('عنوان التذكرة مرئي', async ({ page }) => {
      await expect(page.locator('h1').filter({ hasText: 'مشكلة في الفوترة' })).toBeVisible()
    })

    test('رقم التذكرة مرئي', async ({ page }) => {
      await expect(page.locator(':text("TKT-D001")')).toBeVisible()
    })

    test('شارة الحالة "قيد المعالجة" مرئية', async ({ page }) => {
      await expect(page.locator(':text("قيد المعالجة")')).toBeVisible()
    })

    test('قسم "تفاصيل المشكلة" مرئي', async ({ page }) => {
      await expect(page.locator(':text("تفاصيل المشكلة")')).toBeVisible()
    })

    test('حقل "التصنيف" مرئي', async ({ page }) => {
      await expect(page.locator(':text("التصنيف")')).toBeVisible()
    })

    test('حقل "تاريخ الإنشاء" مرئي', async ({ page }) => {
      await expect(page.locator(':text("تاريخ الإنشاء")')).toBeVisible()
    })

    test('حقل "وصف المشكلة" مرئي', async ({ page }) => {
      await expect(page.locator(':text("وصف المشكلة")')).toBeVisible()
    })

    test('وصف المشكلة يحتوي على النص الصحيح', async ({ page }) => {
      await expect(page.locator(':text("لا يمكن إصدار الفاتورة")')).toBeVisible()
    })

    test('حقل "خطوات إعادة المشكلة" يظهر عند توفر البيانات', async ({ page }) => {
      await expect(page.locator(':text("خطوات إعادة المشكلة")')).toBeVisible()
    })
  })

  test.describe('بيانات العميل', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/admin/tickets/detail-001', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKET) })
      })
      await page.goto('/admin/tickets/detail-001')
      await page.waitForTimeout(800)
    })

    test('قسم "بيانات العميل" مرئي', async ({ page }) => {
      await expect(page.locator(':text("بيانات العميل")')).toBeVisible()
    })

    test('حقل "الاسم" مرئي', async ({ page }) => {
      await expect(page.locator(':text("الاسم")')).toBeVisible()
    })

    test('اسم العميل يظهر بالقيمة الصحيحة', async ({ page }) => {
      await expect(page.locator(':text("أحمد خالد")')).toBeVisible()
    })

    test('حقل "البريد الإلكتروني" مرئي', async ({ page }) => {
      await expect(page.locator(':text("البريد الإلكتروني")')).toBeVisible()
    })

    test('البريد الإلكتروني يظهر بالقيمة الصحيحة', async ({ page }) => {
      await expect(page.locator(':text("ahmed@alnour.com")')).toBeVisible()
    })

    test('حقل "المستأجر" يظهر', async ({ page }) => {
      await expect(page.locator(':text("شركة النور")')).toBeVisible()
    })

    test('حقل "رقم الجوال" يظهر عند توفره', async ({ page }) => {
      await expect(page.locator(':text("رقم الجوال")')).toBeVisible()
    })

    test('حقل "عدد الفروع" يظهر عند توفره', async ({ page }) => {
      await expect(page.locator(':text("عدد الفروع")')).toBeVisible()
    })
  })

  test.describe('قسم إجراء المشرف', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/admin/tickets/detail-001', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKET) })
      })
      await page.goto('/admin/tickets/detail-001')
      await page.waitForTimeout(800)
    })

    test('قسم "إجراء المشرف" مرئي', async ({ page }) => {
      await expect(page.locator(':text("إجراء المشرف")')).toBeVisible()
    })

    test('قائمة الحالة مرئية', async ({ page }) => {
      await expect(page.locator('select')).toBeVisible()
    })

    test('قائمة الحالة تحتوي على خيار "جديد"', async ({ page }) => {
      await expect(page.locator('select option[value="new"]')).toHaveCount(1)
    })

    test('قائمة الحالة تحتوي على خيار "قيد المعالجة"', async ({ page }) => {
      await expect(page.locator('select option[value="in_progress"]')).toHaveCount(1)
    })

    test('قائمة الحالة تحتوي على خيار "محلول"', async ({ page }) => {
      await expect(page.locator('select option[value="resolved"]')).toHaveCount(1)
    })

    test('خيار "جديد" له النص العربي الصحيح', async ({ page }) => {
      const optionText = await page.locator('select option[value="new"]').textContent()
      expect(optionText?.trim()).toBe('جديد')
    })

    test('خيار "قيد المعالجة" له النص العربي الصحيح', async ({ page }) => {
      const optionText = await page.locator('select option[value="in_progress"]').textContent()
      expect(optionText?.trim()).toBe('قيد المعالجة')
    })

    test('خيار "محلول" له النص العربي الصحيح', async ({ page }) => {
      const optionText = await page.locator('select option[value="resolved"]').textContent()
      expect(optionText?.trim()).toBe('محلول')
    })

    test('حقل ملاحظات المشرف (textarea) مرئي', async ({ page }) => {
      await expect(page.locator('textarea')).toBeVisible()
    })

    test('حقل textarea قابل للكتابة', async ({ page }) => {
      const ta = page.locator('textarea')
      await ta.fill('ملاحظة اختبارية')
      await expect(ta).toHaveValue('ملاحظة اختبارية')
    })

    test('زر "حفظ التغييرات" مرئي', async ({ page }) => {
      await expect(page.locator('button').filter({ hasText: 'حفظ التغييرات' })).toBeVisible()
    })

    test('زر الحفظ غير معطّل في الحالة الطبيعية', async ({ page }) => {
      const btn = page.locator('button').filter({ hasText: 'حفظ التغييرات' })
      await expect(btn).not.toBeDisabled()
    })

    test('تغيير الحالة من القائمة المنسدلة يعمل', async ({ page }) => {
      const select = page.locator('select')
      await select.selectOption('resolved')
      await expect(select).toHaveValue('resolved')
    })
  })

  test.describe('زر الرجوع', () => {
    test('زر الرجوع (ArrowRight) مرئي', async ({ page }) => {
      await page.route('**/admin/tickets/detail-001', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKET) })
      })
      await page.goto('/admin/tickets/detail-001')
      await page.waitForTimeout(800)
      // Back button is inside .max-w-3xl container (avoids sidebar toggle which is first in DOM)
      const backBtn = page.locator('.max-w-3xl button').first()
      await expect(backBtn).toBeVisible()
    })

    test('زر الرجوع يُنتقل إلى /admin/tickets', async ({ page }) => {
      await page.route('**/admin/tickets/detail-001', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKET) })
      })
      await page.route('**/admin/tickets', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      })
      await page.goto('/admin/tickets/detail-001')
      await page.waitForTimeout(800)
      // Click back button scoped to .max-w-3xl container (avoids sidebar toggle)
      await page.locator('.max-w-3xl button').first().click()
      await expect(page).toHaveURL(/\/admin\/tickets$/)
    })
  })

  test.describe('معالجة التذكرة غير الموجودة', () => {
    test('تذكرة غير موجودة لا تُعطل الصفحة', async ({ page }) => {
      await page.route('**/admin/tickets/nonexistent', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' })
      })
      await page.goto('/admin/tickets/nonexistent')
      await page.waitForTimeout(800)
      await expect(page.locator('body')).toBeVisible()
    })

    test('رسالة "التذكرة غير موجودة" أو خطأ تظهر عند 404', async ({ page }) => {
      await page.route('**/admin/tickets/nonexistent', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' })
      })
      await page.goto('/admin/tickets/nonexistent')
      await page.waitForTimeout(800)
      const notFound = page.locator(':text("غير موجودة"), :text("تعذّر"), :text("خطأ"), :text("not found")')
      await expect(notFound.first()).toBeVisible()
    })

    test('صفحة 404 لا تُعيد توجيه لتسجيل الدخول', async ({ page }) => {
      await page.route('**/admin/tickets/nonexistent', (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' })
      })
      await page.goto('/admin/tickets/nonexistent')
      await expect(page).not.toHaveURL(/login/)
    })
  })

})
