/**
 * Admin auth setup — super-admin user. Runs once before the `admin` project.
 * Performs a real login via POST /api/auth/login, then saves storage state
 * to fixtures/.auth/admin.json.
 */
import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = path.join(__dirname, '../../fixtures/.auth/admin.json')

setup.use({ storageState: { cookies: [], origins: [] } })

setup('super-admin authenticate', async ({ page }) => {
  const email    = process.env.TEST_ADMIN_EMAIL    || process.env.SUPER_ADMIN_EMAIL    || 'admin@admin.com'
  const password = process.env.TEST_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || 'admin123'

  await page.goto('/login')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  await page.fill('input[type="email"]',    email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  // Super-admin should land on /admin/dashboard
  await page.waitForURL(/\/admin\/dashboard|\/dashboard|\/change-password/, { timeout: 15_000 })

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
})
