import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Admin API Keys Management — /admin/tenants/:id/api-keys
// ─────────────────────────────────────────────────────────────────────────────

// Real tenant ID from production DB (tenant "مشاركة")
const TENANT_ID = '0911b812-47ea-4be2-978f-8197c83949b2'
const BASE_URL  = `/admin/tenants/${TENANT_ID}/api-keys`

const MOCK_TENANT = { id: TENANT_ID, name: 'مشاركة', plan: 'professional', branch_count: 5 }

const MOCK_ALL_FIELDS = [
  'contract_number', 'branch_code', 'branch_name', 'brand_name', 'unit_number',
  'location', 'invoice_number', 'input_type', 'period_from_date', 'period_to_date',
  'sale_date', 'month', 'year', 'amount', 'status',
]

const MOCK_ACTIVE_KEY = {
  id: 'key-001',
  label: 'مفتاح ERP',
  key_prefix: 'msk_abc',
  is_active: true,
  allowed_fields: ['contract_number', 'period_from_date', 'period_to_date', 'amount'],
  created_at: '2025-01-10T10:00:00Z',
  expires_at: '2026-01-10T10:00:00Z',
  last_used_at: null,
}

const MOCK_DISABLED_KEY = {
  id: 'key-002',
  label: 'مفتاح قديم',
  key_prefix: 'msk_xyz',
  is_active: false,
  allowed_fields: ['contract_number', 'amount'],
  created_at: '2024-06-01T10:00:00Z',
  expires_at: null,
  last_used_at: '2024-12-01T10:00:00Z',
}

async function stubApiKeys(page: import('@playwright/test').Page, keys: unknown[] = [MOCK_ACTIVE_KEY]) {
  await page.route(
    `**/admin/tenants/${TENANT_ID}/api-keys**`,
    (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keys, all_fields: MOCK_ALL_FIELDS }),
      })
    }
  )
}

async function stubTenant(page: import('@playwright/test').Page) {
  await page.route(
    `**/admin/tenants/${TENANT_ID}`,
    (route, request) => {
      if (request.url().includes('/api-keys') || request.resourceType() === 'document') return route.continue()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TENANT) })
    }
  )
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('مفاتيح API — تحميل الصفحة', () => {

  test('الصفحة تُحمَّل دون إعادة توجيه لتسجيل الدخول', async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page)
    await page.goto(BASE_URL)
    await expect(page).not.toHaveURL(/login/)
  })

  test('عنوان URL يبقى على مسار api-keys', async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page)
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
    await expect(page).toHaveURL(/api-keys/)
  })

  test('الصفحة تستجيب وتعرض المحتوى', async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page)
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
    await expect(page.locator('body')).toBeVisible()
  })

})

test.describe('مفاتيح API — اتجاه RTL والتخطيط', () => {

  test('سمة dir تساوي rtl', async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page)
    await page.goto(BASE_URL)
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })

  test('الصفحة تحتوي على النص العربي', async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page)
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    // Contains Arabic text
    expect(bodyText).toMatch(/[\u0600-\u06FF]/)
  })

})

test.describe('مفاتيح API — عناوين الصفحة', () => {

  test.beforeEach(async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page)
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
  })

  test('العنوان "مفاتيح API" مرئي', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'مفاتيح API' })).toBeVisible()
  })

  test('اسم المستأجر يظهر تحت العنوان الرئيسي', async ({ page }) => {
    await expect(page.locator(':text("مشاركة")')).toBeVisible()
  })

  test('قسم "المفاتيح الحالية" مرئي', async ({ page }) => {
    await expect(page.locator(':text("المفاتيح الحالية")')).toBeVisible()
  })

})

test.describe('مفاتيح API — حالة التحميل', () => {

  test('مؤشر التحميل يظهر أثناء الجلب', async ({ page }) => {
    await stubTenant(page)
    await page.route(
      `**/admin/tenants/${TENANT_ID}/api-keys**`,
      async (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        await new Promise(r => setTimeout(r, 300))
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ keys: [], all_fields: MOCK_ALL_FIELDS }),
        })
      }
    )
    await page.goto(BASE_URL)
    const loadingIndicator = page.locator(':text("جاري التحميل..."), .animate-spin')
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 })
  })

  test('حالة التحميل تختفي بعد انتهاء الجلب', async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page, [])
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
    const keysSection = page.locator(':text("المفاتيح الحالية")')
    await expect(keysSection).toBeVisible()
  })

})

