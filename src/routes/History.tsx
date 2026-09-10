import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Clock, Code, Copy, History as HistoryIcon, Moon, Sun, Trash2 } from 'lucide-react'
import { Toast } from '../components/Toast'
import { ToolbarButton } from '../components/Toolbar'
import { copyText } from '../lib/clipboard'
import {
  clearHistory,
  formatRelativeTime,
  listHistory,
  removeFromHistory,
  type HistoryEntry,
} from '../lib/history'
import {
  applyThemeToDocument,
  prefersDarkScheme,
  readStoredTheme,
  resolveInitialTheme,
  storeTheme,
  type Theme,
} from '../lib/theme'
import { buildViewUrl } from '../lib/urls'

const MESSAGE_TIMEOUT_MS = 2500
const CODE_PREVIEW_LENGTH = 16

function truncateCode(code: string): string {
  return code.length > CODE_PREVIEW_LENGTH ? `${code.slice(0, CODE_PREVIEW_LENGTH)}…` : code
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Clock className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
        No diagrams yet
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Open a PlantView link or pick a diagram from the gallery — it will show up here.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Go to the gallery
        </Link>
        <Link
          to="/edit"
          className="rounded-xl px-3 py-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Open the editor
        </Link>
      </div>
    </div>
  )
}

/**
 * Local history of opened diagrams: stored in localStorage only, with
 * open / copy / remove / clear actions.
 */
export default function History() {
  const [searchParams] = useSearchParams()
  const [entries, setEntries] = useState<HistoryEntry[]>(() => listHistory())
  const [theme, setTheme] = useState<Theme>(() =>
    resolveInitialTheme({
      queryValue: searchParams.get('dark'),
      storedValue: readStoredTheme(),
      prefersDark: prefersDarkScheme(),
    }),
  )
  const [message, setMessage] = useState<string | null>(null)
  const messageTimer = useRef<number | null>(null)

  const showMessage = useCallback((text: string) => {
    setMessage(text)
    if (messageTimer.current !== null) {
      window.clearTimeout(messageTimer.current)
    }
    messageTimer.current = window.setTimeout(() => setMessage(null), MESSAGE_TIMEOUT_MS)
  }, [])

  useEffect(
    () => () => {
      if (messageTimer.current !== null) {
        window.clearTimeout(messageTimer.current)
      }
    },
    [],
  )

  useEffect(() => {
    applyThemeToDocument(theme)
    storeTheme(theme)
  }, [theme])

  const handleToggleDark = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const handleCopy = useCallback(
    async (code: string) => {
      const url = buildViewUrl(code, `${window.location.origin}${import.meta.env.BASE_URL}`)
      try {
        await copyText(url)
        showMessage('Link copied')
      } catch {
        showMessage('Unable to copy the link')
      }
    },
    [showMessage],
  )

  const handleRemove = useCallback((code: string) => {
    setEntries(removeFromHistory(code))
  }, [])

  const handleClear = useCallback(() => {
    clearHistory()
    setEntries([])
    showMessage('History cleared')
  }, [showMessage])

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center gap-3 py-5">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-slate-100"
          >
            <Code className="size-4 text-indigo-500" aria-hidden="true" />
            PlantView
          </Link>
          <span aria-hidden="true" className="hidden text-slate-300 sm:inline dark:text-slate-600">
            /
          </span>
          <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">History</span>

          <nav className="ml-auto flex items-center gap-1">
            <Link
              to="/"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Home
            </Link>
            <Link
              to="/edit"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Editor
            </Link>
            <ToolbarButton
              label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={handleToggleDark}
              pressed={theme === 'dark'}
            >
              {theme === 'dark' ? (
                <Sun className="size-4" aria-hidden="true" />
              ) : (
                <Moon className="size-4" aria-hidden="true" />
              )}
            </ToolbarButton>
          </nav>
        </header>

        <section className="py-6 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                History
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Diagrams you opened in this browser. Stored locally, never sent anywhere.
              </p>
            </div>
            {entries.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-rose-300 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-rose-900 dark:hover:text-rose-400"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Clear all
              </button>
            ) : null}
          </div>

          {entries.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="mt-8 space-y-3">
              {entries.map((entry) => (
                <li
                  key={entry.code}
                  className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-800"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                    >
                      <HistoryIcon className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/view/${entry.code}`}
                        title={entry.title}
                        className="block truncate text-sm font-semibold text-slate-900 transition hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-slate-100 dark:hover:text-indigo-400"
                      >
                        {entry.title}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatRelativeTime(entry.viewedAt)}</span>
                        <span aria-hidden="true">·</span>
                        <code className="font-mono" title={entry.code}>
                          {truncateCode(entry.code)}
                        </code>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <ToolbarButton
                        label={`Copy link for ${entry.title}`}
                        onClick={() => void handleCopy(entry.code)}
                      >
                        <Copy className="size-4" aria-hidden="true" />
                      </ToolbarButton>
                      <ToolbarButton
                        label={`Remove ${entry.title} from history`}
                        onClick={() => handleRemove(entry.code)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </ToolbarButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-auto flex flex-col gap-2 border-t border-slate-200/80 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:text-slate-400">
          <p>History lives only in this browser&apos;s localStorage.</p>
          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className="transition hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-white"
            >
              Home
            </Link>
            <Link
              to="/edit"
              className="transition hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-white"
            >
              Editor
            </Link>
          </nav>
        </footer>
      </div>

      <Toast
        message={message}
        className="pointer-events-none fixed inset-x-0 bottom-4 z-30 mx-auto w-fit"
      />
    </main>
  )
}
