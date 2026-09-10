/** localStorage key holding the locally viewed diagrams. */
export const HISTORY_STORAGE_KEY = 'plantview:history'

/** Maximum number of entries kept; the oldest are dropped first. */
export const HISTORY_LIMIT = 50

/** Length of the code snippet used when no title can be derived. */
export const TITLE_FALLBACK_LENGTH = 12

export interface HistoryEntry {
  code: string
  title: string
  /** Epoch milliseconds of the last time the diagram was opened. */
  viewedAt: number
}

/** Minimal storage surface, so tests can inject a fake localStorage. */
export interface HistoryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultHistoryStorage(): HistoryStorage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
    return null
  }
}

/**
 * Parses a raw history payload. Corrupt JSON or a wrong shape resets to an
 * empty list; malformed entries are dropped and duplicates are collapsed
 * (first occurrence wins, i.e. the most recent one).
 */
export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const entries: HistoryEntry[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue
      const { code, title, viewedAt } = item as {
        code?: unknown
        title?: unknown
        viewedAt?: unknown
      }
      if (typeof code !== 'string' || code.length === 0) continue
      if (typeof title !== 'string') continue
      if (typeof viewedAt !== 'number' || !Number.isFinite(viewedAt)) continue
      if (seen.has(code)) continue
      seen.add(code)
      entries.push({ code, title, viewedAt })
    }
    return entries.slice(0, HISTORY_LIMIT)
  } catch {
    return []
  }
}

/** Reads the stored history, newest first, tolerating unavailable storage. */
export function listHistory(storage: HistoryStorage | null = defaultHistoryStorage()): HistoryEntry[] {
  if (!storage) return []
  try {
    return parseHistory(storage.getItem(HISTORY_STORAGE_KEY))
  } catch {
    return []
  }
}

function writeHistory(entries: HistoryEntry[], storage: HistoryStorage | null): void {
  if (!storage) return
  try {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Quota errors / private mode: history is best-effort, never blocking.
  }
}

/**
 * Records a viewed diagram, newest first. An existing entry with the same
 * code is replaced and moved back to the top; the list is capped at
 * `HISTORY_LIMIT`. Returns the updated list.
 */
export function addToHistory(
  code: string,
  title: string,
  now: number = Date.now(),
  storage: HistoryStorage | null = defaultHistoryStorage(),
): HistoryEntry[] {
  const entry: HistoryEntry = { code, title, viewedAt: now }
  const entries = [entry, ...listHistory(storage).filter((item) => item.code !== code)].slice(
    0,
    HISTORY_LIMIT,
  )
  writeHistory(entries, storage)
  return entries
}

/** Removes one entry, returning the updated list. */
export function removeFromHistory(
  code: string,
  storage: HistoryStorage | null = defaultHistoryStorage(),
): HistoryEntry[] {
  const entries = listHistory(storage).filter((item) => item.code !== code)
  writeHistory(entries, storage)
  return entries
}

/** Drops the whole history (best-effort). */
export function clearHistory(storage: HistoryStorage | null = defaultHistoryStorage()): void {
  if (!storage) return
  try {
    storage.removeItem(HISTORY_STORAGE_KEY)
  } catch {
    // Nothing to do: an unreadable history behaves like an empty one.
  }
}

const TITLE_DIRECTIVE = /^\s*title\b[ \t]*(.*)$/i
const END_TITLE_DIRECTIVE = /^\s*end\s*title\b/i

/**
 * Lines that carry no usable title: directives, comments and pure layout /
 * configuration statements (`skinparam`, `left to right direction`, …).
 */
const TITLE_IGNORED_LINE =
  /^(?:@|!|'|\/'|left\s+to\s+right\s+direction|right\s+to\s+left\s+direction|top\s+to\s+bottom\s+direction|bottom\s+to\s+top\s+direction|skinparam\b|hide\b|show\b|scale\b|autonumber\b|start\b|stop\b|end\b)/i

/**
 * Derives a display title from a diagram source: the `title …` directive
 * (inline or block form), else the first meaningful line, else a truncated
 * code snippet.
 */
export function extractTitle(source: string, code: string): string {
  const lines = source.split(/\r\n|\r|\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const match = TITLE_DIRECTIVE.exec(lines[index])
    if (!match) continue

    const inline = match[1].trim()
    if (inline) return inline

    // Block form: `title` alone, then text until `end title`.
    for (let inner = index + 1; inner < lines.length; inner += 1) {
      const candidate = lines[inner].trim()
      if (!candidate) continue
      if (END_TITLE_DIRECTIVE.test(candidate)) break
      return candidate
    }
    break
  }

  const firstUseful = lines.map((line) => line.trim()).find((line) => line && !TITLE_IGNORED_LINE.test(line))
  if (firstUseful) return firstUseful

  return code.length > TITLE_FALLBACK_LENGTH ? `${code.slice(0, TITLE_FALLBACK_LENGTH)}…` : code
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** Short, English relative timestamp used in the history list. */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp)
  if (diff < MINUTE_MS) return 'just now'
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)} min ago`
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)} h ago`
  if (diff < 7 * DAY_MS) return `${Math.floor(diff / DAY_MS)} d ago`
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
