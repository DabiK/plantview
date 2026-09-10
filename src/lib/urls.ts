/**
 * Builds the canonical viewer URL for a diagram code.
 *
 * `base` is the app origin plus optional base path (e.g.
 * `https://example.com/plantview/`); trailing slashes are normalized.
 */
export function buildViewUrl(code: string, base: string): string {
  const normalizedBase = base.replace(/\/+$/, '')
  return `${normalizedBase}/view/${encodeURIComponent(code)}`
}
