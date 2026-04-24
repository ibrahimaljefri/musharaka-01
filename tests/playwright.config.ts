import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// Load .env file if present
const envFile = path.join(__dirname, '.env')
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
}

const BASE_URL = process.env.BASE_URL || 'https://apps.stepup2you.com'
const API_URL  = process.env.API_URL  || BASE_URL

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html',   { outputFolder: 'playwright-report', open: 'never' }],
    ['json',   { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],
  use: {
    baseURL:    BASE_URL,
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
    locale:     'ar-SA',
  },
  projects: [
    // Setup projects
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'admin-setup',
      testMatch: /admin\.setup\.ts/,
    },
    // Authenticated browser projects
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'fixtures/.auth/user.json' },
      dependencies: ['setup'],
      testIgnore: ['**/admin/**/*.spec.ts', '**/api/**/*.spec.ts'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'fixtures/.auth/user.json' },
      dependencies: ['setup'],
      testIgnore: ['**/admin/**/*.spec.ts', '**/api/**/*.spec.ts'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: 'fixtures/.auth/user.json' },
      dependencies: ['setup'],
      testIgnore: ['**/admin/**/*.spec.ts', '**/api/**/*.spec.ts'],
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'], storageState: 'fixtures/.auth/user.json' },
      dependencies: ['setup'],
      testIgnore: ['**/admin/**/*.spec.ts', '**/api/**/*.spec.ts'],
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'], storageState: 'fixtures/.auth/user.json' },
      dependencies: ['setup'],
      testIgnore: ['**/admin/**/*.spec.ts', '**/api/**/*.spec.ts'],
    },
    // Admin project
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'fixtures/.auth/admin.json',
      },
      dependencies: ['admin-setup'],
      testMatch: '**/admin/**/*.spec.ts',
    },
    // API regression project — no browser, APIRequestContext only
    {
      name: 'api',
      use: {
        baseURL: API_URL,
      },
      testMatch: '**/api/**/*.spec.ts',
    },
  ],
})
