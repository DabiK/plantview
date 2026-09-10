/**
 * The PlantUML JS engine resolves syntax errors as an SVG instead of calling
 * `onError`: the SVG contains the engine banner, an excerpt of the source and
 * a coloured message. This module detects those SVGs from their text content
 * so callers can surface a styled error panel rather than the raw engine
 * output. Patterns are pinned by fixtures captured from the real engine.
 */

export interface EmbeddedDiagramError {
  /** Short human-readable message, taken from the engine output. */
  message: string
  /** 1-based line number reported by the engine, `null` when absent. */
  line: number | null
}

const UNSUPPORTED_MARKER = 'Diagram not supported by this release of PlantUML'
const SYNTAX_MARKER = 'Syntax Error?'
const EMPTY_MARKER = 'Empty description'
/** Only present in error SVGs; guards against `Syntax Error?` inside a note. */
const SOURCE_LOCATION_RE = /\[From [^\]]*\(line (\d+)\)[^\]]*\]/

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Text of the first `<text>` node whose content contains `needle`. */
function extractTextNode(svg: string, needle: string): string | null {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = svg.match(new RegExp(`<text[^>]*>([^<]*${escaped}[^<]*)</text>`))
  return match ? decodeXmlEntities(match[1]).trim() : null
}

function extractErrorLine(svg: string): number | null {
  const match = svg.match(SOURCE_LOCATION_RE)
  return match ? Number.parseInt(match[1], 10) : null
}

/**
 * Detects an engine-generated error SVG. Returns `null` for a successful
 * render, so it is safe to run on every sanitized SVG.
 */
export function detectEmbeddedRenderError(svg: string): EmbeddedDiagramError | null {
  const hasSourceLocation = SOURCE_LOCATION_RE.test(svg)

  for (const marker of [SYNTAX_MARKER, EMPTY_MARKER]) {
    if (hasSourceLocation && svg.includes(marker)) {
      return {
        message: extractTextNode(svg, marker) ?? marker,
        line: extractErrorLine(svg),
      }
    }
  }

  if (svg.includes(UNSUPPORTED_MARKER)) {
    return {
      message: extractTextNode(svg, UNSUPPORTED_MARKER) ?? UNSUPPORTED_MARKER,
      line: extractErrorLine(svg),
    }
  }

  return null
}
