import { describe, expect, it } from 'vitest'
import {
  buildDefaultStyleBlock,
  injectDefaultStyle,
  mapInjectedLineToSourceLine,
} from './default-style'

const USER_SOURCE = `@startuml
class Diagram
@enduml`

/** 1-based line of `needle` in `text`. */
function lineOf(text: string, needle: string): number {
  return text.split('\n').findIndex((line) => line.includes(needle)) + 1
}

describe('buildDefaultStyleBlock', () => {
  it('produces a light and a dark variant', () => {
    const light = buildDefaultStyleBlock({ dark: false })
    const dark = buildDefaultStyleBlock({ dark: true })

    expect(light).toContain('BackgroundColor #FFFFFF')
    expect(dark).toContain('BackgroundColor #020617')
    expect(light).not.toBe(dark)
  })

  it('styles nodes, edges and text with a system font stack', () => {
    const block = buildDefaultStyleBlock()

    for (const selector of ['class', 'component', 'usecase', 'participant', 'actor', 'note']) {
      expect(block).toContain(`${selector} {`)
    }
    expect(block).toContain('arrow {')
    expect(block).toContain('FontName "ui-sans-serif, system-ui')
    expect(block).toContain('skinparam StateBackgroundColor')
  })
})

describe('injectDefaultStyle', () => {
  it('inserts the block right after the @startuml line', () => {
    const { source, lineOffset } = injectDefaultStyle(USER_SOURCE)

    const lines = source.split('\n')
    expect(lines[0]).toBe('@startuml')
    expect(lines[1]).toBe('<style>')
    expect(lineOf(source, 'class Diagram')).toBe(2 + lineOffset)
    expect(source.endsWith('@enduml')).toBe(true)
    expect(source).toContain('@startuml')
  })

  it('supports other @start directives', () => {
    const { source } = injectDefaultStyle('@startmindmap\n* Root\n@endmindmap')
    expect(source.startsWith('@startmindmap\n<style>')).toBe(true)
    expect(source.endsWith('@endmindmap')).toBe(true)
  })

  it('prepends the block when there is no @start directive', () => {
    const { source, lineOffset } = injectDefaultStyle('class A\nclass B')

    expect(source.startsWith('<style>')).toBe(true)
    expect(lineOf(source, 'class A')).toBe(lineOffset + 1)
    expect(lineOffset).toBe(buildDefaultStyleBlock().split('\n').length)
  })

  it('keeps user style and skinparam content after the injected block', () => {
    const userStyle = `@startuml
<style>
root {
  BackgroundColor #FF00FF
}
</style>
skinparam ArrowColor #00FF00
class A
@enduml`
    const { source } = injectDefaultStyle(userStyle)

    expect(source.indexOf('BackgroundColor #FF00FF')).toBeGreaterThan(source.indexOf('BackgroundColor #FFFFFF'))
    expect(source.indexOf('skinparam ArrowColor #00FF00')).toBeGreaterThan(
      source.indexOf('skinparam SequenceLifeLineBorderColor'),
    )
  })

  it('preserves the directive line ending style', () => {
    const { source } = injectDefaultStyle('@startuml\r\nclass A\r\n@enduml')

    expect(source.startsWith('@startuml\r\n<style>')).toBe(true)
    expect(source.endsWith('@enduml')).toBe(true)
  })

  it('does not alter the user content itself', () => {
    const { source } = injectDefaultStyle(USER_SOURCE)

    // Removing the injected block must give the original source back.
    const block = buildDefaultStyleBlock()
    expect(source.replace(`${block}\n`, '')).toBe(USER_SOURCE)
  })

  it('offers the same offset for both source shapes', () => {
    expect(injectDefaultStyle(USER_SOURCE).lineOffset).toBe(
      injectDefaultStyle('class A').lineOffset,
    )
  })

  it('leaves an empty diagram body untouched so the engine still errors', () => {
    expect(injectDefaultStyle('@startuml\n@enduml')).toEqual({
      source: '@startuml\n@enduml',
      lineOffset: 0,
    })
    expect(injectDefaultStyle('   \n  ')).toEqual({ source: '   \n  ', lineOffset: 0 })
    expect(injectDefaultStyle("@startuml\n' just a comment\n@enduml").lineOffset).toBe(0)
  })
})

describe('mapInjectedLineToSourceLine', () => {
  it('subtracts the injected offset', () => {
    expect(mapInjectedLineToSourceLine(42, 40)).toBe(2)
  })

  it('returns null for lines inside the injected block', () => {
    expect(mapInjectedLineToSourceLine(40, 40)).toBeNull()
    expect(mapInjectedLineToSourceLine(3, 40)).toBeNull()
  })

  it('passes null through', () => {
    expect(mapInjectedLineToSourceLine(null, 40)).toBeNull()
  })
})
