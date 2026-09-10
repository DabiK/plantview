import { StreamLanguage, type StreamParser } from '@codemirror/language'

/**
 * Minimal PlantUML syntax highlighting for CodeMirror 6. It is intentionally
 * not exhaustive: directives, block keywords, arrows, comments and strings
 * are enough to make the editor readable.
 */

export interface PlantUmlStreamState {
  /** Inside a `/' … '/` block comment. */
  inBlockComment: boolean
}

const KEYWORDS = new Set([
  'abstract',
  'activate',
  'actor',
  'agent',
  'alt',
  'annotation',
  'artifact',
  'as',
  'autonumber',
  'boundary',
  'bottom',
  'break',
  'caption',
  'card',
  'class',
  'cloud',
  'collections',
  'component',
  'control',
  'create',
  'critical',
  'database',
  'deactivate',
  'destroy',
  'else',
  'end',
  'endif',
  'endwhile',
  'entity',
  'enum',
  'extends',
  'extension',
  'file',
  'folder',
  'footer',
  'fork',
  'frame',
  'group',
  'header',
  'hide',
  'if',
  'implements',
  'interface',
  'is',
  'left',
  'legend',
  'link',
  'loop',
  'namespace',
  'node',
  'note',
  'object',
  'on',
  'opt',
  'over',
  'package',
  'par',
  'participant',
  'person',
  'queue',
  'rectangle',
  'repeat',
  'return',
  'right',
  'show',
  'skinparam',
  'split',
  'start',
  'state',
  'stop',
  'storage',
  'then',
  'title',
  'together',
  'top',
  'usecase',
  'while',
])

const DIRECTIVE_RE = /^[@!][A-Za-z]\w*/
const WORD_RE = /^[A-Za-z_$][\w$]*/
const NUMBER_RE = /^\d+(?:\.\d+)?/
/** Arrow-ish runs: `->`, `-->`, `..>`, `<|--`, `o--`, `*--`, `--`, `==`… */
const ARROW_RE = /^(?:(?:o|\*)[-.=]{2,}|(?=[-.<>=|*+]{2,}))[-.<>=|*o+]*/

function startsLineComment(stream: {
  peek: () => string | undefined
  pos: number
  string: string
}): boolean {
  return stream.peek() === "'" && stream.string.slice(0, stream.pos).trim() === ''
}

/** Stream parser powering {@link plantUmlLanguage}. Exported for tests. */
export const plantUmlStreamParser: StreamParser<PlantUmlStreamState> = {
  name: 'plantuml',
  startState: () => ({ inBlockComment: false }),
  copyState: (state) => ({ ...state }),
  token(stream, state) {
    if (state.inBlockComment) {
      while (!stream.eol()) {
        if (stream.match("'/")) {
          state.inBlockComment = false
          break
        }
        stream.next()
      }
      return 'comment'
    }

    if (stream.eatSpace()) return null

    if (stream.match("/'")) {
      state.inBlockComment = true
      return 'comment'
    }

    if (startsLineComment(stream)) {
      stream.skipToEnd()
      return 'comment'
    }

    if (stream.peek() === '"') {
      stream.next()
      while (!stream.eol()) {
        if (stream.next() === '"') break
      }
      return 'string'
    }

    if (stream.match(DIRECTIVE_RE)) return 'meta'

    if (stream.match(ARROW_RE)) return 'operator'

    const word = stream.match(WORD_RE)
    if (Array.isArray(word)) {
      return KEYWORDS.has(word[0].toLowerCase()) ? 'keyword' : null
    }

    if (stream.match(NUMBER_RE)) return 'number'

    stream.next()
    return null
  },
}

/** Language support for PlantUML source in CodeMirror 6. */
export const plantUmlLanguage = StreamLanguage.define(plantUmlStreamParser)
