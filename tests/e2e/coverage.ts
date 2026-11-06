import { type BrowserContext, test as base, type Page } from '@playwright/test'
import MCR, { type CoverageReportOptions } from 'monocart-coverage-reports'

/**
 * Coverage of the browser tests, when `COVERAGE` is set (CI does): every page a test opens
 * records which code of the game runs in Chromium, from before its first navigation, and the
 * records go to coverage/e2e, mapped through the build's source maps back to the TypeScript in
 * src/. tests/e2e/coverage-teardown.ts writes coverage/e2e/lcov.info from them.
 */

export const coverageOptions: CoverageReportOptions = {
  name: 'Spielekiste in the browser',
  outputDir: 'coverage/e2e',
  reports: ['lcovonly', 'console-summary'],
  // The game's own bundles, as the preview server serves them; not Vite's own preload helper.
  entryFilter: (entry) =>
    /\/assets\/[^/]+\.js$/.test(entry.url) && !entry.url.includes('/preload-helper-'),
  // The Spielekiste's own sources: not the library's or other people's code inside the bundles.
  sourceFilter: (path) => path.startsWith('src/') && !path.includes('node_modules'),
}

export const covering = Boolean(process.env.COVERAGE)

/**
 * The specs import `test` from here, which does two things for every test on its own: it
 * closes the phones the test opened with `browser.newContext` (Playwright closes only its own
 * `page` and `context`), so that their tables stop running once the test is over and do not
 * slow down every test after it in the same browser; and, when `COVERAGE` is set, it records
 * each page's coverage before closing it.
 */
export const test = base.extend<{ phones: void }>({
  phones: [
    async ({ browser }, use) => {
      const contexts: BrowserContext[] = []
      const recording = new Set<Page>()
      const collected: unknown[] = []
      const stop = async (page: Page) => {
        if (!recording.delete(page) || page.isClosed()) return
        collected.push(...(await page.coverage.stopJSCoverage().catch(() => [])))
      }
      const watch = (context: BrowserContext) => {
        contexts.push(context)
        if (!covering) return context
        const newPage = context.newPage.bind(context)
        context.newPage = async () => {
          const page = await newPage()
          // Before the test gets the page, so the first scripts are measured too.
          await page.coverage.startJSCoverage({ resetOnNavigation: false })
          recording.add(page)
          return page
        }
        const close = context.close.bind(context)
        context.close = async (options) => {
          for (const page of context.pages()) await stop(page)
          return close(options)
        }
        return context
      }
      const newContext = browser.newContext.bind(browser)
      browser.newContext = async (options) => watch(await newContext(options))
      try {
        await use()
      } finally {
        browser.newContext = newContext
        for (const page of [...recording]) await stop(page)
        for (const context of contexts) await context.close().catch(() => {})
        if (collected.length > 0) await MCR(coverageOptions).add(collected as never)
      }
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
