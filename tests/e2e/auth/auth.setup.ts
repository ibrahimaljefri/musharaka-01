/**
 * Auth setup — runs once before all authenticated test suites.
 * Saves storage state (cookies + localStorage) to fixtures/.auth/user.json
 * so every downstream project can reuse the session.
 *
 * Run requirements: real Supabase connection must be available.
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '../../fixtures/.auth/user.json')

// Ignore any pre-existing storage state for this setup run
setup.use({ storageState: { cookies: [], origins: [] } })

setup('authenticate', async ({ page }) => {
  await page.goto('/login')

  // Page must load with RTL direction
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  await page.fill('input[type="email"]', process.env.TEST_EMAIL ?? 'test@musharaka.com')
  await page.fill('input[type="password"]', process.env.TEST_PASSWORD ?? 'Test1234!')
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard — confirms successful authentication
  await expect(page).toHaveURL('/dashboard', { timeout: 15_000 })

  // Persist the session for all downstream projects
  await page.context().storageState({ path: AUTH_FILE })
})
