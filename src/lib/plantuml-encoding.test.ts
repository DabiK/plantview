import { describe, expect, it } from 'vitest'

import {
  DiagramDecodeError,
  decodeDiagram,
  encodeDiagram,
  extractDiagramCode,
} from './plantuml-encoding'

const REFERENCE_CODE = 'SoWkIImgAStDuULroazIqBLJSCp9J4wrKl18pSd9L-JbTKZDIm5A0m00'
const REFERENCE_URL = `https://www.planttext.com/?text=${REFERENCE_CODE}`
const REFERENCE_LINES = ['@startuml', 'Bob -> Alice: Hello!', '@enduml']

function nonEmptyLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

describe('decodeDiagram', () => {
  it('decodes the reference PlantUML code', () => {
    expect(nonEmptyLines(decodeDiagram(REFERENCE_CODE))).toEqual(REFERENCE_LINES)
  })

  it('decodes a full PlantText URL', () => {
    expect(nonEmptyLines(decodeDiagram(REFERENCE_URL))).toEqual(REFERENCE_LINES)
  })

  it('round-trips an ASCII source', () => {
    const source = '@startuml\nAlice -> Bob: hello\n@enduml'
    expect(decodeDiagram(encodeDiagram(source))).toBe(source)
  })

  it('round-trips a source with accents', () => {
    const source = '@startuml\ntitle Café à la plage\n@enduml'
    expect(decodeDiagram(encodeDiagram(source))).toBe(source)
  })

  it('throws DiagramDecodeError for an invalid code', () => {
    expect(() => decodeDiagram('this-is-not-a-valid-plantuml-code!!!')).toThrow(
      DiagramDecodeError,
    )
  })

  it('throws DiagramDecodeError for empty input', () => {
    expect(() => decodeDiagram('   ')).toThrow(DiagramDecodeError)
  })

  it('throws DiagramDecodeError for a URL without a diagram code', () => {
    expect(() => decodeDiagram('https://example.com/')).toThrow(DiagramDecodeError)
  })
})

describe('extractDiagramCode', () => {
  it('returns a raw code unchanged', () => {
    expect(extractDiagramCode(`  ${REFERENCE_CODE}  `)).toBe(REFERENCE_CODE)
  })

  it('extracts the code from PlantUML path URLs', () => {
    expect(extractDiagramCode(`https://plantuml.com/png/${REFERENCE_CODE}`)).toBe(
      REFERENCE_CODE,
    )
    expect(extractDiagramCode(`https://plantuml.com/svg/${REFERENCE_CODE}?foo=bar`)).toBe(
      REFERENCE_CODE,
    )
    expect(extractDiagramCode(`/txt/${REFERENCE_CODE}`)).toBe(REFERENCE_CODE)
  })

  it('extracts the code from PlantText query URLs', () => {
    expect(extractDiagramCode(REFERENCE_URL)).toBe(REFERENCE_CODE)
  })

  it('extracts the code from a PlantView /view/ URL', () => {
    expect(extractDiagramCode(`http://localhost:5173/view/${REFERENCE_CODE}?dark=1`)).toBe(
      REFERENCE_CODE,
    )
  })

  it('returns an empty string when a URL carries no code', () => {
    expect(extractDiagramCode('https://example.com/docs')).toBe('')
    expect(extractDiagramCode('')).toBe('')
  })
})

describe('encodeDiagram', () => {
  it('produces a code that decodes back to the source', () => {
    const source = '@startuml\nBob -> Alice: Hello!\n@enduml'
    expect(decodeDiagram(encodeDiagram(source))).toBe(source)
  })

  it('produces a code without URL-unsafe characters', () => {
    const source = '@startuml\nA -> B: /slash + plus\n@enduml'
    expect(encodeDiagram(source)).toMatch(/^[0-9A-Za-z_-]+$/)
  })
})
