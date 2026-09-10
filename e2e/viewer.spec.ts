import { expect, test } from '@playwright/test'

/** Reference PlantUML code from docs/DESIGN.md: `Bob -> Alice: Hello!`. */
const REFERENCE_CODE = 'SoWkIImgAStDuULroazIqBLJSCp9J4wrKl18pSd9L-JbTKZDIm5A0m00'

test.describe('viewer', () => {
  test('renders the reference diagram with Bob and Alice', async ({ page }) => {
    await page.goto(`/view/${REFERENCE_CODE}`)

    const svg = page.locator('.diagram-svg svg')
    await expect(svg).toBeVisible({ timeout: 60_000 })
    await expect(svg).toContainText('Bob')
    await expect(svg).toContainText('Alice')
  })

  test('?dark=1 forces the dark theme', async ({ page }) => {
    await page.goto(`/view/${REFERENCE_CODE}?dark=1`)

    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(html).toHaveClass(/dark/)
  })

  test('an invalid code shows the styled error panel', async ({ page }) => {
    await page.goto('/view/this-is-not-a-valid-plantuml-code!!!')

    const panel = page.getByRole('alert')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Unable to render this diagram')
    await expect(panel).toContainText('unable to decode')
    await expect(panel.getByRole('link', { name: 'Open in editor' })).toBeVisible()
  })
})
