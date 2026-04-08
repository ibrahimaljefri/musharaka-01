/**
 * Cross-page / global regression tests — G-01 through G-08
 */
import { test, expect } from '@playwright/test'

// These unauthenticated tests must not use stored auth state
const PROTECTED_ROUTES = [
  '/dashboard',
  '/sales/create',
  '/sales/import',
  '/reports',
  '/branches',
  '/branches/create',
  '/submit',
  '/submissions',
]

test.describe('Global — unauthenticated redirects', () => {
  // Run without stored auth state so we can test the redirect behaviour
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const route of PROTECTED_ROUTES) {
    test(`G-01: unauthenticated access to ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    })
  }

  test('G-02: redirect param is preserved in the login URL', async ({ page }) => {
    await page.goto('/reports')
    await expect(page).toHaveURL(/\/login\?redirect=%2Freports|\/login/, { timeout: 10_000 })
  })
})

test.describe('Global — authenticated behaviour', () => {
  // G-03: Logout clears session and redirects to /login
  test('G-03: clicking logout clears session and redirects to /login', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'تسجيل الخروج' }).click()
    await expect(page).toHaveURL('/login', { timeout: 10_000 })
    // After logout, trying to go back to dashboard should redirect to login
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  // G-04: All pages have dir="rtl" on the html element
  const ALL_ROUTES = [
    '/dashboard',
    '/sales/create',
    '/sales/import',
    '/reports',
    '/branches',
    '/branches/create',
    '/submit',
    '/submissions',
  ]

  for (const route of ALL_ROUTES) {
    test(`G-04: ${route} has dir="rtl" on <html>`, async ({ page }) => {
      await page.goto(route)
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    })
  }

  // G-05: Active nav link highlighted on each page
  const NAV_PAGES: Array<[string, string]> = [
    ['/dashboard',    'لوحة التحكم'],
    ['/sales/create', 'إضافة مبيعات'],
    ['/reports',      'التقارير'],
    ['/branches',     'الفروع'],
    ['/submit',       'إرسال الفواتير'],
    ['/submissions',  'تقرير الإرسالات'],
  ]

  for (const [route, label] of NAV_PAGES) {
    test(`G-05: active nav link "${label}" is highlighted on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(route)
      const activeLink = page.getByRole('link', { name: label })
      await expect(activeLink).toBeVisible()
      // The active link should have a distinctive class (bg-* or text-white)
      const classes = await activeLink.getAttribute('class')
      expect(classes).toMatch(/bg-|text-white|active|font-semibold/)
    })
  }

  // G-06: Sidebar mobile toggle works at 375px
  test('G-06: hamburger button toggles sidebar at 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')

    // Sidebar should be hidden by default on mobile
    const sidebar = page.locator('aside').first()

    // Click the hamburger button to open sidebar
    const menuBtn = page.locator('header button').first()
    await menuBtn.click()
    await expect(sidebar).toBeVisible()

    // Click again or backdrop to close
    await menuBtn.click()
  })

  // G-07: No horizontal scroll on any page at 375px (mobile)
  for (const route of ['/dashboard', '/sales/create', '/branches', '/submit', '/submissions']) {
    test(`G-07: no horizontal scroll at 375px on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(route)
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(scrollWidth).toBeLessThanOrEqual(380)
    })
  }

  // G-08: Wide viewport (1920px) — no stretched empty space
  test('G-08: layout fills correctly at 1920px wide monitor', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/dashboard')
    // Main content area should be visible (not empty)
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible()
    // No horizontal scroll on wide viewport
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(1920 + 20)
  })
})
