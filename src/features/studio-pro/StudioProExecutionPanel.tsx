import {
  truncateStudioProText,
  type StudioProControlStep,
  type StudioProReplayContext,
  type StudioProTemplateContext,
} from './studioPro.utils'

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
  controlSteps: StudioProControlStep[]
  replayContext?: StudioProReplayContext | null
  templateContext?: StudioProTemplateContext | null
  onApplyReplayRoute?: () => void
  onClearReplayBaseline?: () => void
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
  controlSteps,
  replayContext = null,
  templateContext = null,
  onApplyReplayRoute,
  onClearReplayBaseline,
  onOpenProviderSettings,
}: StudioProExecutionPanelProps) {
  const activeRequestUrl = requestKindLabel === '图生图' ? editRequestUrl : requestUrl
  const standbyRequestUrl = requestKindLabel === '图生图' ? requestUrl : editRequestUrl
  const hasReplayContext = Boolean(replayContext)
  const keepsSameExecutionBaseline =
    replayContext?.sourceProviderId === providerId &&
    replayContext?.sourceModelLabel === modelLabel &&
    replayContext?.sourceRequestKindLabel === requestKindLabel

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

      <div className="studio-pro-console-strip">
        <article className={`studio-pro-console-card ${templateContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">结构字段到执行</span>
          <strong className="studio-pro-metric-value">
            {templateContext ? `${templateContext.sceneLabel} · ${templateContext.title}` : '当前按自由工作区执行'}
          </strong>
          <p className="studio-pro-metric-copy">
            {templateContext
              ? `模板字段 ${templateContext.structureFields.join(' / ')} 会先约束 Prompt 与参数，再决定最终走 ${requestKindLabel} 路由。`
              : `当前没有模板约束，执行路由会直接按工作区 Prompt、参考图和当前参数决定。`}
          </p>
        </article>
        <article className={`studio-pro-console-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">重跑 / 派生入口</span>
          <strong className="studio-pro-metric-value">
            {hasReplayContext ? replayContext?.actionLabel : '等待来源快照接入'}
          </strong>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? keepsSameExecutionBaseline
                ? '当前执行基线与来源版本一致，下一轮更接近同配置重跑。'
                : '当前执行基线已偏离来源版本，下一轮会在原快照上形成新的派生。'
              : '从结果回到专业版后，这里会固定告诉你当前更接近重跑还是派生。'}
          </p>
          <div className="studio-pro-action-cluster">
            <button
              type="button"
              className="settings-button"
              onClick={onApplyReplayRoute}
              disabled={!replayContext || !onApplyReplayRoute}
            >
              恢复来源执行路径
            </button>
            <button
              type="button"
              className="settings-button"
              onClick={onClearReplayBaseline}
              disabled={!replayContext || !onClearReplayBaseline}
            >
              解除来源绑定
            </button>
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        {controlSteps.map((step, index) => (
          <article
            key={step.id}
            className="relative rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.52] p-4 pl-12"
          >
            <span className="absolute left-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full border border-signal-cyan/30 bg-signal-cyan/[0.12] text-xs font-bold text-signal-cyan">
              {index + 1}
            </span>
            <span className="studio-pro-metric-label">{step.label}</span>
            <strong className="studio-pro-metric-value">{step.value}</strong>
            <p className="studio-pro-metric-copy">{step.detail}</p>
          </article>
        ))}
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
        <article className={`studio-pro-metric-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">来源版本基线</span>
          <strong className="studio-pro-metric-value">
            {hasReplayContext ? `快照 ${replayContext?.snapshotId}` : '当前未挂接来源版本'}
          </strong>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? `${replayContext?.originLabel}。${replayContext?.detailLabel}`
              : '从作品或任务回到专业版后，这里会固定显示来源版本摘要，帮助判断当前是在继续、重跑还是派生。'}
          </p>
          {hasReplayContext && replayContext?.currentLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.currentLabel}</p>
          ) : null}
          {hasReplayContext && replayContext?.parentLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.parentLabel}</p>
          ) : null}
          {hasReplayContext && replayContext?.ancestorLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.ancestorLabel}</p>
          ) : null}
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? `来源执行：${replayContext?.sourceProviderId} / ${replayContext?.sourceModelLabel} · ${replayContext?.sourceRequestKindLabel}。${replayContext?.referenceSummaryLabel}`
              : '当前没有历史快照约束，执行链会直接以现在的工作区和参数为准。'}
          </p>
          {hasReplayContext && replayContext?.parameterLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.parameterLabel}</p>
          ) : null}
          {hasReplayContext && replayContext?.guidedFlowLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.guidedFlowLabel}</p>
          ) : null}
          {hasReplayContext && replayContext?.promptLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.promptLabel}</p>
          ) : null}
          {hasReplayContext ? (
            <p className="studio-pro-metric-copy">
              来源请求摘要：{truncateStudioProText(replayContext?.requestPrompt || '', 84) || '未记录'}
            </p>
          ) : null}
        </article>
        <article className={`studio-pro-metric-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">重跑与派生控制</span>
          <strong className="studio-pro-metric-value">
            {hasReplayContext ? replayContext?.actionLabel : '等待从结果进入控制链'}
          </strong>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? `当前重跑目标：${providerLabel} / ${modelLabel} · ${requestKindLabel}。${replayContext?.hint}`
              : '当结果回流到专业版后，这里会提示当前快照如何回到控制区，以及下一轮会按哪套 Provider / 模型继续执行。'}
          </p>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? keepsSameExecutionBaseline
                ? '当前 Provider、模型和执行路径与来源快照一致，更适合同基线复跑。'
                : '你已经改动了 Provider、模型或执行路径，下一轮会在来源快照基础上形成新的派生版本。'
              : '后续这里还会接入来源快照与当前控制区的自动差异提示。'}
          </p>
        </article>
      </div>
    </section>
  )
}
