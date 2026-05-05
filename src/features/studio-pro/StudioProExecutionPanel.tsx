type StudioProExecutionPanelProps = {
  connectionLabel: string
  providerStatusLabel: string
  providerLabel: string
  providerId: string
  providerModeLabel: string
  credentialStatusLabel: string
  modelStatusLabel: string
  modelLabel: string
  requestKindLabel: string
  requestUrl: string
  editRequestUrl: string
  loading: boolean
  onOpenProviderSettings: () => void
}

export function StudioProExecutionPanel({
  connectionLabel,
  providerStatusLabel,
  providerLabel,
  providerId,
  providerModeLabel,
  credentialStatusLabel,
  modelStatusLabel,
  modelLabel,
  requestKindLabel,
  requestUrl,
  editRequestUrl,
  loading,
  onOpenProviderSettings,
}: StudioProExecutionPanelProps) {
  const activeRequestUrl = requestKindLabel === '图生图' ? editRequestUrl : requestUrl
  const standbyRequestUrl = requestKindLabel === '图生图' ? requestUrl : editRequestUrl

  return (
    <section className="studio-pro-panel studio-pro-panel-tight">
      <div className="studio-pro-panel-header">
        <div>
          <p className="eyebrow">Execution</p>
          <h4 className="studio-pro-panel-title">Provider / 模型 / 执行路由</h4>
        </div>
        <div className="studio-pro-pill-group">
          <span className="status-pill">{requestKindLabel}</span>
          <span className="status-pill">{loading ? '配置恢复中' : '执行上下文已就绪'}</span>
          <button type="button" className="settings-button" onClick={onOpenProviderSettings}>
            编辑配置
          </button>
        </div>
      </div>

      <p className="studio-pro-panel-copy">
        这里明确展示当前 Provider 来源、模型上下文和请求路由，避免复跑时不知道这一轮到底是按哪套配置执行的。
      </p>

      <div className="studio-pro-metric-grid">
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">当前 Provider</span>
          <strong className="studio-pro-metric-value">
            {loading ? '正在恢复配置' : providerLabel}
          </strong>
          <p className="studio-pro-metric-copy">
            {providerModeLabel} · ID: {providerId || 'custom'}
          </p>
          <p className="studio-pro-metric-copy">{providerStatusLabel}</p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">当前模型</span>
          <strong className="studio-pro-metric-value">{modelLabel}</strong>
          <p className="studio-pro-metric-copy">
            {modelStatusLabel}。专业版会显式记录模型上下文，避免重跑时不清楚执行基线。
          </p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">连接与凭证</span>
          <strong className="studio-pro-metric-value">{connectionLabel}</strong>
          <p className="studio-pro-metric-copy">{credentialStatusLabel}</p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">当前执行路径</span>
          <strong className="studio-pro-metric-value">{requestKindLabel}</strong>
          <p className="studio-pro-metric-copy">
            当前主路由：<span className="studio-pro-code">{activeRequestUrl}</span>
          </p>
          <p className="studio-pro-metric-copy">
            备用路由：<span className="studio-pro-code">{standbyRequestUrl}</span>
          </p>
        </article>
      </div>
    </section>
  )
}
