/**
 * Create branch page tests — BC-01 through BC-08
 * Uses auth storage state.
 */
import { test, expect } from '@playwright/test'

test.describe('Create branch page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/branches/create')
  })

  // BC-01: Page heading visible
  test('BC-01: "إضافة فرع جديد" heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'إضافة فرع جديد' })).toBeVisible()
  })

  // BC-02: TipsPanel is visible on the right side
  test('BC-02: tips panel is visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.getByText(/نصائح|تلميحات/i)).toBeVisible()
  })

  // BC-03: Code field required — Arabic error if empty
  test('BC-03: submitting without code shows Arabic required error', async ({ page }) => {
    await page.getByLabel('اسم الفرع').fill('فرع تجريبي')
    await page.getByRole('button', { name: 'حفظ' }).click()
    await expect(page.getByText(/الكود مطلوب|كود الفرع مطلوب/)).toBeVisible()
  })

  // BC-04: Name field required — Arabic error if empty
  test('BC-04: submitting without name shows Arabic required error', async ({ page }) => {
    await page.getByLabel(/كود الفرع|الكود/).fill('BR-TEST')
    await page.getByRole('button', { name: 'حفظ' }).click()
    await expect(page.getByText(/اسم الفرع مطلوب|الاسم مطلوب/)).toBeVisible()
  })

  // BC-05: Optional fields can be skipped — branch created with code + name only
  // Requires live Supabase connection
  test('BC-05: branch created with only required fields (code + name)', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    const uniqueCode = `BR-${Date.now()}`
    await page.getByLabel(/كود الفرع|الكود/).fill(uniqueCode)
    await page.getByLabel('اسم الفرع').fill('فرع اختباري')
    await page.getByRole('button', { name: 'حفظ' }).click()
    await expect(page).toHaveURL('/branches')
  })

  // BC-06: Duplicate code shows Arabic uniqueness error
  // Requires live Supabase connection
  test('BC-06: duplicate branch code shows Arabic uniqueness error', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await page.getByLabel(/كود الفرع|الكود/).fill('BR-001') // Assumes this exists from seed
    await page.getByLabel('اسم الفرع').fill('فرع مكرر')
    await page.getByRole('button', { name: 'حفظ' }).click()
    await expect(page.getByText(/مستخدم بالفعل|الكود موجود/)).toBeVisible()
  })

  // BC-07: Cancel button navigates back to /branches without saving
  test('BC-07: Cancel button returns to /branches list without creating branch', async ({ page }) => {
    await page.getByRole('link', { name: 'إلغاء' }).click()
    await expect(page).toHaveURL('/branches')
  })

  // BC-08: Token field is of type password (masked input)
  test('BC-08: token field is a password-type input (not visible in plain text)', async ({ page }) => {
    const tokenInput = page.locator('input[type="password"]')
    await expect(tokenInput).toBeVisible()
  })

  // BC-09: RTL confirmed
  test('BC-09: html has dir="rtl"', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})
