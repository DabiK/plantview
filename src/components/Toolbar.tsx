import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy,
  Download,
  Expand,
  ImageDown,
  Moon,
  Pencil,
  RotateCcw,
  Sun,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Toast } from './Toast'

const BUTTON_CLASSES =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition ' +
  'hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-indigo-500 disabled:pointer-events-none disabled:opacity-40 ' +
  'dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white'

interface ToolbarButtonProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  pressed?: boolean
  children: ReactNode
}

export function ToolbarButton({ label, onClick, disabled, pressed, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={BUTTON_CLASSES}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
}

export interface ToolbarProps {
  dark: boolean
  /** Disables diagram actions (zoom, downloads) when nothing is rendered. */
  disabled?: boolean
  /** Transient feedback shown above the toolbar. */
  message?: string | null
  editHref: string
  onToggleDark: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onReset: () => void
  onDownloadSvg: () => void
  onDownloadPng: () => void
  onCopyLink: () => void
}

/** Floating viewer toolbar: zoom, theme, exports, share and edit. */
export function Toolbar({
  dark,
  disabled = false,
  message = null,
  editHref,
  onToggleDark,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  onDownloadSvg,
  onDownloadPng,
  onCopyLink,
}: ToolbarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2 px-4">
      {message ? <Toast message={message} className="pointer-events-auto" /> : null}
      <div className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-lg shadow-slate-900/5 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-black/30">
        <ToolbarButton label="Zoom in" onClick={onZoomIn} disabled={disabled}>
          <ZoomIn className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Zoom out" onClick={onZoomOut} disabled={disabled}>
          <ZoomOut className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Fit to view" onClick={onFit} disabled={disabled}>
          <Expand className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Reset view" onClick={onReset} disabled={disabled}>
          <RotateCcw className="size-4" aria-hidden="true" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={onToggleDark}
          pressed={dark}
        >
          {dark ? (
            <Sun className="size-4" aria-hidden="true" />
          ) : (
            <Moon className="size-4" aria-hidden="true" />
          )}
        </ToolbarButton>

        <Divider />

        <ToolbarButton label="Download SVG" onClick={onDownloadSvg} disabled={disabled}>
          <Download className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Download PNG" onClick={onDownloadPng} disabled={disabled}>
          <ImageDown className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Copy link" onClick={onCopyLink}>
          <Copy className="size-4" aria-hidden="true" />
        </ToolbarButton>

        <Divider />

        <Link
          to={editHref}
          aria-label="Open in editor"
          title="Open in editor"
          className={BUTTON_CLASSES}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
