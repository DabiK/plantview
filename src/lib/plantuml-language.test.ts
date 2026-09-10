import { StringStream } from '@codemirror/language'
import { describe, expect, it } from 'vitest'
import { plantUmlStreamParser, type PlantUmlStreamState } from './plantuml-language'

interface Token {
  text: string
  style: string | null
}

function readTokens(line: string, state = plantUmlStreamParser.startState?.(2)): { tokens: Token[]; state: PlantUmlStreamState } {
  if (!state) throw new Error('plantUmlStreamParser.startState is missing')
  const stream = new StringStream(line, 2, 2)
  const tokens: Token[] = []
  let skippedWhitespace = false

  while (!stream.eol()) {
    stream.start = stream.pos
    const style = plantUmlStreamParser.token(stream, state)
    if (stream.pos === stream.start) {
      stream.next()
      continue
    }
    const text = stream.current()
    if (style === null && text.trim() === '') {
      skippedWhitespace = true
      continue
    }
    const last = tokens[tokens.length - 1]
    if (style !== null && last?.style === style && !skippedWhitespace) {
      last.text += text
    } else {
      tokens.push({ text, style })
    }
    skippedWhitespace = false
  }

  return { tokens, state }
}

/** Styled (non-whitespace, non-plain) tokens of a single line. */
function styledTokens(line: string): Array<[string, string]> {
  return readTokens(line)
    .tokens.filter((token): token is { text: string; style: string } => token.style !== null)
    .map((token) => [token.text, token.style])
}

describe('plantUmlStreamParser', () => {
  it('highlights directives', () => {
    expect(styledTokens('@startuml')).toEqual([['@startuml', 'meta']])
    expect(styledTokens('!include <C4/C4_Context>')).toEqual([['!include', 'meta']])
    expect(styledTokens('@enduml')).toEqual([['@enduml', 'meta']])
  })

  it('highlights block keywords case-insensitively', () => {
    expect(styledTokens('participant Alice')).toEqual([['participant', 'keyword']])
    expect(styledTokens('Note over Alice: hi')).toEqual([
      ['Note', 'keyword'],
      ['over', 'keyword'],
    ])
    expect(styledTokens('skinparam monochrome true')).toEqual([['skinparam', 'keyword']])
    expect(styledTokens('class Diagram')).toEqual([['class', 'keyword']])
  })

  it('highlights arrows between identifiers', () => {
    expect(styledTokens('Alice -> Bob: Hello!')).toEqual([['->', 'operator']])
    expect(styledTokens('Alice <|-- Bob')).toEqual([['<|--', 'operator']])
    expect(styledTokens('A ..> B')).toEqual([['..>', 'operator']])
    expect(styledTokens('A o-- B')).toEqual([['o--', 'operator']])
  })

  it('highlights numbers', () => {
    expect(styledTokens('scale 1.5')).toEqual([['1.5', 'number']])
  })

  it('highlights quoted strings', () => {
    expect(styledTokens('note "hello world"')).toEqual([
      ['note', 'keyword'],
      ['"hello world"', 'string'],
    ])
  })

  it('treats an apostrophe at line start as a comment', () => {
    expect(styledTokens("' full line comment")).toEqual([["' full line comment", 'comment']])
    expect(styledTokens("  ' indented comment")).toEqual([["' indented comment", 'comment']])
  })

  it('does not treat an apostrophe inside a line as a comment', () => {
    expect(styledTokens("Bob -> Alice: it's fine")).toEqual([['->', 'operator']])
  })

  it('keeps the block comment state across lines', () => {
    const first = readTokens("/' start", undefined)
    expect(first.tokens).toEqual([{ text: "/' start", style: 'comment' }])
    expect(first.state.inBlockComment).toBe(true)

    const second = readTokens('still commented', first.state)
    expect(second.tokens).toEqual([{ text: 'still commented', style: 'comment' }])
    expect(second.state.inBlockComment).toBe(true)

    const third = readTokens("end '/ @startuml", second.state)
    expect(third.tokens).toEqual([
      { text: "end '/", style: 'comment' },
      { text: '@startuml', style: 'meta' },
    ])
    expect(third.state.inBlockComment).toBe(false)
  })
})
