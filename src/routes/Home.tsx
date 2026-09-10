import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Code,
  Component,
  GitBranch,
  MessagesSquare,
  Moon,
  Sparkles,
  Sun,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { ToolbarButton } from '../components/Toolbar'
import { diagramExamples, type DiagramExample } from '../lib/examples'
import { encodeDiagram } from '../lib/plantuml-encoding'
import { parseDiagramInput } from '../lib/parse-diagram-input'
import {
  applyThemeToDocument,
  prefersDarkScheme,
  readStoredTheme,
  resolveInitialTheme,
  storeTheme,
  type Theme,
} from '../lib/theme'
import { buildViewUrl } from '../lib/urls'

const EXAMPLE_ICONS: Record<string, LucideIcon> = {
  sequence: MessagesSquare,
  class: Boxes,
  activity: GitBranch,
  usecase: Users,
}

const DEFAULT_EXAMPLE_ICON = Component

const REFERENCE_SOURCE = '@startuml\nBob -> Alice: Hello!\n@enduml'
const REFERENCE_CODE = encodeDiagram(REFERENCE_SOURCE)

interface ExampleLink extends DiagramExample {
  code: string
}

/** Diagram codes are static, so they are computed once at module load. */
const EXAMPLE_LINKS: ExampleLink[] = diagramExamples.map((example) => ({
  ...example,
  code: encodeDiagram(example.source),
}))

/**
 * Landing page: paste a diagram or a link to open the viewer, browse the
 * example gallery, and find the URL/codec notes for agents.
 */
export default function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(() =>
    resolveInitialTheme({
      queryValue: searchParams.get('dark'),
      storedValue: readStoredTheme(),
      prefersDark: prefersDarkScheme(),
    }),
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    applyThemeToDocument(theme)
    storeTheme(theme)
  }, [theme])

  const baseUrl = useMemo(
    () => `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/+$/, ''),
    [],
  )
  const referenceUrl = useMemo(() => buildViewUrl(REFERENCE_CODE, baseUrl), [baseUrl])

  const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
    setError(null)
  }, [])

  const handleSubmit = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      const parsed = parseDiagramInput(input)

      if (parsed.kind === 'empty') {
        setError('Paste a PlantUML diagram, an encoded code or a link first.')
        textareaRef.current?.focus()
        return
      }

      setError(null)
      const code = parsed.kind === 'source' ? encodeDiagram(parsed.source) : parsed.code
      navigate(`/view/${encodeURIComponent(code)}`)
    },
    [input, navigate],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const handleToggleDark = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] overflow-hidden"
      >
        <div className="diagram-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -top-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center gap-3 py-5">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-slate-100"
          >
            <Code className="size-4 text-indigo-500" aria-hidden="true" />
            PlantView
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            <Link
              to="/history"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              History
            </Link>
            <Link
              to="/edit"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Editor
            </Link>
            <a
              href="#agents"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:inline-flex dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              For agents
            </a>
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

        <section className="grid gap-10 py-8 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Sparkles className="size-3.5" aria-hidden="true" />
              100% client-side · no server, no Java
            </p>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-slate-900 sm:text-5xl dark:text-slate-50">
              PlantUML diagrams,{' '}
              <span className="text-indigo-600 dark:text-indigo-400">one link away.</span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Paste PlantUML source, an encoded code or a PlantText/PlantUML URL. PlantView
              renders the diagram locally in your browser and gives you a link anyone can open.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#examples"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-white"
              >
                Browse examples
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <Link
                to="/edit"
                className="rounded-xl px-3 py-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Open the editor
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-6 dark:border-slate-700/70 dark:bg-slate-900/70 dark:shadow-black/20"
          >
            <label
              htmlFor="diagram-input"
              className="text-sm font-medium text-slate-900 dark:text-slate-100"
            >
              Diagram source or link
            </label>
            <textarea
              id="diagram-input"
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={6}
              spellCheck={false}
              aria-describedby="diagram-input-hint"
              aria-invalid={error ? true : undefined}
              placeholder={'@startuml\nBob -> Alice: Hello!\n@enduml'}
              className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/80 p-4 font-mono text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-600"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p
                id="diagram-input-hint"
                className="text-xs text-slate-500 dark:text-slate-400"
              >
                Source, encoded code or PlantText/PlantUML URL · ⌘/Ctrl + Enter to view
              </p>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                View diagram
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                {error}
              </p>
            ) : null}
          </form>
        </section>

        <section id="examples" className="scroll-mt-6 py-10 sm:py-12">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Start from an example
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Four small diagrams covering the main PlantUML flavours. Open one in the viewer,
            then edit it or export it.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXAMPLE_LINKS.map((example) => {
              const Icon = EXAMPLE_ICONS[example.id] ?? DEFAULT_EXAMPLE_ICON
              return (
                <Link
                  key={example.id}
                  to={`/view/${example.code}`}
                  className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-800 dark:hover:shadow-black/20"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {example.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {example.description}
                  </p>
                  <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
                    <pre
                      aria-hidden="true"
                      className="line-clamp-3 overflow-hidden font-mono text-[11px] leading-relaxed text-slate-500 [mask-image:linear-gradient(to_bottom,black_55%,transparent)] dark:text-slate-400"
                    >
                      {example.source}
                    </pre>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    Open
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        <section id="agents" className="scroll-mt-6 pb-12">
          <div className="grid gap-8 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-10 lg:grid-cols-2 lg:gap-12 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
                For agents
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                The standard PlantUML codec
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                A PlantView link is{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  /view/&lt;code&gt;
                </code>{' '}
                where <code className="font-mono text-xs">code</code> is the official PlantUML
                encoding (deflate + custom base64). PlantText and plantuml.com read the same
                codes, so one link travels everywhere.
              </p>
              <div className="mt-5 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Example link
                </p>
                <code className="mt-2 block font-mono text-xs break-all text-slate-700 dark:text-slate-300">
                  {referenceUrl}
                </code>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Renders “Bob → Alice: Hello!”.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Encode with the script, never by hand
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Deflate plus a custom alphabet is not something to reproduce from memory. The{' '}
                <code className="font-mono text-xs">pnpm encode</code> helper reads a diagram on
                stdin and prints the ready-to-share URL.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 p-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-slate-100 dark:bg-black/50">
                {`printf '@startuml\\nBob -> Alice: Hello!\\n@enduml\\n' | pnpm encode`}
              </pre>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Script and agent skill ship with milestone M8 — see the repository README.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-auto flex flex-col gap-2 border-t border-slate-200/80 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:text-slate-400">
          <p>Runs entirely in your browser — your diagram never leaves it.</p>
          <nav className="flex items-center gap-4">
            <Link
              to="/history"
              className="transition hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-white"
            >
              History
            </Link>
            <Link
              to="/edit"
              className="transition hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-white"
            >
              Editor
            </Link>
            <a
              href="#examples"
              className="transition hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-white"
            >
              Examples
            </a>
            <a
              href="#agents"
              className="transition hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-white"
            >
              For agents
            </a>
          </nav>
        </footer>
      </div>
    </main>
  )
}
