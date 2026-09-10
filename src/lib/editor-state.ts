import { DiagramDecodeError, decodeDiagram } from './plantuml-encoding'

/** localStorage key holding the editor autosave draft. */
export const DRAFT_STORAGE_KEY = 'plantview:draft'

export interface DiagramDraft {
  source: string
  updatedAt: number
}

/** Minimal storage surface, so tests can inject a fake localStorage. */
export interface DraftStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultDraftStorage(): DraftStorage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
    return null
  }
}

/** Parses a raw draft payload, returning `null` for anything malformed. */
export function parseDraft(raw: string | null): DiagramDraft | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { source, updatedAt } = parsed as { source?: unknown; updatedAt?: unknown }
    if (
      typeof source !== 'string' ||
      typeof updatedAt !== 'number' ||
      !Number.isFinite(updatedAt)
    ) {
      return null
    }
    return { source, updatedAt }
  } catch {
    return null
  }
}

/** Reads the autosaved draft, tolerating unavailable or corrupt storage. */
export function readDraft(storage: DraftStorage | null = defaultDraftStorage()): DiagramDraft | null {
  if (!storage) return null
  try {
    return parseDraft(storage.getItem(DRAFT_STORAGE_KEY))
  } catch {
    return null
  }
}

/**
 * Persists the draft (best-effort: quota errors and unavailable storage are
 * silently ignored) and returns the stored payload.
 */
export function writeDraft(
  source: string,
  now: number = Date.now(),
  storage: DraftStorage | null = defaultDraftStorage(),
): DiagramDraft {
  const draft = { source, updatedAt: now }
  if (storage) {
    try {
      storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // Autosave must never break the editor.
    }
  }
  return draft
}

export type EditorSourceOrigin = 'url' | 'draft' | 'example'

export interface EditorInitialState {
  source: string
  origin: EditorSourceOrigin
  /** Set when a `:code` URL param was present but could not be decoded. */
  codeError: string | null
}

export interface ResolveEditorInput {
  /** Raw `:code` route param, when present. */
  code?: string | null
  draft?: DiagramDraft | null
  /** Source used when neither the URL nor a draft provides one. */
  fallback: string
}

/**
 * Resolves what the editor should show on load: the diagram code from the
 * URL wins, then the local draft, then the fallback example.
 */
export function resolveInitialEditorState({
  code = null,
  draft = null,
  fallback,
}: ResolveEditorInput): EditorInitialState {
  let codeError: string | null = null

  if (code) {
    try {
      return { source: decodeDiagram(code), origin: 'url', codeError: null }
    } catch (error) {
      codeError =
        error instanceof DiagramDecodeError ? error.message : 'This diagram code is invalid.'
    }
  }

  if (draft) {
    return { source: draft.source, origin: 'draft', codeError }
  }

  return { source: fallback, origin: 'example', codeError }
}
