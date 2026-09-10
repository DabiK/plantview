import { describe, expect, it } from 'vitest'
import { parseThemeParam, resolveInitialTheme } from './theme'

describe('parseThemeParam', () => {
  it('maps 1 to dark and 0 to light', () => {
    expect(parseThemeParam('1')).toBe('dark')
    expect(parseThemeParam('0')).toBe('light')
  })

  it('ignores other values', () => {
    expect(parseThemeParam('true')).toBeNull()
    expect(parseThemeParam('')).toBeNull()
    expect(parseThemeParam(null)).toBeNull()
  })
})

describe('resolveInitialTheme', () => {
  it('prefers the query parameter over stored and system preferences', () => {
    expect(
      resolveInitialTheme({ queryValue: '1', storedValue: 'light', prefersDark: false }),
    ).toBe('dark')
    expect(
      resolveInitialTheme({ queryValue: '0', storedValue: 'dark', prefersDark: true }),
    ).toBe('light')
  })

  it('uses the stored preference when there is no query parameter', () => {
    expect(resolveInitialTheme({ storedValue: 'dark', prefersDark: false })).toBe('dark')
    expect(resolveInitialTheme({ storedValue: 'light', prefersDark: true })).toBe('light')
  })

  it('falls back to the system color scheme', () => {
    expect(resolveInitialTheme({ prefersDark: true })).toBe('dark')
    expect(resolveInitialTheme({})).toBe('light')
  })

  it('ignores invalid stored values', () => {
    expect(resolveInitialTheme({ storedValue: 'blue', prefersDark: true })).toBe('dark')
  })
})
