type AuditLogRecord = {
  id: string
  actorUserId: string
  actorRole: 'user' | 'operator' | 'admin'
  action: string
  targetType: string
  targetId: string
  payload: unknown
  ip?: string
  createdAt: string
}

type AdminLogsPanelProps = {
  logs: AuditLogRecord[]
  busyId: string
  onRevokeOtherSessions: () => void
}

export function AdminLogsPanel({ logs, busyId, onRevokeOtherSessions }: AdminLogsPanelProps) {
  return (
    <article className="mt-8 progress-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-porcelain-50">最近审计日志</h2>
        <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral disabled:opacity-40" onClick={onRevokeOtherSessions} disabled={busyId === 'others'}>{busyId === 'others' ? '撤销中…' : '撤销其他会话'}</button>
      </div>
      <div className="mt-4 space-y-3 text-sm text-porcelain-100/70">
        {logs.length ? logs.map((log) => (
          <div key={log.id} className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] p-3">
            <p>{log.action} · {log.targetType} / {log.targetId}</p>
            <p className="mt-1 text-xs text-porcelain-100/45">{log.actorRole} · {new Date(log.createdAt).toLocaleString()}</p>
          </div>
        )) : <p className="text-sm text-porcelain-100/60">当前还没有审计日志。</p>}
      </div>
    </article>
  )
}
