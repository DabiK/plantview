import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Playwright specs live in e2e/ and must never be picked up by Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
