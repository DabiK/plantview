import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { DiagramCanvas, type DiagramCanvasHandle } from '../components/DiagramCanvas'
import { ErrorPanel } from '../components/ErrorPanel'
import { Toolbar } from '../components/Toolbar'
import { copyText } from '../lib/clipboard'
import { downloadPng, downloadSvg } from '../lib/export'
import { DiagramDecodeError, decodeDiagram } from '../lib/plantuml-encoding'
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

type RenderState =
  | { status: 'loading'; svg: string | null }
  | { status: 'ready'; svg: string }
  | { status: 'error'; message: string; line: number | null }

const SVG_FILENAME = 'plantview-diagram.svg'
const PNG_FILENAME = 'plantview-diagram.png'
const MESSAGE_TIMEOUT_MS = 2500

function LoadingSkeleton() {
  return (
    <div className="flex h-full items-center justify-center p-8" role="status" aria-live="polite">
      <div aria-hidden="true" className="w-full max-w-md animate-pulse space-y-4">
        <div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="flex gap-4">
          <div className="h-24 flex-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-24 flex-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>
      <span className="sr-only">Rendering diagram…</span>
    </div>
  )
}

export default function View() {
  const { code = '' } = useParams<{ code: string }>()
  const [searchParams] = useSearchParams()
  const [theme, setTheme] = useState<Theme>(() =>
    resolveInitialTheme({
      queryValue: searchParams.get('dark'),
      storedValue: readStoredTheme(),
      prefersDark: prefersDarkScheme(),
    }),
  )
  const [state, setState] = useState<RenderState>({ status: 'loading', svg: null })
  const [message, setMessage] = useState<string | null>(null)
  const canvasRef = useRef<DiagramCanvasHandle | null>(null)
  const messageTimer = useRef<number | null>(null)

  const viewUrl = buildViewUrl(code, `${window.location.origin}${import.meta.env.BASE_URL}`)

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

  useEffect(() => {
    let cancelled = false
    setState((previous) => ({ status: 'loading', svg: previous.status === 'ready' ? previous.svg : null }))

    let source: string
    try {
      source = decodeDiagram(code)
    } catch (error) {
      const errorMessage =
        error instanceof DiagramDecodeError ? error.message : 'This diagram code is invalid.'
      setState({ status: 'error', message: errorMessage, line: null })
      return
    }

    renderPlantUml(source, { dark: theme === 'dark' })
      .then((svg) => {
        if (!cancelled) {
          setState({ status: 'ready', svg })
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof PlantUmlRenderError && error.superseded) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Rendering failed.',
          line: error instanceof PlantUmlRenderError ? error.line : null,
        })
      })

    return () => {
      cancelled = true
    }
  }, [code, theme])

  const renderedSvg =
    state.status === 'ready' ? state.svg : state.status === 'loading' ? state.svg : null

  const handleToggleDark = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const handleDownloadSvg = useCallback(() => {
    if (!renderedSvg) return
    try {
      downloadSvg(renderedSvg, SVG_FILENAME)
      showMessage('SVG downloaded')
    } catch {
      showMessage('SVG export failed')
    }
  }, [renderedSvg, showMessage])

  const handleDownloadPng = useCallback(async () => {
    if (!renderedSvg) return
    try {
      await downloadPng(renderedSvg, PNG_FILENAME, { dark: theme === 'dark' })
      showMessage('PNG downloaded')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'PNG export failed')
    }
  }, [renderedSvg, theme, showMessage])

  const handleCopyLink = useCallback(async () => {
    try {
      await copyText(viewUrl)
      showMessage('Link copied')
    } catch {
      showMessage('Unable to copy the link')
    }
  }, [viewUrl, showMessage])

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="diagram-grid relative min-h-0 flex-1">
        {renderedSvg ? (
          <DiagramCanvas key={code} ref={canvasRef} svg={renderedSvg} />
        ) : state.status === 'loading' ? (
          <LoadingSkeleton />
        ) : null}

        {state.status === 'loading' && renderedSvg ? (
          <div
            role="status"
            className="absolute top-4 right-4 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90 dark:text-slate-300"
          >
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            Rendering…
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-6">
            <ErrorPanel message={state.message} line={state.line} editHref={`/edit/${code}`} />
          </div>
        ) : null}
      </div>

      <Toolbar
        dark={theme === 'dark'}
        disabled={state.status !== 'ready'}
        message={message}
        editHref={`/edit/${code}`}
        onToggleDark={handleToggleDark}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onFit={() => canvasRef.current?.fit()}
        onReset={() => canvasRef.current?.reset()}
        onDownloadSvg={handleDownloadSvg}
        onDownloadPng={() => void handleDownloadPng()}
        onCopyLink={() => void handleCopyLink()}
      />
    </main>
  )
}
