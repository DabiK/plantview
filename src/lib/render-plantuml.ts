import DOMPurify from 'dompurify'
import { detectEmbeddedRenderError } from './diagram-error'

/**
 * PlantUML engine assets are served as static files (copied to
 * `public/plantuml/` by `scripts/sync-plantuml-assets.mjs`), never bundled:
 * `plantuml.js` is ~4 MB.
 */
const PLANTUML_ASSETS_BASE = `${import.meta.env.BASE_URL}plantuml/`
const VIZ_SCRIPT_URL = `${PLANTUML_ASSETS_BASE}viz-global.js`

/**
 * Absolute URL of the engine module. Vite injects `?import` into dynamic
 * imports whose specifier starts with `/` (even with `@vite-ignore`), which
 * breaks public-dir assets in dev; an absolute URL is left untouched.
 */
function getEngineModuleUrl(): string {
  return new URL(`${PLANTUML_ASSETS_BASE}plantuml.js`, window.location.href).href
}

interface PlantUmlModule {
  renderToString: (
    lines: string[],
    onSuccess: (svg: string) => void,
    onError: (message: string) => void,
    options?: { dark?: boolean },
  ) => void
}

declare global {
  interface Window {
    /** URL prefix the engine uses to lazy-load themes/emoji/stdlib bundles. */
    PLANTUML_STDLIB_BASE?: string
    /** Global exposed by `viz-global.js` (Graphviz layout engine). */
    Viz?: unknown
  }
}

export interface PlantUmlErrorDetails {
  /** 1-based line number reported by the engine, `null` when absent. */
  line: number | null
  /** Short human-readable message, suitable for display. */
  message: string
}

/**
 * Parses a raw engine error message: extracts the failing line number and
 * keeps the most useful line of the message.
 */
export function parsePlantUmlError(rawMessage: string): PlantUmlErrorDetails {
  const message = rawMessage.trim() || 'Unknown PlantUML error.'
  const lineMatch = message.match(/Error line (\d+)/i)
  const line = lineMatch ? Number.parseInt(lineMatch[1], 10) : null

  const lines = message
    .split(/\r\n|\n|\r/)
    .map((part) => part.trim())
    .filter(Boolean)
  const shortMessage =
    lines.find((part) => !/^error line \d+/i.test(part)) ?? lines[0] ?? message

  return { line, message: shortMessage }
}

/** Error thrown when the engine fails to load or to render a diagram. */
export class PlantUmlRenderError extends Error {
  /** Line number reported by the engine, when available. */
  readonly line: number | null
  /** `true` when the request was dropped because a newer render was queued. */
  readonly superseded: boolean

  constructor(
    message: string,
    options: {
      cause?: unknown
      line?: number | null
      superseded?: boolean
    } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'PlantUmlRenderError'
    this.line = options.line ?? null
    this.superseded = options.superseded ?? false
  }
}

let vizScriptPromise: Promise<void> | null = null
let enginePromise: Promise<PlantUmlModule> | null = null
/** Serializes engine calls: the TeaVM engine shares internal state. */
let renderQueue: Promise<unknown> = Promise.resolve()
/** Id of the most recently requested render; older responses are dropped. */
let latestRequestId = 0

function supersededError(): PlantUmlRenderError {
  return new PlantUmlRenderError('Render superseded by a newer request.', {
    superseded: true,
  })
}

/** Loads `viz-global.js` exactly once through a classic script tag. */
function loadVizScript(): Promise<void> {
  if (vizScriptPromise) {
    return vizScriptPromise
  }

  vizScriptPromise = new Promise<void>((resolve, reject) => {
    const fail = (cause?: unknown) => {
      vizScriptPromise = null
      reject(
        new PlantUmlRenderError(
          'Failed to load the PlantUML rendering engine (viz-global.js).',
          { cause },
        ),
      )
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-plantuml-viz]',
    )
    if (existing) {
      if (typeof window.Viz !== 'undefined') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => fail(), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = VIZ_SCRIPT_URL
    script.async = true
    script.dataset.plantumlViz = 'true'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => {
        script.remove()
        fail()
      },
      { once: true },
    )
    document.head.appendChild(script)
  })

  return vizScriptPromise
}

/** Loads the engine module (and its Graphviz dependency) exactly once. */
async function loadEngine(): Promise<PlantUmlModule> {
  if (typeof document === 'undefined') {
    throw new PlantUmlRenderError(
      'PlantUML rendering is only available in a browser environment.',
    )
  }

  enginePromise ??= (async () => {
    await loadVizScript()

    // Themes, emoji and OpenIconic are lazily fetched next to the engine.
    window.PLANTUML_STDLIB_BASE = PLANTUML_ASSETS_BASE

    const engine = (await import(
      /* @vite-ignore */ getEngineModuleUrl()
    )) as Partial<PlantUmlModule>
    if (typeof engine.renderToString !== 'function') {
      throw new PlantUmlRenderError(
        'The PlantUML engine loaded without a renderToString export.',
      )
    }
    return engine as PlantUmlModule
  })()

  try {
    return await enginePromise
  } catch (cause) {
    // Allow a retry after a transient failure (offline, dev server restart).
    enginePromise = null
    vizScriptPromise = null
    throw cause instanceof PlantUmlRenderError
      ? cause
      : new PlantUmlRenderError('Failed to load the PlantUML engine.', { cause })
  }
}

/** Runs tasks one at a time, even when a previous task failed. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = renderQueue.then(task, task)
  renderQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function sanitizeSvg(rawSvg: string): string {
  return DOMPurify.sanitize(rawSvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
  })
}

export interface RenderPlantUmlOptions {
  dark?: boolean
}

/**
 * Renders PlantUML source locally (100% in-browser) and resolves with the
 * sanitized SVG.
 *
 * Renders are queued because the engine shares internal state; superseded
 * requests reject with a {@link PlantUmlRenderError} whose `superseded` flag
 * is `true`, so callers can safely drop stale responses.
 */
export function renderPlantUml(
  source: string,
  options: RenderPlantUmlOptions = {},
): Promise<string> {
  const requestId = ++latestRequestId

  return enqueue(async () => {
    if (requestId !== latestRequestId) {
      throw supersededError()
    }

    const engine = await loadEngine()
    if (requestId !== latestRequestId) {
      throw supersededError()
    }

    const rawSvg = await new Promise<string>((resolve, reject) => {
      try {
        engine.renderToString(
          source.split(/\r\n|\n|\r/),
          (svg) => resolve(svg),
          (message) => {
            const details = parsePlantUmlError(message)
            reject(
              new PlantUmlRenderError(details.message, { line: details.line }),
            )
          },
          { dark: options.dark === true },
        )
      } catch (cause) {
        reject(
          new PlantUmlRenderError('The PlantUML engine failed to render.', {
            cause,
          }),
        )
      }
    })

    if (requestId !== latestRequestId) {
      throw supersededError()
    }

    const svg = sanitizeSvg(rawSvg)
    const embeddedError = detectEmbeddedRenderError(svg)
    if (embeddedError) {
      throw new PlantUmlRenderError(embeddedError.message, {
        line: embeddedError.line,
      })
    }

    return svg
  })
}
