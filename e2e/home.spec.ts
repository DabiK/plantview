import { expect, test } from '@playwright/test'

test.describe('home page', () => {
  test('shows the paste zone and example cards linking to the viewer', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('#diagram-input')).toBeVisible()

    const cards = page.locator('#examples a[href^="/view/"]')
    await expect(cards).toHaveCount(4)
    for (let index = 0; index < 4; index += 1) {
      await expect(cards.nth(index)).toHaveAttribute('href', /^\/view\/.+$/)
    }
  })

  test('opening an example card navigates to the viewer', async ({ page }) => {
    await page.goto('/')

    await page.locator('#examples a[href^="/view/"]').first().click()

    await expect(page).toHaveURL(/\/view\/[A-Za-z0-9_-]+$/)
  })
})
