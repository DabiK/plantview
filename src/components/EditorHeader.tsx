import { Link } from 'react-router-dom'
import { Code, Eye, Link2, Moon, Sun } from 'lucide-react'
import { diagramExamples } from '../lib/examples'
import { ToolbarButton } from './Toolbar'

export interface EditorHeaderProps {
  dark: boolean
  /** Shows the discreet "Saved" indicator after the autosave. */
  saved: boolean
  onToggleDark: () => void
  onLoadExample: (id: string) => void
  onCopyLink: () => void
  onView: () => void
}

/** Top bar of the editor: examples, autosave status, share and theme. */
export function EditorHeader({
  dark,
  saved,
  onToggleDark,
  onLoadExample,
  onCopyLink,
  onView,
}: EditorHeaderProps) {
  return (
    <header className="relative z-10 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/85 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <Link
        to="/"
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-slate-100"
      >
        <Code className="size-4 text-indigo-500" aria-hidden="true" />
        PlantView
      </Link>

      <span aria-hidden="true" className="hidden text-slate-300 sm:inline dark:text-slate-600">
        /
      </span>
      <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">Editor</span>

      <label className="sr-only" htmlFor="editor-example">
        Load an example
      </label>
      <select
        id="editor-example"
        value=""
        onChange={(event) => {
          if (event.target.value) onLoadExample(event.target.value)
        }}
        className="max-w-44 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:max-w-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <option value="" disabled>
          Load an example…
        </option>
        {diagramExamples.map((example) => (
          <option key={example.id} value={example.id}>
            {example.title}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-1">
        <span
          role="status"
          aria-live="polite"
          className={`mr-1 text-xs font-medium text-emerald-600 transition-opacity dark:text-emerald-400 ${
            saved ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Saved
        </span>

        <ToolbarButton label="Copy view link" onClick={onCopyLink}>
          <Link2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="View diagram" onClick={onView}>
          <Eye className="size-4" aria-hidden="true" />
        </ToolbarButton>
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
      </div>
    </header>
  )
}