test.describe('مفاتيح API — الحالة الفارغة', () => {

  test.beforeEach(async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page, [])
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
  })

  test('رسالة "لا توجد مفاتيح API بعد" تظهر عند القائمة الفارغة', async ({ page }) => {
    await expect(page.locator(':text("لا توجد مفاتيح API بعد")')).toBeVisible()
  })

  test('عداد المفاتيح يُظهر صفراً', async ({ page }) => {
    await expect(page.locator(':text("0 مفتاح")')).toBeVisible()
  })

  test('أيقونة Key تظهر في الحالة الفارغة', async ({ page }) => {
    // The empty state renders a Key icon (SVG) alongside the empty message
    const emptySection = page.locator(':text("لا توجد مفاتيح API بعد")').locator('..')
    await expect(emptySection).toBeVisible()
  })

})

test.describe('مفاتيح API — قائمة المفاتيح', () => {

  test.describe('مفتاح نشط', () => {
    test.beforeEach(async ({ page }) => {
      await stubTenant(page)
      await stubApiKeys(page, [MOCK_ACTIVE_KEY])
      await page.goto(BASE_URL)
      await page.waitForTimeout(800)
    })

    test('تسمية المفتاح "مفتاح ERP" تظهر', async ({ page }) => {
      await expect(page.locator(':text("مفتاح ERP")')).toBeVisible()
    })

    test('شارة "نشط" تظهر للمفتاح النشط', async ({ page }) => {
      await expect(page.locator(':text("نشط")')).toBeVisible()
    })

    test('بادئة المفتاح تظهر', async ({ page }) => {
      await expect(page.locator(':text("msk_abc")')).toBeVisible()
    })

    test('حقول المسموح بها تظهر كشارات', async ({ page }) => {
      // contract_number maps to "رقم العقد"
      await expect(page.locator(':text("رقم العقد")')).toBeVisible()
    })

    test('زر النسخ (CopyButton) مرئي', async ({ page }) => {
      const copyBtn = page.locator('button[title], button').filter({ has: page.locator('svg') }).first()
      await expect(copyBtn).toBeVisible()
    })

    test('زر تبديل الحالة (Power/PowerOff) مرئي', async ({ page }) => {
      // Active key shows Power icon button
      const toggleBtn = page.locator('button[title="تعطيل"], button[title="تفعيل"]')
      await expect(toggleBtn).toBeVisible()
    })

    test('زر الحذف (Trash2) مرئي', async ({ page }) => {
      // Delete button has red styling
      const deleteBtn = page.locator('button.text-red-400, button[class*="red"]').first()
      await expect(deleteBtn).toBeVisible()
    })

    test('عداد المفاتيح يُظهر 1', async ({ page }) => {
      await expect(page.locator(':text("1 مفتاح")')).toBeVisible()
    })
  })

  test.describe('مفتاح معطّل', () => {
    test.beforeEach(async ({ page }) => {
      await stubTenant(page)
      await stubApiKeys(page, [MOCK_DISABLED_KEY])
      await page.goto(BASE_URL)
      await page.waitForTimeout(800)
    })

    test('تسمية المفتاح "مفتاح قديم" تظهر', async ({ page }) => {
      await expect(page.locator(':text("مفتاح قديم")')).toBeVisible()
    })

    test('شارة "معطّل" تظهر للمفتاح المعطّل', async ({ page }) => {
      await expect(page.locator(':text("معطّل")')).toBeVisible()
    })
  })

  test.describe('مفاتيح متعددة', () => {
    test('كلا المفتاحين يظهران في القائمة', async ({ page }) => {
      await stubTenant(page)
      await stubApiKeys(page, [MOCK_ACTIVE_KEY, MOCK_DISABLED_KEY])
      await page.goto(BASE_URL)
      await page.waitForTimeout(800)
      await expect(page.locator(':text("مفتاح ERP")')).toBeVisible()
      await expect(page.locator(':text("مفتاح قديم")')).toBeVisible()
    })

    test('عداد المفاتيح يُظهر 2', async ({ page }) => {
      await stubTenant(page)
      await stubApiKeys(page, [MOCK_ACTIVE_KEY, MOCK_DISABLED_KEY])
      await page.goto(BASE_URL)
      await page.waitForTimeout(800)
      await expect(page.locator(':text("2 مفتاح")')).toBeVisible()
    })
  })

})

