import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    locale: 'ar-SA',
  },
  projects: [
    // Setup project — runs auth.setup.ts once to save storage state
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Authenticated browser projects
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'fixtures/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'fixtures/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: 'fixtures/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'], storageState: 'fixtures/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'], storageState: 'fixtures/.auth/user.json' },
      dependencies: ['setup'],
    },
    // Admin setup
    {
      name: 'admin-setup',
      testMatch: /admin\.setup\.ts/,
    },
    // Admin authenticated project
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'fixtures/.auth/admin.json',
      },
      dependencies: ['admin-setup'],
      testMatch: '**/admin/**/*.spec.ts',
    },
  ],
})
