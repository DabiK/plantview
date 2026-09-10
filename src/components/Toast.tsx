export interface ToastProps {
  /** Transient message; nothing is rendered when `null`. */
  message: string | null
  className?: string
}

/** Small floating feedback chip (copy link, export, save…). */
export function Toast({ message, className = '' }: ToastProps) {
  if (!message) return null

  return (
    <div
      role="status"
      className={`rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95 dark:text-slate-200 ${className}`}
    >
      {message}
    </div>
  )
}
