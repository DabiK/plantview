import { describe, expect, it } from 'vitest'
import { buildViewUrl } from './urls'

describe('buildViewUrl', () => {
  it('appends the view path to the origin', () => {
    expect(buildViewUrl('abc123', 'https://plantview.app/')).toBe(
      'https://plantview.app/view/abc123',
    )
  })

  it('supports a base-path deployment', () => {
    expect(buildViewUrl('abc123', 'https://example.com/plantview/')).toBe(
      'https://example.com/plantview/view/abc123',
    )
  })

  it('works without a trailing slash', () => {
    expect(buildViewUrl('SoWkIImg', 'http://localhost:5173')).toBe(
      'http://localhost:5173/view/SoWkIImg',
    )
  })
})
