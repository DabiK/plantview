import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { diagramExamples } from '../src/lib/examples'
import { encodeDiagram } from '../src/lib/plantuml-encoding'

function exampleSource(id: string): string {
  const example = diagramExamples.find((candidate) => candidate.id === id)
  if (!example) throw new Error(`Missing example: ${id}`)
  return encodeDiagram(example.source)
}

const CLASS_CODE = exampleSource('class')
const SEQUENCE_CODE = exampleSource('sequence')

/** Parses the last coordinate pair of a path `d` attribute. */
function lastPair(d: string | null): [number, number] {
  const numbers = (d?.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  return [numbers[numbers.length - 2], numbers[numbers.length - 1]]
}

/** Parses a `translate(dx dy)` transform attribute. */
function parseTranslate(transform: string | null): [number, number] {
  const numbers = (transform?.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  return [numbers[numbers.length - 2], numbers[numbers.length - 1]]
}

test.describe('adjust mode', () => {
  test('drags a class node with its edges, exports positions and resets', async ({ page }) => {
    await page.goto(`/view/${CLASS_CODE}`)

    const svg = page.locator('.diagram-svg svg')
    await expect(svg).toBeVisible({ timeout: 60_000 })
    await expect(svg).toContainText('Diagram')

    const adjust = page.getByRole('button', { name: 'Adjust layout' })
    await expect(adjust).toBeEnabled()
    await adjust.click()
    await expect(adjust).toHaveAttribute('aria-pressed', 'true')

    const reset = page.getByRole('button', { name: 'Reset layout' })
    await expect(reset).toBeDisabled()

    // The first entity (class `Diagram`) is the target of both associations,
    // so its edges must follow when it moves.
    const node = page.locator('g.entity').first()
    const edgePath = page.locator('g.link path').first()
    const edgeEndBefore = lastPair(await edgePath.getAttribute('d'))

    const box = await node.locator('rect').first().boundingBox()
    expect(box).not.toBeNull()
    const startX = box!.x + box!.width / 2
    const startY = box!.y + box!.height / 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 90, startY + 70, { steps: 12 })
    await page.mouse.up()

    const transform = await node.getAttribute('transform')
    const [dx, dy] = parseTranslate(transform)
    expect(Math.hypot(dx, dy)).toBeGreaterThan(10)
    await expect(reset).toBeEnabled()

    // The connected edge endpoint moved by the same delta as the node.
    const edgeEndAfter = lastPair(await edgePath.getAttribute('d'))
    expect(edgeEndAfter[0]).toBeCloseTo(edgeEndBefore[0] + dx, 1)
    expect(edgeEndAfter[1]).toBeCloseTo(edgeEndBefore[1] + dy, 1)

    // Exports serialize the displayed SVG, including the new positions.
    const edgePathAfter = await edgePath.getAttribute('d')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download SVG' }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    expect(downloadPath).not.toBeNull()
    const exported = await readFile(downloadPath as string, 'utf8')
    expect(exported).toContain('translate(')
    expect(exported).toContain(edgePathAfter ?? '')

    // Reset restores the original layout and disables itself again.
    await reset.click()
    await expect(node).not.toHaveAttribute('transform')
    await expect(reset).toBeDisabled()
  })

  test('adjust mode is unavailable on sequence diagrams', async ({ page }) => {
    await page.goto(`/view/${SEQUENCE_CODE}`)

    await expect(page.locator('.diagram-svg svg')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole('button', { name: 'Adjust layout' })).toBeDisabled()
  })
})
