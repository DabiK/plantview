import PlantUmlEncoder from 'plantuml-encoder'

/**
 * Error thrown when a diagram can't be decoded from a PlantUML code (missing,
 * empty or corrupted input).
 */
export class DiagramDecodeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'DiagramDecodeError'
  }
}

/** Path segment carrying a diagram code on PlantUML/PlantText-style URLs. */
const URL_PATH_CODE_PATTERN = /(?:^|\/)(?:png|svg|txt|uml|view)\/([^/?#\s]+)/i
/** Query parameter carrying a diagram code (PlantText uses `?text=`). */
const URL_QUERY_CODE_PATTERN = /[?&](?:text|code)=([^&#\s]+)/i
/** Anything that starts with a scheme, `www.` or `/` is treated as a URL. */
const URL_LIKE_PATTERN = /^(?:[a-z][a-z0-9+.-]*:\/\/|www\.|\/)/i

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Extracts the PlantUML code from an input that can be a raw code, a full
 * PlantUML/PlantText URL (`…/png/<code>`, `/svg/`, `/txt/`, `…/view/<code>`,
 * `?text=<code>`) or any path ending with one of those segments.
 *
 * Returns `''` when no code can be found.
 */
export function extractDiagramCode(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    return ''
  }

  if (URL_LIKE_PATTERN.test(trimmed)) {
    const pathMatch = trimmed.match(URL_PATH_CODE_PATTERN)
    if (pathMatch?.[1]) {
      return safeDecodeURIComponent(pathMatch[1])
    }

    const queryMatch = trimmed.match(URL_QUERY_CODE_PATTERN)
    if (queryMatch?.[1]) {
      return safeDecodeURIComponent(queryMatch[1])
    }

    return ''
  }

  return trimmed
}

/** Normalizes CRLF, lone CR and PlantText's doubled CR to `\n`. */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

/**
 * Decodes a PlantUML code (raw or embedded in a URL) into its normalized
 * PlantUML source. Throws {@link DiagramDecodeError} for empty or corrupted
 * codes instead of returning garbage.
 */
export function decodeDiagram(input: string): string {
  const code = extractDiagramCode(input)
  if (!code) {
    throw new DiagramDecodeError('Missing or empty PlantUML code.')
  }

  let decoded: string
  try {
    decoded = PlantUmlEncoder.decode(code)
  } catch (cause) {
    throw new DiagramDecodeError('Invalid PlantUML code: unable to decode.', { cause })
  }

  const normalized = normalizeLineEndings(decoded)
  if (!normalized.trim()) {
    throw new DiagramDecodeError('Invalid PlantUML code: decoded diagram is empty.')
  }

  return normalized
}

/** Encodes PlantUML source with the standard PlantUML codec. */
export function encodeDiagram(source: string): string {
  return PlantUmlEncoder.encode(source)
}
