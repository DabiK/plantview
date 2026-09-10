/** SVG dimensions in user units. */
export interface SvgDimensions {
  width: number
  height: number
}

const SVG_TAG_PATTERN = /<svg\b[^>]*>/i
const FALLBACK_DIMENSIONS: SvgDimensions = { width: 1024, height: 768 }
/** ×2 keeps exports crisp on high-density screens. */
const EXPORT_SCALE = 2
const LIGHT_BACKGROUND = '#ffffff'
const DARK_BACKGROUND = '#020617'

function readAttribute(tag: string, name: string): string | null {
  // `(?:^|\s)` avoids matching `stroke-width` when looking for `width`.
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`, 'i'))
  return match ? match[1] : null
}

function parseLength(value: string | null): number | null {
  if (!value) return null
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/i)
  if (!match) return null
  const parsed = Number.parseFloat(match[1])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/** Reads the pixel size of a sanitized PlantUML SVG (`width`/`height` or `viewBox`). */
export function getSvgDimensions(svg: string): SvgDimensions | null {
  const tag = svg.match(SVG_TAG_PATTERN)?.[0]
  if (!tag) return null

  const width = parseLength(readAttribute(tag, 'width'))
  const height = parseLength(readAttribute(tag, 'height'))
  if (width && height) return { width, height }

  const viewBox = readAttribute(tag, 'viewBox')
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number)
    if (
      parts.length === 4 &&
      parts.every((part) => Number.isFinite(part)) &&
      parts[2] > 0 &&
      parts[3] > 0
    ) {
      return { width: parts[2], height: parts[3] }
    }
  }

  return null
}

/**
 * Returns the SVG with explicit `width`/`height` attributes so browsers can
 * rasterize it at a known size (an SVG inside `<img>` only scales through
 * those attributes).
 */
export function withExplicitSvgSize(
  svg: string,
  fallback: SvgDimensions = FALLBACK_DIMENSIONS,
): string {
  const tag = svg.match(SVG_TAG_PATTERN)?.[0]
  if (!tag) return svg

  const dimensions = getSvgDimensions(svg) ?? fallback
  const cleaned = tag.replace(/\s(?:width|height)\s*=\s*"[^"]*"/gi, '')
  const sized = cleaned.replace(
    /<svg\b/i,
    `<svg width="${dimensions.width}" height="${dimensions.height}"`,
  )
  return svg.replace(tag, sized)
}

function triggerDownload(url: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

/** Downloads the sanitized SVG as a file. */
export function downloadSvg(svg: string, filename: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The browser could not rasterize the SVG.'))
    }
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('The browser could not encode the PNG.'))
      }
    }, 'image/png')
  })
}

export interface DownloadPngOptions {
  dark?: boolean
}

/**
 * Rasterizes the sanitized SVG to a PNG (×2) and downloads it, with a
 * theme-appropriate background.
 */
export async function downloadPng(
  svg: string,
  filename: string,
  options: DownloadPngOptions = {},
): Promise<void> {
  const dimensions = getSvgDimensions(svg) ?? FALLBACK_DIMENSIONS
  const image = await loadSvgImage(withExplicitSvgSize(svg, dimensions))

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(dimensions.width * EXPORT_SCALE))
  canvas.height = Math.max(1, Math.round(dimensions.height * EXPORT_SCALE))

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas 2D is not available in this browser.')
  }

  context.fillStyle = options.dark ? DARK_BACKGROUND : LIGHT_BACKGROUND
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await canvasToBlob(canvas)
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
