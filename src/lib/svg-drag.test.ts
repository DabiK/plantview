import { describe, expect, it } from 'vitest'
import {
  distanceToBox,
  formatCoordinate,
  getPathEnd,
  getPathStart,
  parsePolygonPoints,
  supportsNodeDragging,
  tracePath,
  translatePathEnd,
  translatePathStart,
  translatePolygonPoints,
} from './svg-drag'

describe('supportsNodeDragging', () => {
  it('detects PlantUML entity groups', () => {
    const svg = '<svg><g id="ent0001" class="entity"><rect/></g><g class="link"/></svg>'
    expect(supportsNodeDragging(svg)).toBe(true)
  })

  it('accepts multi-class attributes containing entity', () => {
    expect(supportsNodeDragging('<svg><g class="foo entity bar"/></svg>')).toBe(true)
  })

  it('ignores start_entity / end_entity pseudo-states', () => {
    const svg = '<svg><g class="start_entity"/><g class="end_entity"/></svg>'
    expect(supportsNodeDragging(svg)).toBe(false)
  })

  it('returns false for sequence-like SVGs without entity groups', () => {
    const svg = '<svg><g><rect/><line/></g><text>Alice</text></svg>'
    expect(supportsNodeDragging(svg)).toBe(false)
  })
})

describe('tracePath / endpoints', () => {
  it('reads the first and last point of an absolute cubic path', () => {
    const d = 'M10,20 C11,21 12,22 13,23'
    expect(getPathStart(d)).toEqual({ x: 10, y: 20 })
    expect(getPathEnd(d)).toEqual({ x: 13, y: 23 })
  })

  it('resolves relative commands', () => {
    const d = 'm10 20 l5 5 c1 0 2 0 3 0'
    expect(tracePath(d)).toEqual({ start: { x: 10, y: 20 }, end: { x: 18, y: 25 } })
  })

  it('resolves H/V and Z commands', () => {
    const d = 'M5,5 H15 V25 Z'
    expect(tracePath(d)).toEqual({ start: { x: 5, y: 5 }, end: { x: 15, y: 25 } })
  })

  it('handles multiple coordinate pairs after a moveto', () => {
    const d = 'M0,0 10,0 10,10'
    expect(tracePath(d)).toEqual({ start: { x: 0, y: 0 }, end: { x: 10, y: 10 } })
  })

  it('returns null endpoints for malformed paths', () => {
    expect(tracePath('not-a-path')).toEqual({ start: null, end: null })
    expect(getPathStart('M1,2 Lx,y')).toBeNull()
  })
})

describe('translatePathStart', () => {
  it('moves the first point and keeps the rest of the geometry', () => {
    const moved = translatePathStart('M10,20 C11,21 12,22 13,23', 5, -5)
    expect(moved).toBe('M15 15 C11 21 12 22 13 23')
    expect(getPathStart(moved)).toEqual({ x: 15, y: 15 })
    expect(getPathEnd(moved)).toEqual({ x: 13, y: 23 })
  })

  it('leaves relative starts and malformed paths unchanged', () => {
    expect(translatePathStart('m10 20 l5 5', 5, 5)).toBe('m10 20 l5 5')
    expect(translatePathStart('broken', 5, 5)).toBe('broken')
  })
})

describe('translatePathEnd', () => {
  it('moves the last point of a cubic path', () => {
    const moved = translatePathEnd('M10,20 C11,21 12,22 13,23', -3, 4)
    expect(moved).toBe('M10 20 C11 21 12 22 10 27')
    expect(getPathEnd(moved)).toEqual({ x: 10, y: 27 })
  })

  it('ignores a trailing Z', () => {
    const moved = translatePathEnd('M0,0 L10,0 L10,10 Z', 2, 3)
    expect(getPathEnd(moved)).toEqual({ x: 12, y: 13 })
  })

  it('supports H and V commands', () => {
    expect(getPathEnd(translatePathEnd('M0,0 L10,0 H20', 5, 5))).toEqual({ x: 25, y: 0 })
    expect(getPathEnd(translatePathEnd('M0,0 L10,0 V20', 5, 5))).toEqual({ x: 10, y: 25 })
  })

  it('supports relative end segments', () => {
    const moved = translatePathEnd('M0,0 l10 0', 4, 6)
    expect(getPathEnd(moved)).toEqual({ x: 14, y: 6 })
  })

  it('leaves malformed paths unchanged', () => {
    expect(translatePathEnd('M0,0 L', 5, 5)).toBe('M0,0 L')
    expect(translatePathEnd('Z', 5, 5)).toBe('Z')
  })
})

describe('polygon points', () => {
  it('translates every point and preserves the pair format', () => {
    const moved = translatePolygonPoints('94.39,163.74 94.65,153.89', 1, -2)
    expect(moved).toBe('95.39,161.74 95.65,151.89')
  })

  it('parses points and rejects malformed input', () => {
    expect(parsePolygonPoints('1,2 3,4')).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ])
    expect(parsePolygonPoints('1,2 nope')).toEqual([])
    expect(translatePolygonPoints('nope', 1, 2)).toBe('nope')
  })
})

describe('distanceToBox', () => {
  const box = { x: 10, y: 10, width: 20, height: 20 }

  it('is zero inside the box', () => {
    expect(distanceToBox({ x: 20, y: 20 }, box)).toBe(0)
    expect(distanceToBox({ x: 10, y: 10 }, box)).toBe(0)
    expect(distanceToBox({ x: 30, y: 30 }, box)).toBe(0)
  })

  it('measures the Euclidean gap outside', () => {
    expect(distanceToBox({ x: 13, y: 8 }, box)).toBe(2)
    expect(distanceToBox({ x: 34, y: 34 }, box)).toBeCloseTo(Math.hypot(4, 4))
  })
})

describe('formatCoordinate', () => {
  it('rounds to 4 decimals and trims trailing zeros', () => {
    expect(formatCoordinate(0.1 + 0.2)).toBe('0.3')
    expect(formatCoordinate(12)).toBe('12')
    expect(formatCoordinate(1.00004)).toBe('1')
    expect(formatCoordinate(-3.14159)).toBe('-3.1416')
  })
})
