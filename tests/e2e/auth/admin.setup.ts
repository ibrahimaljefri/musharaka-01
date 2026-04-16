import { test as setup } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

setup('admin auth setup', async ({ page }) => {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@urwah.com'
  const password = process.env.SUPER_ADMIN_PASSWORD || 'admin123'

  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  // Wait for redirect to admin dashboard or any authenticated page
  await page.waitForURL(/\/(admin|dashboard)/, { timeout: 10000 }).catch(() => {})

  const authDir = path.join('fixtures', '.auth')
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  await page.context().storageState({ path: 'fixtures/.auth/admin.json' })
})