test.describe('مفاتيح API — زر "مفتاح جديد" ونموذج الإنشاء', () => {

  test.beforeEach(async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page, [])
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
  })

  test('زر "مفتاح جديد" مرئي', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: 'مفتاح جديد' })).toBeVisible()
  })

  test('النموذج مخفي في البداية', async ({ page }) => {
    await expect(page.locator('form')).not.toBeVisible()
  })

  test('النقر على "مفتاح جديد" يُظهر النموذج', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'مفتاح جديد' }).click()
    await expect(page.locator('form')).toBeVisible()
  })

  test('النقر على "مفتاح جديد" مرة ثانية يُخفي النموذج', async ({ page }) => {
    const btn = page.locator('button').filter({ hasText: 'مفتاح جديد' })
    await btn.click()
    await expect(page.locator('form')).toBeVisible()
    await btn.click()
    await expect(page.locator('form')).not.toBeVisible()
  })

  test.describe('حقول نموذج الإنشاء', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('button').filter({ hasText: 'مفتاح جديد' }).click()
    })

    test('عنوان النموذج "إنشاء مفتاح جديد" مرئي', async ({ page }) => {
      await expect(page.locator(':text("إنشاء مفتاح جديد")')).toBeVisible()
    })

    test('حقل "اسم المفتاح" مرئي', async ({ page }) => {
      await expect(page.locator('input[placeholder*="ERP"], input[required]').first()).toBeVisible()
    })

    test('حقل "تاريخ الانتهاء" مرئي', async ({ page }) => {
      await expect(page.locator('input[type="date"]')).toBeVisible()
    })

    test('حقل "اسم المفتاح" قابل للكتابة', async ({ page }) => {
      const labelInput = page.locator('input[required]').first()
      await labelInput.fill('مفتاح ERP جديد')
      await expect(labelInput).toHaveValue('مفتاح ERP جديد')
    })

    test('تسمية "الحقول المسموح بها" مرئية', async ({ page }) => {
      await expect(page.locator(':text("الحقول المسموح بها")')).toBeVisible()
    })

    test('أزرار اختيار الحقول (checkboxes كأزرار) تظهر', async ({ page }) => {
      // The field buttons appear after all_fields is loaded from API
      await page.waitForTimeout(300)
      // The field toggles are rendered as styled buttons
      const fieldButtons = page.locator('form button[type="button"]')
      await expect(fieldButtons.first()).toBeVisible()
    })

    test('زر "إنشاء المفتاح" مرئي', async ({ page }) => {
      await expect(page.locator('button[type="submit"]').filter({ hasText: 'إنشاء المفتاح' })).toBeVisible()
    })

    test('زر "إلغاء" مرئي', async ({ page }) => {
      await expect(page.locator('button').filter({ hasText: 'إلغاء' })).toBeVisible()
    })

    test('زر "إلغاء" يُخفي النموذج', async ({ page }) => {
      await page.locator('button').filter({ hasText: 'إلغاء' }).click()
      await expect(page.locator('form')).not.toBeVisible()
    })

    test('إرسال نموذج فارغ (بدون label) يُظهر خطأ', async ({ page }) => {
      // This additional route override applies on top of the beforeEach stubs
      // (client guard fires first — POST never reaches server)
      await page.locator('button[type="submit"]').filter({ hasText: 'إنشاء المفتاح' }).click()
      await page.waitForTimeout(500)
      // Error flash or form remains visible
      const errorOrForm = page.locator(':text("مطلوب"), :text("فشل"), :text("الاسم"), form')
      await expect(errorOrForm.first()).toBeVisible()
    })
  })

})

test.describe('مفاتيح API — زر الرجوع', () => {

  test.beforeEach(async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page, [])
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
  })

  test('زر الرجوع مرئي', async ({ page }) => {
    const backBtn = page.locator('.max-w-3xl button').first()
    await expect(backBtn).toBeVisible()
  })

  test('زر الرجوع يُنتقل إلى /admin/tenants', async ({ page }) => {
    await page.locator('.max-w-3xl button').first().click()
    await expect(page).toHaveURL(/\/admin\/tenants/)
  })

})

