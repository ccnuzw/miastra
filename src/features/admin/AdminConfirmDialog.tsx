import { AlertTriangle, X } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

export type AdminConfirmOptions = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  details?: ReactNode
}

type AdminConfirmDialogProps = AdminConfirmOptions & {
  open: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  tone = 'danger',
  details,
  busy = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onCancel, open])

  if (!open) return null

  const confirmClassName =
    tone === 'danger'
      ? 'border-signal-coral/25 bg-signal-coral/10 text-signal-coral hover:bg-signal-coral hover:text-ink-950'
      : 'border-signal-cyan/25 bg-signal-cyan/10 text-signal-cyan hover:bg-signal-cyan hover:text-ink-950'

  return (
    <div className="admin-confirm-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="admin-confirm-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${tone === 'danger' ? 'border-signal-coral/20 bg-signal-coral/10 text-signal-coral' : 'border-signal-cyan/20 bg-signal-cyan/10 text-signal-cyan'}`}>
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-porcelain-50">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-porcelain-100/60">{description}</p>
            </div>
          </div>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.65] text-porcelain-50 transition hover:border-signal-coral/35 hover:text-signal-coral disabled:opacity-40"
            onClick={onCancel}
            disabled={busy}
            aria-label="关闭确认弹层"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {details ? (
          <div className="mt-5 rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.58] p-4 text-sm leading-6 text-porcelain-100/68">
            {details}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-4 py-2.5 text-sm font-semibold text-porcelain-50 transition hover:border-porcelain-50/20"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${confirmClassName} disabled:opacity-40`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? '处理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useAdminConfirm() {
  const [state, setState] = useState<(AdminConfirmOptions & { resolver: (value: boolean) => void }) | null>(null)

  const confirm = useCallback((options: AdminConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolver: resolve })
    })
  }, [])

  const handleClose = useCallback(
    (value: boolean) => {
      if (!state) return
      state.resolver(value)
      setState(null)
    },
    [state],
  )

  return {
    confirm,
    confirmDialog: (
      <AdminConfirmDialog
        open={Boolean(state)}
        title={state?.title ?? ''}
        description={state?.description ?? ''}
        confirmLabel={state?.confirmLabel}
        cancelLabel={state?.cancelLabel}
        tone={state?.tone}
        details={state?.details}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />
    ),
  }
}
