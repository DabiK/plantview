import { describe, expect, it } from 'vitest'
import {
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  addToHistory,
  clearHistory,
  extractTitle,
  formatRelativeTime,
  listHistory,
  parseHistory,
  removeFromHistory,
  TITLE_FALLBACK_LENGTH,
  type HistoryStorage,
} from './history'

function createFakeStorage(
  initial: Record<string, string> = {},
): HistoryStorage & { values: Record<string, string> } {
  const values = { ...initial }
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value
    },
    removeItem: (key) => {
      delete values[key]
    },
  }
}

const ENTRY = { code: 'SoWkIImgAStDuULroaz', title: 'Bob -> Alice', viewedAt: 1000 }

describe('parseHistory', () => {
  it('parses a valid payload', () => {
    expect(parseHistory(JSON.stringify([ENTRY]))).toEqual([ENTRY])
  })

  it('returns an empty list for missing, corrupt or wrongly shaped payloads', () => {
    expect(parseHistory(null)).toEqual([])
    expect(parseHistory('')).toEqual([])
    expect(parseHistory('{broken')).toEqual([])
    expect(parseHistory('{"code":"x"}')).toEqual([])
  })

  it('drops malformed entries', () => {
    const raw = JSON.stringify([
      ENTRY,
      null,
      'nope',
      { code: '', title: 'empty code', viewedAt: 1 },
      { code: 'a', title: 42, viewedAt: 1 },
      { code: 'b', title: 'bad date', viewedAt: 'yesterday' },
      { code: 'c', title: 'infinite date', viewedAt: Number.POSITIVE_INFINITY },
    ])
    expect(parseHistory(raw)).toEqual([ENTRY])
  })

  it('collapses duplicates, keeping the first (most recent) occurrence', () => {
    const raw = JSON.stringify([
      { ...ENTRY, viewedAt: 2000 },
      { ...ENTRY, title: 'old', viewedAt: 1000 },
    ])
    expect(parseHistory(raw)).toEqual([{ ...ENTRY, viewedAt: 2000 }])
  })

  it('never exceeds the history limit', () => {
    const raw = JSON.stringify(
      Array.from({ length: HISTORY_LIMIT + 10 }, (_, index) => ({
        code: `code-${index}`,
        title: `Diagram ${index}`,
        viewedAt: index,
      })),
    )
    expect(parseHistory(raw)).toHaveLength(HISTORY_LIMIT)
    expect(parseHistory(raw)[0]).toMatchObject({ code: 'code-0' })
  })
})

describe('listHistory', () => {
  it('reads stored entries, newest first', () => {
    const storage = createFakeStorage({ [HISTORY_STORAGE_KEY]: JSON.stringify([ENTRY]) })
    expect(listHistory(storage)).toEqual([ENTRY])
  })

  it('returns an empty list without storage or with a throwing storage', () => {
    expect(listHistory(null)).toEqual([])

    const throwing: HistoryStorage = {
      getItem: () => {
        throw new Error('nope')
      },
      setItem: () => {},
      removeItem: () => {},
    }
    expect(listHistory(throwing)).toEqual([])
  })
})

describe('addToHistory', () => {
  it('prepends the new entry (newest first)', () => {
    const storage = createFakeStorage()
    addToHistory('aaa', 'First', 1000, storage)
    addToHistory('bbb', 'Second', 2000, storage)

    expect(listHistory(storage).map((entry) => entry.code)).toEqual(['bbb', 'aaa'])
  })

  it('deduplicates by code and moves the re-opened diagram back to the top', () => {
    const storage = createFakeStorage()
    addToHistory('aaa', 'First', 1000, storage)
    addToHistory('bbb', 'Second', 2000, storage)
    addToHistory('ccc', 'Third', 3000, storage)
    addToHistory('aaa', 'First again', 4000, storage)

    expect(listHistory(storage)).toEqual([
      { code: 'aaa', title: 'First again', viewedAt: 4000 },
      { code: 'ccc', title: 'Third', viewedAt: 3000 },
      { code: 'bbb', title: 'Second', viewedAt: 2000 },
    ])
  })

  it('caps the list at the limit, dropping the oldest entries', () => {
    const storage = createFakeStorage()
    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
      addToHistory(`code-${index}`, `Diagram ${index}`, index, storage)
    }

    const entries = listHistory(storage)
    expect(entries).toHaveLength(HISTORY_LIMIT)
    expect(entries[0]?.code).toBe(`code-${HISTORY_LIMIT + 4}`)
    expect(entries.at(-1)?.code).toBe('code-5')
  })

  it('never throws when storage is unavailable or full', () => {
    expect(addToHistory('aaa', 'First', 1000, null)).toEqual([
      { code: 'aaa', title: 'First', viewedAt: 1000 },
    ])

    const throwing: HistoryStorage = {
      getItem: () => {
        throw new Error('nope')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {
        throw new Error('quota')
      },
    }
    expect(addToHistory('aaa', 'First', 1000, throwing)).toHaveLength(1)
  })
})