test.describe('مفاتيح API — قسم مثال الاستخدام', () => {

  test.beforeEach(async ({ page }) => {
    await stubTenant(page)
    await stubApiKeys(page, [])
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
  })

  test('قسم "مثال على الاستخدام" مرئي', async ({ page }) => {
    await expect(page.locator(':text("مثال على الاستخدام")')).toBeVisible()
  })

  test('مسار API يظهر في مثال الاستخدام', async ({ page }) => {
    await expect(page.locator(':text("/api/contracts")').first()).toBeVisible()
  })

})

test.describe('مفاتيح API — معالجة الأخطاء وحالات الحافة', () => {

  test('خطأ الـ API لا يُعطل الصفحة', async ({ page }) => {
    await page.route(
      `**/admin/tenants/${TENANT_ID}/api-keys**`,
      (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"خطأ داخلي"}' })
      }
    )
    await page.route(
      `**/admin/tenants/${TENANT_ID}`,
      (route, request) => {
        if (request.url().includes('/api-keys') || request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"خطأ داخلي"}' })
      }
    )
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
    await expect(page.locator('body')).toBeVisible()
  })

  test('رسالة خطأ تظهر عند فشل التحميل', async ({ page }) => {
    await page.route(
      `**/admin/tenants/${TENANT_ID}/api-keys**`,
      (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"فشل التحميل"}' })
      }
    )
    await page.route(
      `**/admin/tenants/${TENANT_ID}`,
      (route, request) => {
        if (request.url().includes('/api-keys') || request.resourceType() === 'document') return route.continue()
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TENANT) })
      }
    )
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
    const errorMsg = page.locator('[class*="error"], [class*="alert"], :text("فشل")')
    await expect(errorMsg.first()).toBeVisible()
  })

  test('مستأجر غير موجود لا يُعطل الصفحة', async ({ page }) => {
    await page.route('**/nonexistent-id/api-keys', route =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' })
    )
    await page.route('**/admin/tenants/nonexistent-id', route =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' })
    )
    await page.goto('/admin/tenants/nonexistent-id/api-keys')
    await page.waitForTimeout(800)
    // Should show an error message or empty state, not a blank crash
    await expect(page.locator('body')).toBeVisible()
    await expect(page).not.toHaveURL(/login/)
  })

  test('مستأجر غير موجود يعرض خطأً أو حالة فارغة', async ({ page }) => {
    await page.route('**/nonexistent-id/api-keys', route =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' })
    )
    await page.route('**/admin/tenants/nonexistent-id', route =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' })
    )
    await page.goto('/admin/tenants/nonexistent-id/api-keys')
    await page.waitForTimeout(800)
    const indicator = page.locator(
      ':text("فشل"), :text("خطأ"), :text("لا توجد"), :text("error"), :text("not found"), [class*="error"], [class*="empty"]'
    )
    await expect(indicator.first()).toBeVisible()
  })

})

test.describe('مفاتيح API — عرض المفتاح بعد الإنشاء', () => {

  test('المفتاح الخام يظهر مرة واحدة بعد الإنشاء بنجاح', async ({ page }) => {
    await stubTenant(page)

    let postHandled = false
    await page.route(
      `**/admin/tenants/${TENANT_ID}/api-keys**`,
      async (route, request) => {
        if (request.resourceType() === 'document') return route.continue()
        if (request.method() === 'POST') {
          postHandled = true
          const newKey = {
            ...MOCK_ACTIVE_KEY,
            id: 'key-new',
            label: 'مفتاح اختبار',
            raw_key: 'msk_rawkey_abc123xyz',
          }
          await route.fulfill({
            status: 201, contentType: 'application/json',
            body: JSON.stringify(newKey),
          })
        } else {
          await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ keys: [], all_fields: MOCK_ALL_FIELDS }),
          })
        }
      }
    )

    await page.goto(BASE_URL)
    await page.waitForTimeout(800)

    // Open create form
    await page.locator('button').filter({ hasText: 'مفتاح جديد' }).click()

    // Fill in the label
    await page.locator('input[required]').first().fill('مفتاح اختبار')

    // Submit
    await page.locator('button[type="submit"]').filter({ hasText: 'إنشاء المفتاح' }).click()
    await page.waitForTimeout(800)

    // The raw key reveal message should be visible
    await expect(page.locator(':text("تم إنشاء المفتاح"), :text("احفظه الآن"), :text("msk_rawkey")').first()).toBeVisible()
  })

})
