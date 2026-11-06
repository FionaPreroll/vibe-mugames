import { defineConfig, devices } from '@playwright/test'

const port = 4174
// Containers with a preinstalled Chromium can point Playwright at it instead of its own download.
const executablePath = process.env.CHROMIUM_PATH

export default defineConfig({
  testDir: 'tests/e2e',
  // Coverage of the browser tests, when COVERAGE is set: see tests/e2e/coverage.ts.
  globalSetup: './tests/e2e/coverage-setup.ts',
  globalTeardown: './tests/e2e/coverage-teardown.ts',
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}/`,
    trace: 'retain-on-failure',
    // The built page keeps itself with a service worker; only tests/e2e/offline.spec.ts lets it,
    // so that the other tests always run the build served, and their routes see every request.
    serviceWorkers: 'block',
    // The themes' decorations and the stickers hold still, as for players who ask for less
    // motion, so that four phones on one machine spend nothing on them.
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          ...(executablePath ? { executablePath } : {}),
          // A fake camera that is allowed without asking, as a player would allow the real one.
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
      },
    },
  ],
  webServer: {
    command: `pnpm preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env.CI,
  },
})
