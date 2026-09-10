import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { LoaderCircle } from 'lucide-react'
import { DiagramCanvas } from '../components/DiagramCanvas'
import { EditorHeader } from '../components/EditorHeader'
import { ErrorPanel } from '../components/ErrorPanel'
import { Toast } from '../components/Toast'
import { copyText } from '../lib/clipboard'
import { readDraft, resolveInitialEditorState, writeDraft } from '../lib/editor-state'
import { diagramExamples } from '../lib/examples'
import { encodeDiagram } from '../lib/plantuml-encoding'
import { plantUmlLanguage } from '../lib/plantuml-language'
import { PlantUmlRenderError, renderPlantUml } from '../lib/render-plantuml'
import {
  applyThemeToDocument,
  prefersDarkScheme,
  readStoredTheme,
  resolveInitialTheme,
  storeTheme,
  type Theme,
} from '../lib/theme'
import { buildViewUrl } from '../lib/urls'

const PREVIEW_DEBOUNCE_MS = 400
const URL_SYNC_DEBOUNCE_MS = 900
const MESSAGE_TIMEOUT_MS = 2500
const EDITOR_EXTENSIONS = [plantUmlLanguage]

type PreviewState =
  | { status: 'loading'; svg: string | null }
  | { status: 'ready'; svg: string }
  | { status: 'error'; message: string; line: number | null; svg: string | null }

function PreviewSkeleton() {
  return (
    <div className="flex h-full items-center justify-center p-8" role="status" aria-live="polite">
      <div aria-hidden="true" className="w-full max-w-md animate-pulse space-y-4">
        <div className="h-20 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="flex gap-4">
          <div className="h-20 flex-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-20 flex-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>
      <span className="sr-only">Rendering diagram…</span>
    </div>
  )
}

export default function Edit() {
  const { code: codeParam } = useParams<{ code?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [initial] = useState(() =>
    resolveInitialEditorState({
      code: codeParam ?? null,
      draft: readDraft(),
      fallback: diagramExamples[0].source,
    }),
  )
  const [source, setSource] = useState(initial.source)
  const [preview, setPreview] = useState<PreviewState>({ status: 'loading', svg: null })
  const [theme, setTheme] = useState<Theme>(() =>
    resolveInitialTheme({
      queryValue: searchParams.get('dark'),
      storedValue: readStoredTheme(),
      prefersDark: prefersDarkScheme(),
    }),
  )
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const firstRender = useRef(true)
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
    if (initial.codeError) showMessage(initial.codeError)
  }, [initial, showMessage])

  useEffect(() => {
    applyThemeToDocument(theme)
    storeTheme(theme)
  }, [theme])

  // Debounced live preview. Renders are queued in the engine; superseded
  // responses reject and are dropped.
  useEffect(() => {
    let cancelled = false
    const delay = firstRender.current ? 0 : PREVIEW_DEBOUNCE_MS

    const timer = window.setTimeout(() => {
      firstRender.current = false
      setPreview((previous) => ({ status: 'loading', svg: previous.svg }))

      renderPlantUml(source, { dark: theme === 'dark' })
        .then((svg) => {
          if (!cancelled) setPreview({ status: 'ready', svg })
        })
        .catch((error: unknown) => {
          if (cancelled) return
          if (error instanceof PlantUmlRenderError && error.superseded) return
          setPreview((previous) => ({
            status: 'error',
            message: error instanceof Error ? error.message : 'Rendering failed.',
            line: error instanceof PlantUmlRenderError ? error.line : null,
            svg: previous.svg,
          }))
        })
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [source, theme])

  // Debounced autosave. Storage failures are already swallowed by writeDraft.
  useEffect(() => {
    setSaved(false)
    const timer = window.setTimeout(() => {
      writeDraft(source)
      setSaved(true)
    }, PREVIEW_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [source])

  // Discreet URL sync: replaceState only (no history entries), after a pause.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const base = import.meta.env.BASE_URL.replace(/\/+$/, '')
      const code = source.trim() ? encodeDiagram(source) : null
      const path = code ? `${base}/edit/${code}` : `${base}/edit`
      if (window.location.pathname !== path) {
        window.history.replaceState(null, '', path)
      }
    }, URL_SYNC_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [source])

  const viewCode = useMemo(() => (source.trim() ? encodeDiagram(source) : ''), [source])
  const viewUrl = useMemo(
    () => (viewCode ? buildViewUrl(viewCode, `${window.location.origin}${import.meta.env.BASE_URL}`) : ''),
    [viewCode],
  )

  const handleToggleDark = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const handleLoadExample = useCallback((id: string) => {
    const example = diagramExamples.find((item) => item.id === id)
    if (example) {
      setSource(example.source)
    }
  }, [])

  const handleCopyLink = useCallback(async () => {
    if (!viewCode) {
      showMessage('Nothing to share yet')
      return
    }
    try {
      await copyText(viewUrl)
      showMessage('Link copied')
    } catch {
      showMessage('Unable to copy the link')
    }
  }, [viewCode, viewUrl, showMessage])

  const handleView = useCallback(() => {
    if (!viewCode) {
      showMessage('Nothing to view yet')
      return
    }
    navigate(`/view/${viewCode}`)
  }, [viewCode, navigate, showMessage])

  const goToLine = useCallback((line: number) => {
    const view = editorRef.current?.view
    if (!view) return
    const doc = view.state.doc
    const target = doc.line(Math.min(Math.max(line, 1), doc.lines))
    view.dispatch({ selection: { anchor: target.from }, scrollIntoView: true })
    view.focus()
  }, [])

  const errorLine = preview.status === 'error' ? preview.line : null

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EditorHeader
        dark={theme === 'dark'}
        saved={saved}
        onToggleDark={handleToggleDark}
        onLoadExample={handleLoadExample}
        onCopyLink={() => void handleCopyLink()}
        onView={handleView}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 flex-1 flex-col border-b border-slate-200 lg:w-1/2 lg:border-r lg:border-b-0 dark:border-slate-800">
          <CodeMirror
            ref={editorRef}
            value={source}
            onChange={setSource}
            theme={theme === 'dark' ? 'dark' : 'light'}
            extensions={EDITOR_EXTENSIONS}
            height="100%"
            aria-label="PlantUML source"
            className="h-full min-h-0 overflow-hidden text-sm"
          />
        </section>

        <section className="diagram-grid relative min-h-0 flex-1">
          {preview.svg ? <DiagramCanvas svg={preview.svg} /> : null}
          {!preview.svg && preview.status === 'loading' ? <PreviewSkeleton /> : null}

          {preview.status === 'loading' && preview.svg ? (
            <div
              role="status"
              className="absolute top-4 right-4 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90 dark:text-slate-300"
            >
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              Rendering…
            </div>
          ) : null}

          {preview.status === 'error' ? (
            <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4">
              {preview.svg ? (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-white/60 backdrop-blur-[1px] dark:bg-slate-950/60"
                />
              ) : null}
              <div className="relative">
                <ErrorPanel
                  message={preview.message}
                  line={preview.line}
                  onLineClick={errorLine !== null ? () => goToLine(errorLine) : undefined}
                />
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <Toast
        message={message}
        className="pointer-events-none fixed inset-x-0 bottom-4 z-30 mx-auto w-fit"
      />
    </main>
  )
}
