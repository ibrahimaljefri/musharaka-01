const { defineConfig } = require('vitest/config')

module.exports = defineConfig({
  test: {
    include:      ['src/tests/**/*.test.js'],
    environment:  'node',
    setupFiles:   ['./src/tests/setup.js'],
    // Allow vi.mock() to hoist mocks above CJS require() calls
    globals:      true,
    // Each test file gets its own module registry so mocks don't bleed
    isolate:      true,
  },
})
