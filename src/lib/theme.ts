export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'plantview:theme'

/** Maps the `?dark=0|1` query value to a theme; `null` for anything else. */
export function parseThemeParam(value: string | null): Theme | null {
  if (value === '1') return 'dark'
  if (value === '0') return 'light'
  return null
}

export interface InitialThemeInput {
  /** Raw `?dark=` query value, when present. */
  queryValue?: string | null
  /** Raw value read from localStorage. */
  storedValue?: string | null
  /** `prefers-color-scheme: dark` match. */
  prefersDark?: boolean
}

/**
 * Resolves the initial theme: `?dark=0|1` wins, then the stored preference,
 * then the system color scheme.
 */
export function resolveInitialTheme({
  queryValue = null,
  storedValue = null,
  prefersDark = false,
}: InitialThemeInput = {}): Theme {
  return (
    parseThemeParam(queryValue) ??
    (storedValue === 'dark' || storedValue === 'light' ? storedValue : null) ??
    (prefersDark ? 'dark' : 'light')
  )
}

/** Reads the stored theme preference, tolerating unavailable localStorage. */
export function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

/** Persists the theme preference, tolerating unavailable localStorage. */
export function storeTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable (private mode); the UI still works.
  }
}

/** Whether the system color scheme prefers dark, when observable. */
export function prefersDarkScheme(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Applies the theme to the document root (class, data attribute, color-scheme). */
export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.style.colorScheme = theme
}
