/**
 * Default PlantUML style injected before the user content so diagrams look
 * consistent with the PlantView UI, in light and dark mode.
 *
 * The block is inserted right after the opening `@start…` directive, which
 * means any user `skinparam` or `<style>` statement comes later and therefore
 * always wins (verified against the local engine). The user source itself is
 * never modified: injection only happens at render time.
 *
 * Formatting rule learned from the engine: each style property must sit on its
 * own line — two properties on the same line make the whole block invalid.
 */

export interface DefaultStyleOptions {
  dark?: boolean
}

export interface InjectedDefaultStyle {
  /** Source with the default style block inserted after the `@start…` line. */
  source: string
  /**
   * Number of lines the injected block adds before the user content. The
   * engine reports error lines against the injected source, so callers must
   * subtract this offset to map them back to the user source.
   */
  lineOffset: number
}

interface Palette {
  background: string
  surface: string
  surfaceAlt: string
  border: string
  text: string
  mutedText: string
  line: string
  link: string
  noteBackground: string
  noteBorder: string
  noteText: string
}

/**
 * Same stack as the app UI (Tailwind's `font-sans`). The engine writes it
 * verbatim into `font-family` attributes, so it stays a plain CSS list.
 */
const FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif'

const LIGHT_PALETTE: Palette = {
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  border: '#CBD5E1',
  text: '#0F172A',
  mutedText: '#64748B',
  line: '#64748B',
  link: '#2563EB',
  noteBackground: '#FEFCE8',
  noteBorder: '#EAB308',
  noteText: '#713F12',
}

const DARK_PALETTE: Palette = {
  background: '#020617',
  surface: '#1E293B',
  surfaceAlt: '#0F172A',
  border: '#475569',
  text: '#E2E8F0',
  mutedText: '#94A3B8',
  line: '#94A3B8',
  link: '#7DD3FC',
  noteBackground: '#422006',
  noteBorder: '#A16207',
  noteText: '#FEF3C7',
}

/** Node-like selectors sharing the same surface colour and rounded corners. */
const NODE_SELECTORS = [
  'class',
  'entity',
  'interface',
  'component',
  'usecase',
  'object',
  'node',
  'artifact',
  'folder',
  'card',
  'rectangle',
  'person',
  'hexagon',
  'package',
  'boundary',
  'control',
  'database',
  'collections',
  'queue',
  'stack',
  'storage',
  'agent',
  'cloud',
] as const

function buildStyleBlock(palette: Palette): string {
  const nodeBlock = (selector: string) => `${selector} {
  BackgroundColor ${palette.surface}
  LineColor ${palette.border}
  RoundCorner 6
}`

  const blocks = [
    `root {
  FontName "${FONT_STACK}"
  FontColor ${palette.text}
  LineColor ${palette.line}
  LineThickness 1.1
  HyperLinkColor ${palette.link}
  Shadowing 0
}`,
    `document {
  BackgroundColor ${palette.background}
  title {
    FontSize 20
    FontStyle bold
    FontColor ${palette.text}
    LineThickness 0
  }
  caption {
    FontColor ${palette.mutedText}
    LineThickness 0
  }
  header {
    FontColor ${palette.mutedText}
    LineThickness 0
  }
  footer {
    FontColor ${palette.mutedText}
    LineThickness 0
  }
}`,
    `arrow {
  LineColor ${palette.line}
  LineThickness 1.1
}`,
    ...NODE_SELECTORS.map(nodeBlock),
    `actor {
  LineColor ${palette.line}
  FontColor ${palette.text}
}`,
    `participant {
  BackgroundColor ${palette.surface}
  LineColor ${palette.border}
}`,
    `state {
  BackgroundColor ${palette.surface}
  LineColor ${palette.border}
}`,
    `activity {
  BackgroundColor ${palette.surface}
  LineColor ${palette.border}
}`,
    `diamond {
  BackgroundColor ${palette.surface}
  LineColor ${palette.border}
}`,
    `activityBar {
  BackgroundColor ${palette.text}
  LineColor ${palette.text}
}`,
    `start {
  BackgroundColor ${palette.text}
  LineColor ${palette.text}
}`,
    `stop {
  BackgroundColor ${palette.text}
  LineColor ${palette.text}
}`,
    `note {
  BackgroundColor ${palette.noteBackground}
  LineColor ${palette.noteBorder}
  FontColor ${palette.noteText}
}`,
    `spot {
  BackgroundColor ${palette.surfaceAlt}
  LineColor ${palette.border}
  FontColor ${palette.text}
}`,
    `sequenceDiagram {
  lifeLine {
    LineColor ${palette.border}
  }
  groupHeader {
    BackgroundColor ${palette.surfaceAlt}
    FontColor ${palette.text}
  }
}`,
  ]

  return `<style>\n${blocks.join('\n')}\n</style>`
}

