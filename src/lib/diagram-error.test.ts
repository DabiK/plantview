import { describe, expect, it } from 'vitest'
import { detectEmbeddedRenderError } from './diagram-error'

/**
 * Fixtures below are trimmed copies of real error SVGs produced by the
 * `@plantuml/core` engine (captured via chrome-devtools), so the detection
 * patterns stay pinned to the actual output.
 */

const SYNTAX_ERROR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 413 118" width="413" height="118"><defs></defs><g><text x="5" y="17" font-size="12" fill="#33FF02" xml:space="preserve" style="white-space: pre" font-weight="bold" font-style="italic" font-family="sans-serif">PlantUML version $version$ / $git.commit.id$ [Unknown compile time]</text><rect x="5" y="27" width="156.81" height="21" fill="#33FF02" stroke="#33FF02" stroke-width="1"></rect><text x="6" y="42" font-size="14" fill="#000000" xml:space="preserve" style="white-space: pre" font-weight="bold" font-family="sans-serif">[From textarea (line 2) ]</text><text x="5" y="78" font-size="14" fill="#33FF02" xml:space="preserve" style="white-space: pre" font-weight="bold" font-family="sans-serif">@startuml</text><text x="5" y="110" font-size="14" fill="#FF0000" xml:space="preserve" style="white-space: pre" font-weight="bold" font-family="sans-serif"> Syntax Error? (Assumed diagram type: sequence)</text></g></svg>`

const EMPTY_DESCRIPTION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 413 118" width="413" height="118"><g><text x="6" y="42" font-size="14" fill="#000000" xml:space="preserve" font-weight="bold" font-family="sans-serif">[From textarea (line 2) ]</text><text x="5" y="110" font-size="14" fill="#FF0000" xml:space="preserve" font-weight="bold" font-family="sans-serif"> Empty description (Assumed diagram type: sequence)</text></g></svg>`

const UNSUPPORTED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 368 192" width="368" height="192"><g><text x="5" y="16" font-size="12" fill="#FFFFFF" xml:space="preserve" font-weight="bold" font-family="sans-serif">Diagram not supported by this release of PlantUML</text><text x="5" y="44" font-size="12" fill="#FFFFFF" xml:space="preserve" font-family="sans-serif">Sorry, but the following directive </text></g></svg>`

const SUCCESS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 54 104" width="54" height="104"><g><g><title>Bob</title></g><text x="12" y="25" font-size="14" fill="#FFFFFF" font-family="sans-serif">Bob</text><text x="12" y="88">Alice</text></g></svg>`

describe('detectEmbeddedRenderError', () => {
  it('detects a syntax error SVG and extracts its line and message', () => {
    expect(detectEmbeddedRenderError(SYNTAX_ERROR_SVG)).toEqual({
      message: 'Syntax Error? (Assumed diagram type: sequence)',
      line: 2,
    })
  })

  it('detects an empty diagram error', () => {
    expect(detectEmbeddedRenderError(EMPTY_DESCRIPTION_SVG)).toEqual({
      message: 'Empty description (Assumed diagram type: sequence)',
      line: 2,
    })
  })

  it('detects an unsupported diagram error without a line number', () => {
    expect(detectEmbeddedRenderError(UNSUPPORTED_SVG)).toEqual({
      message: 'Diagram not supported by this release of PlantUML',
      line: null,
    })
  })

  it('returns null for a successful render', () => {
    expect(detectEmbeddedRenderError(SUCCESS_SVG)).toBeNull()
  })

  it('does not flag diagram text that merely mentions a syntax error', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text>Syntax Error? (Assumed diagram type: sequence)</text></svg>`
    expect(detectEmbeddedRenderError(svg)).toBeNull()
  })
})
