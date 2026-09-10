import { describe, expect, it } from 'vitest'
import { getSvgDimensions, withExplicitSvgSize } from './export'

describe('getSvgDimensions', () => {
  it('reads width and height attributes with px units', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="240px" height="120px" viewBox="0 0 240 120"><title>Bob</title></svg>'
    expect(getSvgDimensions(svg)).toEqual({ width: 240, height: 120 })
  })

  it('falls back to the viewBox when width/height are missing', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><g/></svg>'
    expect(getSvgDimensions(svg)).toEqual({ width: 320, height: 180 })
  })

  it('does not confuse stroke-width with width', () => {
    const svg = '<svg stroke-width="2" width="50" height="40"><g/></svg>'
    expect(getSvgDimensions(svg)).toEqual({ width: 50, height: 40 })
  })

  it('returns null when no size can be determined', () => {
    expect(getSvgDimensions('<div>not an svg</div>')).toBeNull()
    expect(getSvgDimensions('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBeNull()
  })
})

describe('withExplicitSvgSize', () => {
  it('adds width and height derived from the viewBox', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150"><g/></svg>'
    expect(withExplicitSvgSize(svg)).toContain('<svg width="300" height="150"')
  })

  it('replaces existing dimensions with the resolved size', () => {
    const svg = '<svg width="10px" height="20px" viewBox="0 0 10 20"><g/></svg>'
    const result = withExplicitSvgSize(svg)
    expect(result).not.toContain('width="10px"')
    expect(result).toContain('width="10"')
    expect(result).toContain('height="20"')
  })

  it('leaves non-SVG input untouched', () => {
    expect(withExplicitSvgSize('hello')).toBe('hello')
  })
})
