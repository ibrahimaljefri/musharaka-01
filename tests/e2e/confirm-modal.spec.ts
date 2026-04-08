/**
 * Confirm Delete Modal tests — CD-01 through CD-05
 * Tests the reusable ConfirmDialog component via the Branches list page.
 * Uses auth storage state.
 */
import { test, expect } from '@playwright/test'

test.describe('Confirm delete modal', () => {
  // Navigate to branches page and trigger a delete to open the modal
  async function openConfirmDialog(page: any) {
    await page.goto('/branches')
    await page.waitForSelector('table tbody tr', { timeout: 10_000 })
    // Click the first delete (trash) button in the branches table
    await page.locator('table tbody tr').first().getByRole('button').last().click()
  }

  // CD-01: Clicking delete opens the confirm dialog with Arabic confirmation text
  test('CD-01: delete trigger opens ConfirmDialog with Arabic confirmation text', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection with at least one branch')
    await openConfirmDialog(page)
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/هل أنت متأكد/)).toBeVisible()
  })

  // CD-02: Cancel closes the modal without deleting
  test('CD-02: Cancel button closes modal and no deletion occurs', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection with at least one branch')
    await openConfirmDialog(page)
    await page.getByRole('button', { name: 'إلغاء' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    // Row count should be the same — branch still present
    const rowCount = await page.locator('table tbody tr').count()
    expect(rowCount).toBeGreaterThan(0)
  })

  // CD-03: Confirm button deletes and shows success flash
  test('CD-03: Confirm button deletes the branch and shows success message', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection with a branch that has no sales')
    await openConfirmDialog(page)
    await page.getByRole('button', { name: 'تأكيد' }).click()
    await expect(page.getByText(/تم حذف|حُذف/)).toBeVisible({ timeout: 5_000 })
  })

  // CD-04: Escape key closes the modal
  test('CD-04: pressing Escape dismisses the modal without any action', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection with at least one branch')
    await openConfirmDialog(page)
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  // CD-05: Backdrop click closes the modal
  test('CD-05: clicking outside the modal (backdrop) dismisses it', async ({ page }) => {
    test.skip(true, '// Requires live Supabase connection with at least one branch')
    await openConfirmDialog(page)
    await expect(page.getByRole('dialog')).toBeVisible()
    // Click the top-left corner (outside the dialog box which is centered)
    await page.mouse.click(10, 10)
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
