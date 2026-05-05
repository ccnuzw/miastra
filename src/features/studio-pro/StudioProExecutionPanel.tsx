import {
  buildStudioProExecutionComparisonItems,
  buildStudioProExecutionDecision,
  summarizeStudioProComparisons,
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
  const executionComparisonItems = buildStudioProExecutionComparisonItems({
    providerId,
    modelLabel,
    requestKindLabel,
    replayContext,
  })
  const executionComparisonSummary = summarizeStudioProComparisons(executionComparisonItems)
  const replayQuickDeltaLabels = replayContext?.quickDeltaLabels ?? []
  const replayDeltaItems = replayContext?.deltaItems ?? []
  const executionDecision = buildStudioProExecutionDecision({
    replayContext,
    executionComparisonItems,
    executionComparisonSummary,
    keepsSameExecutionBaseline,
  })
  const replayReferenceStatus =
    replayContext && replayContext.expectedReferenceCount > 0
      ? `参考图恢复 ${replayContext.restoredReferenceCount}/${replayContext.expectedReferenceCount} 张`
      : replayContext?.referenceSummaryLabel ?? '这一版没有参考图依赖'

  function getDecisionPillClass(state: typeof executionDecision.state) {
    switch (state) {
      case 'rerun':
        return 'border-signal-cyan/30 bg-signal-cyan/[0.12] text-signal-cyan'
      case 'calibrate':
        return 'border-amber-300/25 bg-amber-300/[0.12] text-amber-200'
      case 'branch':
        return 'border-rose-300/25 bg-rose-300/[0.12] text-rose-200'
      default:
        return 'border-porcelain-50/10 bg-porcelain-50/[0.06] text-porcelain-100/[0.55]'
    }
  }

  return (
    <section className="studio-pro-panel studio-pro-panel-tight">
      <div className="studio-pro-panel-header">
        <div>
          <p className="eyebrow">Execution</p>
          <h4 className="studio-pro-panel-title">最后确认执行链</h4>
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
        当 Prompt 和参数已经收紧后，这里最后确认 Provider、模型和执行路径，避免把执行链偏移误判成内容改动。
      </p>

      <article
        className={`mt-4 rounded-[1.35rem] border p-4 ${
          executionDecision.state === 'rerun'
            ? 'border-signal-cyan/25 bg-signal-cyan/[0.08]'
            : executionDecision.state === 'calibrate'
              ? 'border-amber-300/20 bg-amber-300/[0.08]'
              : executionDecision.state === 'branch'
                ? 'border-rose-300/20 bg-rose-300/[0.08]'
                : 'border-porcelain-50/10 bg-ink-950/[0.48]'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="studio-pro-metric-label">执行决策台</span>
            <strong className="studio-pro-metric-value">{executionDecision.title}</strong>
          </div>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getDecisionPillClass(executionDecision.state)}`}>
            {executionDecision.stateLabel}
          </span>
        </div>
        <p className="studio-pro-metric-copy">{executionDecision.summary}</p>
        <p className="studio-pro-metric-copy">{executionDecision.recommendation}</p>
        {replayContext ? (
          <>
            <p className="studio-pro-metric-copy">版本建议：{replayContext.recommendedActionLabel}</p>
            <p className="studio-pro-metric-copy">{replayContext.decisionSummary}</p>
            <p className="studio-pro-metric-copy">{replayContext.actionDecisionReason}</p>
          </>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="status-pill">主动作：{executionDecision.primaryAction}</span>
          {executionDecision.secondaryAction ? (
            <span className="status-pill">{executionDecision.secondaryAction}</span>
          ) : null}
        </div>
        {executionDecision.focusItems.length ? (
          <div className="mt-4 grid gap-2 xl:grid-cols-3">
            {executionDecision.focusItems.map((item) => (
              <div
                key={item}
                className="rounded-[1rem] border border-porcelain-50/[0.08] bg-ink-950/[0.52] px-3 py-3 text-sm leading-6 text-porcelain-100/[0.68]"
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
      </article>

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
          <span className="studio-pro-metric-label">来源版执行入口</span>
          <strong className="studio-pro-metric-value">
            {hasReplayContext ? replayContext?.actionLabel : '等待来源快照接入'}
          </strong>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? keepsSameExecutionBaseline
                ? '当前执行判断基线与来源版本一致，下一轮更接近同配置重跑。'
                : '当前执行判断基线已偏离来源版本，下一轮会在原快照上形成新的目标版分支。'
              : '从结果回到专业版后，这里会固定告诉你当前更接近重跑还是派生。'}
          </p>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? '这里的“恢复来源执行基线”只会帮助你回到来源参数与执行判断语境，Provider / 模型仍以当前工作台配置为准。'
              : '当前还没有来源快照，Provider / 模型和执行路径只按现在的工作台配置解释。'}
          </p>
          {replayContext?.deltaHeadline ? (
            <p className="studio-pro-metric-copy">{replayContext.deltaHeadline}</p>
          ) : null}
          {replayContext?.parentDeltaLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.parentDeltaLabel}</p>
          ) : null}
          <div className="studio-pro-action-cluster">
            <button
              type="button"
              className="settings-button"
              onClick={onApplyReplayRoute}
              disabled={!replayContext || !onApplyReplayRoute}
            >
              对齐来源执行基线
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

      <article className={`studio-pro-metric-card mt-4 ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="studio-pro-metric-label">当前版与来源版执行基线</span>
            <strong className="studio-pro-metric-value">{executionComparisonSummary.summary}</strong>
          </div>
          <span
            className={`studio-pro-compare-pill ${
              executionComparisonSummary.status === 'aligned'
                ? 'studio-pro-compare-pill-aligned'
                : executionComparisonSummary.status === 'shifted'
                  ? 'studio-pro-compare-pill-shifted'
                  : 'studio-pro-compare-pill-missing'
            }`}
          >
            {executionComparisonSummary.statusLabel}
          </span>
        </div>
        <p className="studio-pro-metric-copy">
          {hasReplayContext
            ? keepsSameExecutionBaseline
              ? 'Provider、模型和执行路径都还贴着来源版，当前更适合作为同基线重跑。'
              : `${executionComparisonSummary.suggestion} 这一层放在最后确认，避免过早切执行链。`
            : '从结果回到专业版后，这里会直接告诉你当前执行链和来源版差了几项。'}
        </p>
        <p className="studio-pro-metric-copy">建议动作：{executionDecision.primaryAction}</p>
        <div className="studio-pro-compare-grid">
          {executionComparisonItems.length ? (
            executionComparisonItems.map((item) => (
              <article key={item.id} className="studio-pro-compare-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="studio-pro-metric-label">{item.label}</span>
                  <span
                    className={`studio-pro-compare-pill ${
                      item.status === 'aligned'
                        ? 'studio-pro-compare-pill-aligned'
                        : item.status === 'shifted'
                          ? 'studio-pro-compare-pill-shifted'
                          : 'studio-pro-compare-pill-missing'
                    }`}
                  >
                    {item.statusLabel}
                  </span>
                </div>
                <p className="studio-pro-metric-copy">来源：{item.baselineValue}</p>
                <p className="studio-pro-metric-copy">当前：{item.currentValue}</p>
                <p className="studio-pro-metric-copy">{item.hint}</p>
                <p className="studio-pro-metric-copy">
                  {item.status === 'shifted' ? '下一步：先确认这一项是不是本轮刻意换链。' : '下一步：这一项可以保持来源基线。'}
                </p>
              </article>
            ))
          ) : (
            <article className="studio-pro-compare-card">
              <span className="studio-pro-metric-label">等待来源执行基线</span>
              <strong className="studio-pro-metric-value">还没有可比较的来源版本</strong>
              <p className="studio-pro-metric-copy">
                从作品或任务恢复一版后，这里会明确显示 Provider、模型和执行路径的偏移情况。
              </p>
            </article>
          )}
        </div>
      </article>

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
          {hasReplayContext ? (
            <p className="studio-pro-metric-copy">{replayReferenceStatus}</p>
          ) : null}
          {hasReplayContext ? (
            <p className="studio-pro-metric-copy">
              来源类型：{replayContext?.sourceKindLabel} · {replayContext?.sceneLabel ?? replayContext?.scene?.label ?? '未记录场景'}
            </p>
          ) : null}
          {hasReplayContext ? (
            <p className="studio-pro-metric-copy">
              动作建议：{replayContext?.recommendedActionLabel}。{replayContext?.decisionSummary}
            </p>
          ) : null}
          {hasReplayContext && replayContext?.deltaHeadline ? (
            <p className="studio-pro-metric-copy">{replayContext.deltaHeadline}</p>
          ) : null}
          {hasReplayContext && replayContext?.parentDeltaLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.parentDeltaLabel}</p>
          ) : null}
          {hasReplayContext && replayContext?.sourceDeltaLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.sourceDeltaLabel}</p>
          ) : null}
          {hasReplayContext && replayContext?.nodePathLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.nodePathLabel}</p>
          ) : null}
          {hasReplayContext && replayQuickDeltaLabels.length ? (
            <div className="studio-pro-tag-wrap">
              {replayQuickDeltaLabels.map((label) => (
                <span key={label} className="studio-pro-tag">
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          {hasReplayContext && replayContext?.directLinks?.length ? (
            <div className="studio-pro-compare-grid">
              {replayContext?.directLinks.map((item) => (
                <article key={`link:${item.id}`} className="studio-pro-compare-card">
                  <span className="studio-pro-metric-label">{item.label}</span>
                  <p className="studio-pro-metric-copy">{item.summary}</p>
                </article>
              ))}
            </div>
          ) : null}
          {hasReplayContext && replayDeltaItems.length ? (
            <div className="studio-pro-compare-grid">
              {replayDeltaItems.map((item) => (
                <article key={item.id} className="studio-pro-compare-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="studio-pro-metric-label">{item.label}</span>
                    <span className="studio-pro-compare-pill studio-pro-compare-pill-shifted">
                      {item.toneLabel}
                    </span>
                  </div>
                  <p className="studio-pro-metric-copy">{item.summary}</p>
                  {item.detail ? <p className="studio-pro-metric-copy">{item.detail}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
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
              : '当结果回流到专业版后，这里会提示当前快照如何回到控制区，以及下一轮会按当前工作台的 Provider / 模型继续执行。'}
          </p>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? keepsSameExecutionBaseline
                ? '当前 Provider、模型和执行路径与来源快照一致，更适合同基线复跑。'
                : '你已经改动了 Provider、模型或执行路径，下一轮会在来源快照基础上形成新的目标版执行链。'
              : '后续这里还会接入来源快照与当前控制区的自动差异提示。'}
          </p>
        </article>
      </div>
    </section>
  )
}
