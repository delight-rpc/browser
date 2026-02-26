import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { playwright } from '@vitest/browser-playwright'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths()
  ]
, test: {
    browser: {
      enabled: true
    , headless: true
    , provider: playwright()
    , instances: [
        { browser: 'chromium' }
      ]
    }
  }
})
