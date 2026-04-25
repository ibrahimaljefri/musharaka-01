/**
 * Sale Create page tests — S-01 through S-11
 *
 * Uses auth storage state.
 * Tests that POST to the API are marked // Requires live backend.
 */
import { test, expect } from '@playwright/test'

test.describe('Sale Create page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales/create')
  })

  // -----------------------------------------------------------------------
  // S-01: Page heading "إضافة مبيعات" is visible
  // -----------------------------------------------------------------------
  test('S-01: page heading "إضافة مبيعات" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'إضافة مبيعات' })).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // S-02: Three mode radio buttons visible — يومي / شهري / فترة مخصصة
  // -----------------------------------------------------------------------
  test('S-02: three input-mode radio buttons are visible', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'يومي' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'شهري' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'فترة مخصصة' })).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // S-03: Default mode is "daily" — date input visible, month/year hidden
  // -----------------------------------------------------------------------
  test('S-03: default mode is يومي — date input visible', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'يومي' })).toBeChecked()
    await expect(page.locator('input[type="date"]')).toBeVisible()
    // Month/year selects should not be visible in daily mode
    await expect(page.getByText('الشهر')).not.toBeVisible()
  })

  // -----------------------------------------------------------------------
  // S-04: Switching to "شهري" shows month and year selects
  // -----------------------------------------------------------------------
  test('S-04: switching to شهري mode shows month and year selects', async ({ page }) => {
    await page.getByRole('radio', { name: 'شهري' }).click()
    await expect(page.getByText('الشهر')).toBeVisible()
    await expect(page.getByText('السنة')).toBeVisible()
    // Date picker should be hidden
    await expect(page.locator('input[type="date"]')).not.toBeVisible()
  })

  // -----------------------------------------------------------------------
  // S-05: Switching to "فترة مخصصة" shows two date pickers (from/to)
  // -----------------------------------------------------------------------
  test('S-05: switching to فترة مخصصة shows "من التاريخ" and "إلى التاريخ"', async ({ page }) => {
    await page.getByRole('radio', { name: 'فترة مخصصة' }).click()
    await expect(page.getByText('من التاريخ')).toBeVisible()
    await expect(page.getByText('إلى التاريخ')).toBeVisible()
    const datePickers = page.locator('input[type="date"]')
    await expect(datePickers).toHaveCount(2)
  })

  // -----------------------------------------------------------------------
  // S-06: Missing branch → Arabic validation error
  // -----------------------------------------------------------------------
  test('S-06: submitting without selecting a branch shows Arabic error', async ({ page }) => {
    // Leave branch select empty, fill amount
    await page.fill('input[type="number"]', '1500')
    await page.getByRole('button', { name: 'حفظ المبيعات' }).click()

    await expect(page.getByText('يرجى اختيار الفرع')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // S-07: Missing amount → Arabic validation error
  // -----------------------------------------------------------------------
  test('S-07: submitting without amount shows Arabic validation error', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection (to populate branch select)')
    // Assumes at least one branch is available for selection
    const branchSelect = page.getByTestId('branch-select')
    const options = await branchSelect.locator('option').count()
    if (options <= 1) return

    await branchSelect.selectOption({ index: 1 })
    // Leave amount empty
    await page.getByRole('button', { name: 'حفظ المبيعات' }).click()

    await expect(page.getByText('يرجى إدخال مبلغ صحيح أكبر من صفر')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // S-08: Amount of 0 → Arabic validation error
  // -----------------------------------------------------------------------
  test('S-08: amount of zero shows Arabic validation error', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection (to populate branch select)')
    const branchSelect = page.getByTestId('branch-select')
    const options = await branchSelect.locator('option').count()
    if (options <= 1) return

    await branchSelect.selectOption({ index: 1 })
    await page.fill('input[type="number"]', '0')
    await page.getByRole('button', { name: 'حفظ المبيعات' }).click()

    await expect(page.getByText('يرجى إدخال مبلغ صحيح أكبر من صفر')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // S-09: Successful daily sale submission
  // Requires live backend
  // -----------------------------------------------------------------------
  test('S-09: successful daily sale submission shows success message', async ({ page }) => {
    test.skip(true, '// Requires live backend')
    const branchSelect = page.getByTestId('branch-select')
    const options = await branchSelect.locator('option').count()
    if (options <= 1) return

    await branchSelect.selectOption({ index: 1 })
    await page.fill('input[type="number"]', '2500.50')
    await page.fill('input[dir="ltr"][placeholder="INV-001"]', 'INV-TEST-001')
    await page.getByRole('button', { name: 'حفظ المبيعات' }).click()

    // Success AlertBanner should appear
    await expect(page.locator('[role="status"], [data-testid="alert-success"]').first()).toBeVisible({ timeout: 10_000 })
    // Should redirect to dashboard after 1.5s
    await expect(page).toHaveURL('/dashboard', { timeout: 5_000 })
  })

  // -----------------------------------------------------------------------
  // S-10: Successful monthly sale submission
  // Requires live backend
  // -----------------------------------------------------------------------
  test('S-10: successful monthly sale submission', async ({ page }) => {
    test.skip(true, '// Requires live backend')
    await page.getByRole('radio', { name: 'شهري' }).click()

    const branchSelect = page.getByTestId('branch-select')
    const options = await branchSelect.locator('option').count()
    if (options <= 1) return

    await branchSelect.selectOption({ index: 1 })
    // Select first month option
    const monthSelect = page.getByTestId('month-select')
    await monthSelect.selectOption({ index: 0 })
    await page.fill('input[type="number"]', '50000')
    await page.getByRole('button', { name: 'حفظ المبيعات' }).click()

    await expect(page.locator('[role="status"], [data-testid="alert-success"]').first()).toBeVisible({ timeout: 10_000 })
  })

  // -----------------------------------------------------------------------
  // S-11: Cancel button navigates back to /dashboard
  // -----------------------------------------------------------------------
  test('S-11: cancel button navigates back to /dashboard', async ({ page }) => {
    await page.getByRole('button', { name: 'إلغاء' }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  // -----------------------------------------------------------------------
  // S-12: Tips panel is visible
  // -----------------------------------------------------------------------
  test('S-12: tips panel is visible with Arabic content', async ({ page }) => {
    await expect(page.getByText('يومي: أدخل مبيعات يوم واحد محدد.')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // S-13: Invoice number field is optional (label shows "اختياري")
  // -----------------------------------------------------------------------
  test('S-13: invoice number field is labelled as optional', async ({ page }) => {
    await expect(page.getByText('رقم الفاتورة (اختياري)')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // S-14: Notes field is optional
  // -----------------------------------------------------------------------
  test('S-14: notes field is labelled as optional', async ({ page }) => {
    await expect(page.getByText('ملاحظات (اختياري)')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // S-15: RTL layout on create page
  // -----------------------------------------------------------------------
  test('S-15: html has dir="rtl" on create page', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  // -----------------------------------------------------------------------
  // S-16: Range mode — submitting without dates shows error
  // Requires live backend
  // -----------------------------------------------------------------------
  test('S-16: range mode submission without dates shows error', async ({ page }) => {
    test.skip(true, '// Requires live backend')
    await page.getByRole('radio', { name: 'فترة مخصصة' }).click()

    const branchSelect = page.getByTestId('branch-select')
    const options = await branchSelect.locator('option').count()
    if (options <= 1) return

    await branchSelect.selectOption({ index: 1 })
    await page.fill('input[type="number"]', '3000')
    // Leave dates empty
    await page.getByRole('button', { name: 'حفظ المبيعات' }).click()

    // API or validation should return an error
    await expect(page.locator('[role="alert"], [data-testid="alert-error"]').first()).toBeVisible({ timeout: 10_000 })
  })
})
