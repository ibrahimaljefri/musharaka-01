/**
 * Edit branch page tests — BE-01 through BE-06
 * Uses auth storage state.
 * All tests require a live Supabase connection and an existing branch.
 */
import { test, expect } from '@playwright/test'

// Helper: navigate to the edit page of the first branch
async function goToFirstBranchEdit(page: any) {
  await page.goto('/branches')
  await page.waitForSelector('table tbody tr', { timeout: 10_000 })
  await page.locator('table tbody tr').first().getByRole('link', { name: /تعديل/ }).click()
  await expect(page).toHaveURL(/\/branches\/.+\/edit/, { timeout: 10_000 })
}

test.describe('Edit branch page', () => {
  // BE-01: Form is pre-populated with existing values
  test('BE-01: form fields are pre-populated with existing branch data', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await goToFirstBranchEdit(page)
    const codeInput = page.getByLabel(/كود الفرع|الكود/)
    await expect(codeInput).not.toHaveValue('')
    const nameInput = page.getByLabel('اسم الفرع')
    await expect(nameInput).not.toHaveValue('')
  })

  // BE-02: Updating name persists after save
  test('BE-02: updating the branch name saves and shows success message', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await goToFirstBranchEdit(page)
    await page.getByLabel('اسم الفرع').fill('اسم محدّث ' + Date.now())
    await page.getByRole('button', { name: 'حفظ التعديلات' }).click()
    await expect(page.getByText(/تم تحديث|تم الحفظ/)).toBeVisible()
  })

  // BE-03: Changing code to a duplicate shows uniqueness error
  test('BE-03: changing code to an existing code shows Arabic uniqueness error', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await goToFirstBranchEdit(page)
    // Attempt to change to a known existing code of a different branch
    await page.getByLabel(/كود الفرع|الكود/).fill('BR-001')
    await page.getByRole('button', { name: 'حفظ التعديلات' }).click()
    await expect(page.getByText(/مستخدم بالفعل|الكود موجود/)).toBeVisible()
  })

  // BE-04: Metadata (created_at / updated_at) timestamps are shown
  test('BE-04: created_at and updated_at timestamps are displayed', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await goToFirstBranchEdit(page)
    await expect(page.getByText(/تاريخ الإنشاء|أُنشئ في/)).toBeVisible()
    await expect(page.getByText(/آخر تحديث/)).toBeVisible()
  })

  // BE-05: Cancel returns to /branches without saving changes
  test('BE-05: Cancel button returns to /branches without saving', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await goToFirstBranchEdit(page)
    await page.getByLabel('اسم الفرع').fill('تغيير مؤقت لن يُحفظ')
    await page.getByRole('link', { name: 'إلغاء' }).click()
    await expect(page).toHaveURL('/branches')
  })

  // BE-06: Heading "تعديل الفرع" is shown
  test('BE-06: "تعديل الفرع" heading is visible on the edit page', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    await goToFirstBranchEdit(page)
    await expect(page.getByRole('heading', { name: /تعديل الفرع/ })).toBeVisible()
  })
})
