import { expect, test, type Page } from '@playwright/test'

/** Reference PlantUML code from docs/DESIGN.md: `Bob -> Alice: Hello!`. */
const REFERENCE_CODE = 'SoWkIImgAStDuULroazIqBLJSCp9J4wrKl18pSd9L-JbTKZDIm5A0m00'

/** Waits until the viewer has recorded a history entry in localStorage. */
function waitForHistoryEntry(page: Page, expectedCount?: number): Promise<unknown> {
  return page.waitForFunction((count) => {
    const raw = window.localStorage.getItem('plantview:history')
    if (!raw) return false
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return false
      return count === undefined ? parsed.length > 0 : parsed.length === count
    } catch {
      return false
    }
  }, expectedCount)
}

test.describe('history', () => {
  test('records a viewed diagram and lists it', async ({ page }) => {
    await page.goto(`/view/${REFERENCE_CODE}`)
    await waitForHistoryEntry(page)

    await page.goto('/history')
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Bob -> Alice: Hello!' })).toBeVisible()
  })

  test('deduplicates re-opened diagrams and clears everything', async ({ page }) => {
    await page.goto(`/view/${REFERENCE_CODE}`)
    await waitForHistoryEntry(page, 1)

    await page.goto('/')
    await page.goto(`/view/${REFERENCE_CODE}`)
    await waitForHistoryEntry(page, 1)

    await page.goto('/history')
    await expect(page.locator('ul > li')).toHaveCount(1)

    await page.getByRole('button', { name: 'Clear all' }).click()
    await expect(page.getByText('No diagrams yet')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Clear all' })).toHaveCount(0)
  })
})
