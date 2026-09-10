import { describe, expect, it } from 'vitest'
import {
  DRAFT_STORAGE_KEY,
  parseDraft,
  readDraft,
  resolveInitialEditorState,
  writeDraft,
  type DraftStorage,
} from './editor-state'
import { encodeDiagram } from './plantuml-encoding'

function createFakeStorage(initial: Record<string, string> = {}): DraftStorage & { values: Record<string, string> } {
  const values = { ...initial }
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value
    },
  }
}

describe('parseDraft', () => {
  it('parses a valid payload', () => {
    expect(parseDraft('{"source":"@startuml\\n@enduml","updatedAt":42}')).toEqual({
      source: '@startuml\n@enduml',
      updatedAt: 42,
    })
  })

  it('returns null for missing, corrupt or wrongly typed payloads', () => {
    expect(parseDraft(null)).toBeNull()
    expect(parseDraft('')).toBeNull()
    expect(parseDraft('not json')).toBeNull()
    expect(parseDraft('[]')).toBeNull()
    expect(parseDraft('{"source":3,"updatedAt":42}')).toBeNull()
    expect(parseDraft('{"source":"x","updatedAt":"now"}')).toBeNull()
    expect(parseDraft('{"source":"x","updatedAt":null}')).toBeNull()
  })
})

describe('readDraft / writeDraft', () => {
  it('round-trips through storage', () => {
    const storage = createFakeStorage()
    writeDraft('@startuml\nA -> B\n@enduml', 1234, storage)

    expect(storage.values[DRAFT_STORAGE_KEY]).toBeDefined()
    expect(readDraft(storage)).toEqual({
      source: '@startuml\nA -> B\n@enduml',
      updatedAt: 1234,
    })
  })

  it('resets safely on corrupt storage content', () => {
    const storage = createFakeStorage({ [DRAFT_STORAGE_KEY]: '{broken' })
    expect(readDraft(storage)).toBeNull()
  })

  it('never throws when storage is unavailable or full', () => {
    expect(readDraft(null)).toBeNull()

    const throwing: DraftStorage = {
      getItem: () => {
        throw new Error('nope')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(readDraft(throwing)).toBeNull()
    expect(writeDraft('x', 1, throwing)).toEqual({ source: 'x', updatedAt: 1 })
  })
})

describe('resolveInitialEditorState', () => {
  const fallback = '@startuml\nfallback\n@enduml'
  const draft = { source: '@startuml\ndraft\n@enduml', updatedAt: 1 }

  it('prefers the decoded URL code over the draft and the fallback', () => {
    const code = encodeDiagram('@startuml\nURL\n@enduml')
    expect(resolveInitialEditorState({ code, draft, fallback })).toEqual({
      source: '@startuml\nURL\n@enduml',
      origin: 'url',
      codeError: null,
    })
  })

  it('uses the draft when there is no URL code', () => {
    expect(resolveInitialEditorState({ code: null, draft, fallback })).toEqual({
      source: draft.source,
      origin: 'draft',
      codeError: null,
    })
  })

  it('falls back to the example when there is neither URL code nor draft', () => {
    expect(resolveInitialEditorState({ fallback })).toEqual({
      source: fallback,
      origin: 'example',
      codeError: null,
    })
  })

  it('falls back to the draft and reports the error for an invalid URL code', () => {
    const state = resolveInitialEditorState({ code: 'not-a-valid-code', draft, fallback })
    expect(state.origin).toBe('draft')
    expect(state.source).toBe(draft.source)
    expect(state.codeError).toBeTruthy()
  })

  it('falls back to the example for an invalid URL code without a draft', () => {
    const state = resolveInitialEditorState({ code: 'not-a-valid-code', fallback })
    expect(state.origin).toBe('example')
    expect(state.source).toBe(fallback)
    expect(state.codeError).toBeTruthy()
  })
})
