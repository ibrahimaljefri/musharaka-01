/**
 * Dashboard page tests — D-01 through D-12
 *
 * Uses auth storage state (set by playwright.config.ts).
 * Tests that depend on real data are marked // Requires live Supabase connection.
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  // -----------------------------------------------------------------------
  // D-01: Page heading "لوحة التحكم" is visible
  // -----------------------------------------------------------------------
  test('D-01: dashboard heading "لوحة التحكم" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // D-02: Three KPI cards are rendered
  // -----------------------------------------------------------------------
  test('D-02: three KPI cards are visible on the dashboard', async ({ page }) => {
    // All three KPI titles must be present
    await expect(page.getByText('إجمالي المبيعات')).toBeVisible()
    await expect(page.getByText(/^مبيعات /)).toBeVisible() // "مبيعات يناير" etc.
    await expect(page.getByText('عدد السجلات')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // D-03: Branch filter dropdown is present and contains "جميع الفروع"
  // -----------------------------------------------------------------------
  test('D-03: branch filter dropdown has default "جميع الفروع" option', async ({ page }) => {
    const select = page.locator('select').first()
    await expect(select).toBeVisible()
    await expect(select).toHaveValue('')
    await expect(select.locator('option').first()).toHaveText('جميع الفروع')
  })

  // -----------------------------------------------------------------------
  // D-04: "آخر المبيعات" table section is present
  // -----------------------------------------------------------------------
  test('D-04: "آخر المبيعات" section heading is present', async ({ page }) => {
    await expect(page.getByText('آخر المبيعات')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // D-05: Table columns — all required column headers rendered
  // -----------------------------------------------------------------------
  test('D-05: sales table has all required column headers in Arabic', async ({ page }) => {
    // Wait for table or empty-state message to ensure page has loaded
    await page.waitForSelector('table, .font-arabic', { timeout: 10_000 })

    const headers = ['رقم الفاتورة', 'الفرع', 'النوع', 'التاريخ', 'المبلغ', 'الحالة', 'الإجراءات']
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible()
    }
  })

  // -----------------------------------------------------------------------
  // D-06: "إضافة مبيعات" button navigates to /sales/create
  // -----------------------------------------------------------------------
  test('D-06: "+ إضافة مبيعات" button navigates to /sales/create', async ({ page }) => {
    await page.getByRole('link', { name: /إضافة مبيعات/ }).click()
    await expect(page).toHaveURL('/sales/create')
  })

  // -----------------------------------------------------------------------
  // D-07: Branch filter changes KPIs (live data test)
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('D-07: selecting a branch filter updates the KPI cards', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    const select = page.locator('select').first()
    const initialTotal = await page.getByText('إجمالي المبيعات').locator('..').innerText()

    // Select the first non-empty branch option if any exist
    const options = await select.locator('option').all()
    if (options.length <= 1) return // No branches to select — skip

    await select.selectOption({ index: 1 })

    // Wait for the KPI cards to re-render (loading state then values)
    await page.waitForTimeout(500)
    // KPI cards are still present after filter change
    await expect(page.getByText('إجمالي المبيعات')).toBeVisible()
    await expect(page.getByText('عدد السجلات')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // D-08: Locked (sent) rows show "محمية" text and no delete button
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('D-08: locked rows with status=sent show "محمية" and no delete button', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    // Check if any sent rows are visible
    const sentBadge = page.locator('span').filter({ hasText: 'مرسلة' }).first()
    if (!(await sentBadge.isVisible())) return // No sent rows to check

    // The sibling actions cell should show "محمية" text
    const row = sentBadge.locator('../../..')
    await expect(row.getByText('محمية')).toBeVisible()
    // No trash icon button in that row
    await expect(row.locator('button')).toHaveCount(0)
  })

  // -----------------------------------------------------------------------
  // D-09: Pending rows have a delete (trash) button
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('D-09: pending rows show a delete button', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    const pendingBadge = page.locator('span').filter({ hasText: 'معلقة' }).first()
    if (!(await pendingBadge.isVisible())) return

    const row = pendingBadge.locator('../../..')
    await expect(row.locator('button')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // D-10: Delete flow — ConfirmDialog appears then confirms deletion
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('D-10: clicking delete opens ConfirmDialog with Arabic message', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    // Find and click a delete button
    const deleteBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
    if (!(await deleteBtn.isVisible())) return

    await deleteBtn.click()

    // ConfirmDialog should be visible
    await expect(page.getByText('حذف السجل')).toBeVisible()
    await expect(page.getByText('هل أنت متأكد من حذف هذا السجل؟')).toBeVisible()
    await expect(page.getByRole('button', { name: 'إلغاء' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'تأكيد' })).toBeVisible()

    // Cancel to avoid actually deleting data
    await page.getByRole('button', { name: 'إلغاء' }).click()
    await expect(page.getByText('حذف السجل')).not.toBeVisible()
  })

  // -----------------------------------------------------------------------
  // D-11: Sidebar is on the RIGHT side (RTL — right = start)
  // -----------------------------------------------------------------------
  test('D-11: sidebar is positioned on the right side of the page (RTL)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/dashboard')

    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()

    const sidebarBox = await sidebar.boundingBox()
    const viewportWidth = 1280
    expect(sidebarBox).not.toBeNull()
    if (sidebarBox) {
      // In RTL the sidebar is fixed to the right — its left edge should be
      // past the middle of the viewport
      expect(sidebarBox.x).toBeGreaterThan(viewportWidth / 2)
    }
  })

  // -----------------------------------------------------------------------
  // D-12: RTL — dir="rtl" confirmed on html element
  // -----------------------------------------------------------------------
  test('D-12: html element has dir="rtl" on dashboard', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  // -----------------------------------------------------------------------
  // D-13: Navigation links in sidebar are in Arabic
  // -----------------------------------------------------------------------
  test('D-13: sidebar nav links are all in Arabic', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/dashboard')

    const expectedLinks = [
      'لوحة التحكم',
      'إضافة مبيعات',
      'استيراد Excel',
      'التقارير',
      'الفروع',
      'إرسال الفواتير',
      'تقرير الإرسالات',
    ]

    for (const label of expectedLinks) {
      await expect(page.getByRole('link', { name: label })).toBeVisible()
    }
  })

  // -----------------------------------------------------------------------
  // D-14: Logout button is visible in sidebar
  // -----------------------------------------------------------------------
  test('D-14: "تسجيل الخروج" button is visible in the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/dashboard')
    await expect(page.getByRole('button', { name: 'تسجيل الخروج' })).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // D-15: "متصل بسينومي" status indicator is visible in header
  // -----------------------------------------------------------------------
  test('D-15: "متصل بسينومي" status indicator is visible in the topbar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/dashboard')
    await expect(page.getByText('متصل بسينومي')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // D-16: Mobile — hamburger menu button is visible at 375px
  // -----------------------------------------------------------------------
  test('D-16: hamburger menu button visible at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')

    // The menu button contains the Menu icon (lucide)
    const menuBtn = page.locator('header button').first()
    await expect(menuBtn).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // D-17: Pagination controls appear when totalRows > 25
  // Requires live Supabase connection
  // -----------------------------------------------------------------------
  test('D-17: pagination controls are present when data exceeds 25 rows', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection')
    // If totalRows > 25 the pagination section appears
    const paginationText = page.locator('.font-arabic').filter({ hasText: /\d+ \/ \d+/ })
    // Only assert if pagination is actually rendered
    const count = await paginationText.count()
    if (count > 0) {
      await expect(paginationText.first()).toBeVisible()
    }
  })
})
