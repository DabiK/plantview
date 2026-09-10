import { decodeDiagram, extractDiagramCode } from './plantuml-encoding'

/**
 * Classification of whatever the visitor pasted on the home page:
 * PlantUML source, an encoded diagram code, or nothing usable.
 */
export type ParsedDiagramInput =
  | { kind: 'source'; source: string }
  | { kind: 'code'; code: string }
  | { kind: 'empty' }

/** PlantUML sources start with a `@start…` directive (`@startuml`, `@startmindmap`…). */
const SOURCE_DIRECTIVE_PATTERN = /@start[a-z]+/i
/** Standard PlantUML codec alphabet (URL-safe base64 variant of deflate output). */
const CODE_ALPHABET_PATTERN = /^[0-9A-Za-z_-]+$/
/** Anything that starts with a scheme, `www.` or `/` is treated as a URL. */
const URL_LIKE_PATTERN = /^(?:[a-z][a-z0-9+.-]*:\/\/|www\.|\/)/i
/** Deflate-based codes are never this short, even for a two-line diagram. */
const MIN_CODE_LENGTH = 12

/**
 * A lone token is a diagram code only if it uses the codec alphabet, is long
 * enough to be a deflate payload, and actually decodes. This keeps ordinary
 * prose (e.g. a single word) classified as source.
 */
function isDecodableCode(candidate: string): boolean {
  if (candidate.length < MIN_CODE_LENGTH || !CODE_ALPHABET_PATTERN.test(candidate)) {
    return false
  }

  try {
    decodeDiagram(candidate)
    return true
  } catch {
    return false
  }
}

/**
 * Classifies the home page input:
 * - raw PlantUML source (contains a `@start…` directive) → `source`;
 * - full PlantText/PlantUML URL (`…/png/<code>`, `/svg/`, `/txt/`, `?text=`) → `code`;
 * - encoded code pasted alone (codec alphabet, plausible length, decodable) → `code`;
 * - anything else (fragments without `@start`, URLs without a code) → `source`,
 *   because visitors often paste partial diagrams.
 */
export function parseDiagramInput(input: string): ParsedDiagramInput {
  const trimmed = input.trim()
  if (!trimmed) {
    return { kind: 'empty' }
  }

  if (SOURCE_DIRECTIVE_PATTERN.test(trimmed)) {
    return { kind: 'source', source: trimmed }
  }

  if (URL_LIKE_PATTERN.test(trimmed)) {
    const code = extractDiagramCode(trimmed)
    return code ? { kind: 'code', code } : { kind: 'source', source: trimmed }
  }

  if (isDecodableCode(trimmed)) {
    return { kind: 'code', code: trimmed }
  }

  return { kind: 'source', source: trimmed }
}
