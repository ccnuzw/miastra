import { AlertTriangle } from 'lucide-react'
import { getErrorDisplay, toAppError } from './app-error'

type ErrorNoticeProps = {
  error: unknown
  className?: string
  compact?: boolean
}

export function ErrorNotice({ error, className = '', compact = false }: ErrorNoticeProps) {
  const normalized = toAppError(error)
  const display = getErrorDisplay(normalized)

  return (
    <div className={`error-notice ${compact ? 'error-notice-compact' : ''} ${className}`.trim()} role="alert">
      <div className="error-notice-head">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="error-notice-meta">
            <span className="error-notice-title">{display.title}</span>
            {display.badges?.map((badge) => <span key={badge} className="error-notice-code">{badge}</span>)}
            <span className="error-notice-code">{display.code}</span>
            {typeof display.status === 'number' ? <span className="error-notice-code">HTTP {display.status}</span> : null}
            {display.requestId ? <span className="error-notice-code">RID {display.requestId.slice(0, 8)}</span> : null}
          </div>
          <p className="error-notice-message">{display.message}</p>
          {display.hint ? <p className="error-notice-hint">{display.hint}</p> : null}
        </div>
      </div>
    </div>
  )
}
