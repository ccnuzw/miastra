type StudioProExecutionPanelProps = {
  providerLabel: string
  providerId: string
  providerModeLabel: string
  modelLabel: string
  requestKindLabel: string
  requestUrl: string
  editRequestUrl: string
  loading: boolean
  onOpenProviderSettings: () => void
}

export function StudioProExecutionPanel({
  providerLabel,
  providerId,
  providerModeLabel,
  modelLabel,
  requestKindLabel,
  requestUrl,
  editRequestUrl,
  loading,
  onOpenProviderSettings,
}: StudioProExecutionPanelProps) {
  return (
    <section className="studio-pro-panel studio-pro-panel-tight">
      <div className="studio-pro-panel-header">
        <div>
          <p className="eyebrow">Execution</p>
          <h4 className="studio-pro-panel-title">Provider 与模型</h4>
        </div>
        <div className="studio-pro-pill-group">
          <span className="status-pill">{requestKindLabel}</span>
          <button type="button" className="settings-button" onClick={onOpenProviderSettings}>
            编辑配置
          </button>
        </div>
      </div>

      <div className="studio-pro-metric-grid">
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">当前 Provider</span>
          <strong className="studio-pro-metric-value">
            {loading ? '正在恢复配置' : providerLabel}
          </strong>
          <p className="studio-pro-metric-copy">
            {providerModeLabel} · ID: {providerId || 'custom'}
          </p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">当前模型</span>
          <strong className="studio-pro-metric-value">{modelLabel}</strong>
          <p className="studio-pro-metric-copy">
            专业版会显式展示当前模型，避免重跑时不清楚执行上下文。
          </p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">执行路径</span>
          <strong className="studio-pro-metric-value">{requestKindLabel}</strong>
          <p className="studio-pro-metric-copy">
            文生图请求：<span className="studio-pro-code">{requestUrl}</span>
          </p>
          <p className="studio-pro-metric-copy">
            图生图请求：<span className="studio-pro-code">{editRequestUrl}</span>
          </p>
        </article>
      </div>
    </section>
  )
}