describe('removeFromHistory / clearHistory', () => {
  it('removes a single entry', () => {
    const storage = createFakeStorage()
    addToHistory('aaa', 'First', 1000, storage)
    addToHistory('bbb', 'Second', 2000, storage)

    expect(removeFromHistory('aaa', storage)).toEqual([
      { code: 'bbb', title: 'Second', viewedAt: 2000 },
    ])
    expect(listHistory(storage)).toHaveLength(1)
  })

  it('clears everything, tolerating unavailable storage', () => {
    const storage = createFakeStorage()
    addToHistory('aaa', 'First', 1000, storage)
    clearHistory(storage)

    expect(storage.values[HISTORY_STORAGE_KEY]).toBeUndefined()
    expect(listHistory(storage)).toEqual([])
    expect(() => clearHistory(null)).not.toThrow()
  })
})

describe('extractTitle', () => {
  const code = 'SoWkIImgAStDuULroazIqBLJSCp9J4wrKl18pSd9L'

  it('reads an inline `title` directive', () => {
    expect(extractTitle('@startuml\ntitle Login flow\nBob -> Alice\n@enduml', code)).toBe(
      'Login flow',
    )
  })

  it('reads the directive case-insensitively', () => {
    expect(extractTitle('@startuml\nTITLE My diagram\n@enduml', code)).toBe('My diagram')
  })

  it('reads the block form of the directive', () => {
    expect(extractTitle('@startuml\ntitle\nBlock title\nend title\n@enduml', code)).toBe(
      'Block title',
    )
  })

  it('falls back to the first meaningful line', () => {
    expect(extractTitle("@startuml\n' a comment\nBob -> Alice: Hello!\n@enduml", code)).toBe(
      'Bob -> Alice: Hello!',
    )
  })

  it('skips layout and configuration lines', () => {
    expect(
      extractTitle('@startuml\nleft to right direction\nskinparam shadowing false\nactor User\n@enduml', code),
    ).toBe('actor User')
  })

  it('handles CRLF sources', () => {
    expect(extractTitle('@startuml\r\ntitle Windows\r\n@enduml', code)).toBe('Windows')
  })

  it('falls back to a truncated code when the source has no content', () => {
    expect(extractTitle('@startuml\n@enduml', code)).toBe(`${code.slice(0, TITLE_FALLBACK_LENGTH)}…`)
    expect(extractTitle('', '')).toBe('')
  })

  it('keeps short codes intact', () => {
    expect(extractTitle('@startuml\n@enduml', 'short')).toBe('short')
  })
})

describe('formatRelativeTime', () => {
  const now = 1_000_000_000_000

  it('formats recent and old timestamps', () => {
    expect(formatRelativeTime(now, now)).toBe('just now')
    expect(formatRelativeTime(now + 5_000, now)).toBe('just now')
    expect(formatRelativeTime(now - 30_000, now)).toBe('just now')
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5 min ago')
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe('3 h ago')
    expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe('2 d ago')
    expect(formatRelativeTime(now - 30 * 86_400_000, now)).toMatch(/^\w{3} \d{1,2}, \d{4}$/)
  })
})
