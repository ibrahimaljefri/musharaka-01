/**
 * Sale Import page tests — I-01 through I-10
 *
 * Uses auth storage state.
 * File upload tests use page.setInputFiles().
 * Tests that call the API are marked // Requires live backend.
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

// ---------------------------------------------------------------------------
// Helper: create a minimal temporary CSV file for upload tests
// ---------------------------------------------------------------------------
function createTempCsv(content: string): string {
  const tmpFile = path.join(os.tmpdir(), `musharaka-test-${Date.now()}.csv`)
  fs.writeFileSync(tmpFile, content, 'utf8')
  return tmpFile
}

// ---------------------------------------------------------------------------
// Helper: create a minimal temporary file with a given extension
// ---------------------------------------------------------------------------
function createTempFile(extension: string, content = 'dummy'): string {
  const tmpFile = path.join(os.tmpdir(), `musharaka-test-${Date.now()}.${extension}`)
  fs.writeFileSync(tmpFile, content)
  return tmpFile
}

test.describe('Sale Import page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales/import')
  })

  // -----------------------------------------------------------------------
  // I-01: Page heading "استيراد ملف Excel" is visible
  // -----------------------------------------------------------------------
  test('I-01: page heading "استيراد ملف Excel" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'استيراد ملف Excel' })).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // I-02: Branch select and file drop-zone are present
  // -----------------------------------------------------------------------
  test('I-02: branch select and file drop-zone are rendered', async ({ page }) => {
    await expect(page.getByText('الفرع')).toBeVisible()
    await expect(page.locator('select').first()).toBeVisible()

    // Drop-zone text
    await expect(page.getByText('انقر لاختيار ملف أو اسحب وأفلت')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // I-03: File accept hint shows the allowed extensions
  // -----------------------------------------------------------------------
  test('I-03: file drop-zone shows accepted extensions hint', async ({ page }) => {
    await expect(page.getByText(/xlsx, xls, csv/)).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // I-04: Selecting a file updates the drop-zone label to the file name
  // -----------------------------------------------------------------------
  test('I-04: selecting a CSV file updates the drop-zone to show the filename', async ({ page }) => {
    const csvPath = createTempCsv('input_type,amount,sale_date\ndaily,1000,2026-01-15\n')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)

    // Drop-zone should now show the file name
    const dropZone = page.locator('.border-dashed')
    await expect(dropZone).toContainText(path.basename(csvPath))

    // Clean up
    fs.unlinkSync(csvPath)
  })

  // -----------------------------------------------------------------------
  // I-05: Clicking "معاينة" without a file shows Arabic error
  // -----------------------------------------------------------------------
  test('I-05: clicking preview without a file shows Arabic error', async ({ page }) => {
    await page.getByRole('button', { name: /معاينة/ }).click()
    await expect(page.getByText('يرجى اختيار ملف أولاً')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // I-06: Clicking "استيراد" without a file shows Arabic error
  // -----------------------------------------------------------------------
  test('I-06: clicking import without a file shows Arabic error', async ({ page }) => {
    await page.getByRole('button', { name: /استيراد/ }).click()
    await expect(page.getByText('يرجى اختيار ملف')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // I-07: Clicking "استيراد" with file but no branch shows Arabic error
  // -----------------------------------------------------------------------
  test('I-07: clicking import with file but no branch shows Arabic error', async ({ page }) => {
    const csvPath = createTempCsv('input_type,amount,sale_date\ndaily,1000,2026-01-15\n')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)

    // Import button should now be partially enabled (file set but no branch)
    // The button remains disabled until both file AND branch are set
    // Directly invoke the handler by bypassing the disabled state check
    // by calling the click — but the component guards it before API call
    await page.getByRole('button', { name: /استيراد/ }).click({ force: true })
    await expect(page.getByText('يرجى اختيار الفرع')).toBeVisible()

    fs.unlinkSync(csvPath)
  })

  // -----------------------------------------------------------------------
  // I-08: Preview button opens modal with data table
  // Requires live backend
  // -----------------------------------------------------------------------
  test('I-08: valid CSV shows preview modal with data rows', async ({ page }) => {
    test.skip(true, '// Requires live backend')
    const csvPath = createTempCsv('input_type,amount,sale_date\ndaily,1000,2026-01-15\ndaily,2000,2026-01-16\n')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)

    await page.getByRole('button', { name: /معاينة/ }).click()

    // Preview modal should appear
    await expect(page.getByText(/معاينة البيانات/)).toBeVisible({ timeout: 10_000 })

    // Table headers from CSV columns
    await expect(page.locator('table th').first()).toBeVisible()

    // Close modal
    await page.locator('button').filter({ has: page.locator('svg') }).last().click()

    fs.unlinkSync(csvPath)
  })

  // -----------------------------------------------------------------------
  // I-09: Preview modal close button (X) closes the modal
  // Requires live backend
  // -----------------------------------------------------------------------
  test('I-09: preview modal close button dismisses the modal', async ({ page }) => {
    test.skip(true, '// Requires live backend')
    const csvPath = createTempCsv('input_type,amount,sale_date\ndaily,500,2026-03-10\n')
    await page.locator('input[type="file"]').setInputFiles(csvPath)
    await page.getByRole('button', { name: /معاينة/ }).click()

    await expect(page.getByText(/معاينة البيانات/)).toBeVisible({ timeout: 10_000 })

    // Click the X close button inside the modal header
    await page.locator('button svg').last().locator('..').click()
    await expect(page.getByText(/معاينة البيانات/)).not.toBeVisible()

    fs.unlinkSync(csvPath)
  })

  // -----------------------------------------------------------------------
  // I-10: Successful import shows Arabic success result panel
  // Requires live backend
  // -----------------------------------------------------------------------
  test('I-10: successful import shows Arabic success result', async ({ page }) => {
    test.skip(true, '// Requires live backend')
    const csvPath = createTempCsv('input_type,amount,sale_date\ndaily,750,2026-04-01\n')

    const branchSelect = page.locator('select').first()
    const options = await branchSelect.locator('option').count()
    if (options <= 1) {
      fs.unlinkSync(csvPath)
      return
    }
    await branchSelect.selectOption({ index: 1 })

    await page.locator('input[type="file"]').setInputFiles(csvPath)
    await page.getByRole('button', { name: /استيراد/ }).click()

    // Success panel with green background
    await expect(page.locator('.bg-green-50')).toBeVisible({ timeout: 15_000 })

    fs.unlinkSync(csvPath)
  })

  // -----------------------------------------------------------------------
  // I-11: Tips panel is visible with Arabic content
  // -----------------------------------------------------------------------
  test('I-11: tips panel is visible with required-columns hint', async ({ page }) => {
    await expect(page.getByText(/الأعمدة المطلوبة/)).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // I-12: Template examples section is shown
  // -----------------------------------------------------------------------
  test('I-12: template examples section is visible', async ({ page }) => {
    await expect(page.getByText('أمثلة على البيانات:')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // I-13: RTL layout on import page
  // -----------------------------------------------------------------------
  test('I-13: html has dir="rtl" on import page', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  // -----------------------------------------------------------------------
  // I-14: Preview and Import buttons are disabled when no file is selected
  // -----------------------------------------------------------------------
  test('I-14: preview and import buttons are disabled when no file is selected', async ({ page }) => {
    await expect(page.getByRole('button', { name: /معاينة/ })).toBeDisabled()
    await expect(page.getByRole('button', { name: /استيراد/ })).toBeDisabled()
  })
})
