/**
 * Auth setup — tenant user. Runs once before all `chromium`/`firefox`/etc. projects.
 * Performs a real login via POST /api/auth/login, seeds localStorage, then saves
 * storage state to fixtures/.auth/user.json.
 */
import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = path.join(__dirname, '../../fixtures/.auth/user.json')

setup.use({ storageState: { cookies: [], origins: [] } })

setup('tenant authenticate', async ({ page }) => {
  const email    = process.env.TEST_USER_EMAIL    || process.env.TEST_EMAIL    || 'ibrahimaljefri@yahoo.com'
  const password = process.env.TEST_USER_PASSWORD || process.env.TEST_PASSWORD || '123456'

  await page.goto('/login')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  await page.fill('input[type="email"]',    email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  // Wait for redirect away from /login (dashboard OR change-password)
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15_000 })

  // Persist session (localStorage access token + refresh cookie)
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
})
