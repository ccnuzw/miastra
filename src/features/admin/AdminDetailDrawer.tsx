import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

type AdminDetailDrawerProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  actions?: ReactNode
  children: ReactNode
}

export function AdminDetailDrawer({
  open,
  title,
  subtitle,
  onClose,
  actions,
  children,
}: AdminDetailDrawerProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="关闭详情抽屉"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col border-l border-porcelain-50/10 bg-ink-950/95 shadow-[0_0_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-porcelain-50/10 px-5 py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-porcelain-50">{title}</h2>
            {subtitle ? <p className="mt-2 text-sm text-porcelain-100/55">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.65] text-porcelain-50 transition hover:border-signal-coral/35 hover:text-signal-coral"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2 border-b border-porcelain-50/10 px-5 py-4">
            {actions}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  )
}
