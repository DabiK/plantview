import { expect, test } from '@playwright/test'

test.describe('editor', () => {
  test('typing PlantUML updates the live preview', async ({ page }) => {
    // Start from a clean slate so the default example is always loaded first.
    await page.addInitScript(() => window.localStorage.clear())
    await page.goto('/edit')

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type('@startuml\nAlice -> Bob: Ping\n@enduml')

    const svg = page.locator('.diagram-svg svg')
    await expect(svg).toContainText('Ping', { timeout: 60_000 })
  })
})
