import { defineConfig } from '@playwright/test'
import base from './playwright.config'

/**
 * The README's screenshots (`pnpm screenshots`): tests/screenshots plays the games in Chromium
 * and keeps a picture of each in docs/screenshots. A picture is written anew only when it looks
 * different from the one there, beyond what fonts and antialiasing change from one machine to
 * another; `pnpm screenshots --update-snapshots=all` writes them all.
 */
export default defineConfig({
  ...base,
  testDir: 'tests/screenshots',
  globalSetup: undefined,
  globalTeardown: undefined,
  // One after the other, so the pictures don't compete for the machine.
  workers: 1,
  timeout: 60_000,
  snapshotPathTemplate: 'docs/screenshots/{arg}{ext}',
  updateSnapshots: 'changed',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
      maxDiffPixelRatio: 0.001,
    },
  },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
})
