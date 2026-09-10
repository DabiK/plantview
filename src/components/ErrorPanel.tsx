import { TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface ErrorPanelProps {
  /** Short human-readable error message. */
  message: string
  /** 1-based line number reported by the engine, when available. */
  line?: number | null
  /** When set, shows an "Open in editor" link. */
  editHref?: string
}

/** Styled error card shown when a diagram cannot be decoded or rendered. */
export function ErrorPanel({ message, line = null, editHref }: ErrorPanelProps) {
  return (
    <div
      role="alert"
      className="w-full max-w-md rounded-2xl border border-rose-200 bg-white/95 p-6 text-center shadow-xl shadow-rose-500/5 backdrop-blur dark:border-rose-900/60 dark:bg-slate-900/95 dark:shadow-black/30"
    >
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
        Unable to render this diagram
      </h2>
      <p className="mt-2 text-sm break-words text-slate-600 dark:text-slate-300">{message}</p>
      {line !== null ? (
        <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Error at line {line}
        </p>
      ) : null}
      {editHref ? (
        <div className="mt-6">
          <Link
            to={editHref}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Open in editor
          </Link>
        </div>
      ) : null}
    </div>
  )
}