/**
 * Legacy `skinparam` fallback for elements the style engine does not fully
 * cover (sequence actors, activity/state shapes…). Injected after the style
 * block and still before the user content.
 */
function buildSkinparamFallback(palette: Palette): string {
  return [
    `skinparam DefaultFontColor ${palette.text}`,
    `skinparam ArrowColor ${palette.line}`,
    `skinparam NoteBackgroundColor ${palette.noteBackground}`,
    `skinparam NoteBorderColor ${palette.noteBorder}`,
    `skinparam NoteFontColor ${palette.noteText}`,
    `skinparam ActorBackgroundColor ${palette.surface}`,
    `skinparam ActorBorderColor ${palette.border}`,
    `skinparam UsecaseBackgroundColor ${palette.surface}`,
    `skinparam UsecaseBorderColor ${palette.border}`,
    `skinparam SequenceLifeLineBorderColor ${palette.border}`,
    `skinparam ActivityBackgroundColor ${palette.surface}`,
    `skinparam ActivityBorderColor ${palette.border}`,
    `skinparam ActivityFontColor ${palette.text}`,
    `skinparam ActivityDiamondBackgroundColor ${palette.surface}`,
    `skinparam ActivityDiamondBorderColor ${palette.border}`,
    `skinparam ActivityStartColor ${palette.text}`,
    `skinparam StateBackgroundColor ${palette.surface}`,
    `skinparam StateBorderColor ${palette.border}`,
    `skinparam StateFontColor ${palette.text}`,
  ].join('\n')
}

/** Matches the first `@start…` directive line, keeping its line ending. */
const START_DIRECTIVE_RE = /^([ \t]*@start[a-z]+[^\r\n]*(?:\r\n|\n|\r)?)/im

/**
 * Whether the source carries anything besides directives, comments and blank
 * lines. An empty body must keep its usual "Empty description" engine error:
 * injecting the style block would otherwise count as content and render an
 * empty diagram instead.
 */
function hasDiagramContent(source: string): boolean {
  return source
    .split(/\r\n|\n|\r/)
    .some((line) => {
      const trimmed = line.trim()
      return trimmed !== '' && !trimmed.startsWith('@') && !trimmed.startsWith("'")
    })
}

/** Builds the full injected block (style + skinparam fallback). */
export function buildDefaultStyleBlock(options: DefaultStyleOptions = {}): string {
  const palette = options.dark === true ? DARK_PALETTE : LIGHT_PALETTE
  return `${buildStyleBlock(palette)}\n${buildSkinparamFallback(palette)}`
}

/**
 * Inserts the default style block into a PlantUML source:
 * - with an `@start…` directive, right after that line;
 * - without one, at the very top (the engine assumes `@startuml`).
 *
 * Returns the injected source and the number of added lines so callers can map
 * engine error lines back to the original source.
 */
export function injectDefaultStyle(
  source: string,
  options: DefaultStyleOptions = {},
): InjectedDefaultStyle {
  if (!hasDiagramContent(source)) {
    return { source, lineOffset: 0 }
  }

  const block = buildDefaultStyleBlock(options)
  const lineOffset = block.split('\n').length

  const match = START_DIRECTIVE_RE.exec(source)
  if (!match) {
    return { source: `${block}\n${source}`, lineOffset }
  }

  const insertAt = match.index + match[1].length
  const endsWithNewline = /(?:\r\n|\n|\r)$/.test(match[1])
  const separator = endsWithNewline ? '' : '\n'
  const injected = `${source.slice(0, insertAt)}${separator}${block}\n${source.slice(insertAt)}`

  return { source: injected, lineOffset }
}

/**
 * Maps a line number reported by the engine against the injected source back
 * to the original source. Returns `null` when the line falls inside the
 * injected block (which is always valid) or when no line was reported.
 */
export function mapInjectedLineToSourceLine(
  line: number | null,
  lineOffset: number,
): number | null {
  if (line === null) return null
  const adjusted = line - lineOffset
  return adjusted >= 1 ? adjusted : null
}
