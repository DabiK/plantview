import { describe, expect, it } from 'vitest'
import { encodeDiagram } from './plantuml-encoding'
import { parseDiagramInput } from './parse-diagram-input'

const REFERENCE_CODE = 'SoWkIImgAStDuULroazIqBLJSCp9J4wrKl18pSd9L-JbTKZDIm5A0m00'
const SOURCE = '@startuml\nBob -> Alice: Hello!\n@enduml'

describe('parseDiagramInput', () => {
  it('reports empty input', () => {
    expect(parseDiagramInput('')).toEqual({ kind: 'empty' })
    expect(parseDiagramInput('   \n\t ')).toEqual({ kind: 'empty' })
  })

  it('detects raw PlantUML sources through their @start directive', () => {
    expect(parseDiagramInput(SOURCE)).toEqual({ kind: 'source', source: SOURCE })
    expect(parseDiagramInput('@startmindmap\n* root\n@endmindmap')).toEqual({
      kind: 'source',
      source: '@startmindmap\n* root\n@endmindmap',
    })
    expect(parseDiagramInput(`  ${SOURCE}  `)).toEqual({ kind: 'source', source: SOURCE })
  })

  it('extracts the code from PlantText and PlantUML URLs', () => {
    expect(parseDiagramInput(`https://www.planttext.com/?text=${REFERENCE_CODE}`)).toEqual({
      kind: 'code',
      code: REFERENCE_CODE,
    })
    expect(parseDiagramInput(`https://plantuml.com/png/${REFERENCE_CODE}`)).toEqual({
      kind: 'code',
      code: REFERENCE_CODE,
    })
    expect(parseDiagramInput(`https://plantuml.com/svg/${REFERENCE_CODE}?foo=bar`)).toEqual({
      kind: 'code',
      code: REFERENCE_CODE,
    })
    expect(parseDiagramInput(`/txt/${REFERENCE_CODE}`)).toEqual({
      kind: 'code',
      code: REFERENCE_CODE,
    })
  })

  it('extracts the code from a PlantView /view/ URL with query', () => {
    expect(parseDiagramInput(`http://localhost:5173/view/${REFERENCE_CODE}?dark=1`)).toEqual({
      kind: 'code',
      code: REFERENCE_CODE,
    })
  })

  it('detects an encoded code pasted alone', () => {
    expect(parseDiagramInput(REFERENCE_CODE)).toEqual({ kind: 'code', code: REFERENCE_CODE })
    expect(parseDiagramInput(`  ${REFERENCE_CODE}\n`)).toEqual({
      kind: 'code',
      code: REFERENCE_CODE,
    })
    expect(parseDiagramInput(encodeDiagram('@startuml\nA -> B\n@enduml'))).toEqual({
      kind: 'code',
      code: encodeDiagram('@startuml\nA -> B\n@enduml'),
    })
  })

  it('treats fragments without @start as sources', () => {
    expect(parseDiagramInput('Bob -> Alice: Hello!')).toEqual({
      kind: 'source',
      source: 'Bob -> Alice: Hello!',
    })
    expect(parseDiagramInput('Bob')).toEqual({ kind: 'source', source: 'Bob' })
    // Uses the codec alphabet and is long enough, but cannot be decoded.
    expect(parseDiagramInput('this-is-not-a-valid-plantuml-code')).toEqual({
      kind: 'source',
      source: 'this-is-not-a-valid-plantuml-code',
    })
  })

  it('falls back to source for URLs without a diagram code', () => {
    expect(parseDiagramInput('https://example.com/docs')).toEqual({
      kind: 'source',
      source: 'https://example.com/docs',
    })
  })
})
