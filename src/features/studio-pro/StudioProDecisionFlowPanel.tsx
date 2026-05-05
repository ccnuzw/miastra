import {
  buildStudioProExecutionComparisonItems,
  buildStudioProExecutionDecision,
  buildStudioProParameterDecision,
  buildStudioProParameterReplayComparisonItems,
  buildStudioProPromptDecision,
  buildStudioProTemplateParameterComparisonItems,
  summarizeStudioProComparisons,
  type StudioProPromptFieldAlignmentItem,
  type StudioProReplayContext,
  type StudioProTemplateContext,
  type StudioProTextComparison,
} from './studioPro.utils'

type StudioProDecisionFlowPanelProps = {
  workspacePromptLength: number
  fieldAlignment: StudioProPromptFieldAlignmentItem[]
  workspaceBaseline: StudioProTextComparison
  finalPromptBaseline: StudioProTextComparison
  templateContext?: StudioProTemplateContext | null
  replayContext?: StudioProReplayContext | null
  studioMode: 'create' | 'draw'
  size: string
  aspectLabel: string
  resolutionLabel: string
  quality: string
  stream: boolean
  referenceCount: number
  drawCount: number
  drawStrategy: 'linear' | 'smart' | 'turbo'
  drawConcurrency: number
  providerId: string
  providerLabel: string
  modelLabel: string
  requestKindLabel: string
  onApplyReplayPrompt?: () => void
  onApplyReplayParameters?: () => void
  onApplyReplayRoute?: () => void
  onApplyTemplatePrompt?: () => void
  onApplyTemplateDefaults?: () => void
}

export function StudioProDecisionFlowPanel({
  workspacePromptLength,
  fieldAlignment,
  workspaceBaseline,
  finalPromptBaseline,
  templateContext = null,
  replayContext = null,
  studioMode,
  size,
  aspectLabel,
  resolutionLabel,
  quality,
  stream,
  referenceCount,
  drawCount,
  drawStrategy,
  drawConcurrency,
  providerId,
  providerLabel,
  modelLabel,
  requestKindLabel,
  onApplyReplayPrompt,
  onApplyReplayParameters,
  onApplyReplayRoute,
  onApplyTemplatePrompt,
  onApplyTemplateDefaults,
}: StudioProDecisionFlowPanelProps) {
  const promptDecision = buildStudioProPromptDecision({
    templateContext,
    replayContext,
    fieldAlignment,
    workspaceBaseline,
    finalPromptBaseline,
    workspacePromptLength,
  })
  const parameterReplayComparisonItems = buildStudioProParameterReplayComparisonItems({
    studioMode,
    size,
    resolutionLabel,
    quality,
    stream,
    referenceCount,
    drawCount,
    drawStrategy,
    drawConcurrency,
    replayContext,
  })
  const parameterReplayComparisonSummary = summarizeStudioProComparisons(parameterReplayComparisonItems)
  const templateParameterComparisonItems = buildStudioProTemplateParameterComparisonItems({
    aspectLabel,
    resolutionLabel,
    quality,
    templateContext,
  })
  const templateParameterComparisonSummary = summarizeStudioProComparisons(templateParameterComparisonItems)
  const parameterDecision = buildStudioProParameterDecision({
    templateContext,
    replayContext,
    replayComparisonItems: parameterReplayComparisonItems,
    replayComparisonSummary: parameterReplayComparisonSummary,
    templateComparisonItems: templateParameterComparisonItems,
    templateComparisonSummary: templateParameterComparisonSummary,
    studioMode,
    referenceCount,
  })
  const executionComparisonItems = buildStudioProExecutionComparisonItems({
    providerId,
    modelLabel,
    requestKindLabel,
    replayContext,
  })
  const executionComparisonSummary = summarizeStudioProComparisons(executionComparisonItems)
  const keepsSameExecutionBaseline =
    replayContext?.sourceProviderId === providerId &&
    replayContext?.sourceModelLabel === modelLabel &&
    replayContext?.sourceRequestKindLabel === requestKindLabel
  const executionDecision = buildStudioProExecutionDecision({
    replayContext,
    executionComparisonItems,
    executionComparisonSummary,
    keepsSameExecutionBaseline,
  })
  const targetLabel =
    executionDecision.state === 'branch' ||
    parameterDecision.state === 'branch' ||
    promptDecision.state === 'branch'
      ? '目标版会作为新派生继续'
      : executionDecision.state === 'rerun' &&
          parameterDecision.state === 'rerun' &&
          promptDecision.state === 'rerun'
        ? '目标版接近同基线重跑'
        : '目标版先做小步校准再继续'

  const nextStepRows = [
    {
      id: 'prompt',
      label: '1. Prompt',
      summary: promptDecision.primaryAction,
      detail: promptDecision.summary,
      actionLabel: replayContext
        ? '恢复来源 Prompt'
        : templateContext
          ? '恢复模板 Prompt'
          : '',
      onAction: replayContext ? onApplyReplayPrompt : templateContext ? onApplyTemplatePrompt : undefined,
    },
    {
      id: 'parameters',
      label: '2. 参数',
      summary: parameterDecision.primaryAction,
      detail: parameterDecision.summary,
      actionLabel: replayContext
        ? '恢复来源参数'
        : templateContext
          ? '恢复模板参数'
          : '',
      onAction: replayContext ? onApplyReplayParameters : templateContext ? onApplyTemplateDefaults : undefined,
    },
    {
      id: 'execution',
      label: '3. 执行',
      summary: executionDecision.primaryAction,
      detail: executionDecision.summary,
      actionLabel: replayContext ? '恢复来源执行链' : '',
      onAction: replayContext ? onApplyReplayRoute : undefined,
    },
  ]

  return (
    <section className="studio-pro-panel">
      <div className="studio-pro-panel-header">
        <div>
          <p className="eyebrow">Decision Flow</p>
          <h4 className="studio-pro-panel-title">来源版 / 当前版 / 目标版</h4>
        </div>
        <div className="studio-pro-pill-group">
          {replayContext ? <span className="status-pill">{replayContext.actionLabel}</span> : null}
          {templateContext ? <span className="status-pill">{templateContext.title}</span> : null}
          <span className="status-pill">{targetLabel}</span>
        </div>
      </div>

      <p className="studio-pro-panel-copy">
        先确定这一轮到底是在复现来源版、沿当前版做小步校准，还是把当前控制区直接推进成目标版分支。
      </p>

      <div className="studio-pro-console-strip">
        <article className={`studio-pro-console-card ${replayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">来源版</span>
          <strong className="studio-pro-metric-value">
            {replayContext ? `${replayContext.sourceLabel} · 快照 ${replayContext.snapshotId}` : '当前未接入来源版'}
          </strong>
          <p className="studio-pro-metric-copy">
            {replayContext
              ? `${replayContext.originLabel}。${replayContext.deltaHeadline}`
              : '从作品或任务回流后，这里会固定显示来源版，帮助缩短“先看哪一版”的判断路径。'}
          </p>
          {replayContext?.nodePathLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.nodePathLabel}</p>
          ) : null}
        </article>

        <article className="studio-pro-console-card studio-pro-emphasis-card">
          <span className="studio-pro-metric-label">当前版</span>
          <strong className="studio-pro-metric-value">
            {workspacePromptLength ? `工作区 ${workspacePromptLength} 字 · ${size}` : '当前控制区待补齐'}
          </strong>
          <p className="studio-pro-metric-copy">
            当前版先消费 Prompt，再消费参数，最后决定执行链，这样更容易判断每一步是不是刻意偏离来源。
          </p>
          <p className="studio-pro-metric-copy">
            {referenceCount > 0 ? `已带 ${referenceCount} 张参考图` : '当前无参考图'} · {providerLabel} / {modelLabel} · {requestKindLabel}
          </p>
        </article>

        <article className="studio-pro-console-card">
          <span className="studio-pro-metric-label">目标版</span>
          <strong className="studio-pro-metric-value">{targetLabel}</strong>
          <p className="studio-pro-metric-copy">
            {promptDecision.recommendation}
          </p>
          <p className="studio-pro-metric-copy">
            {parameterDecision.recommendation}
          </p>
        </article>
      </div>

      <div className="studio-pro-metric-grid">
        {nextStepRows.map((step) => (
          <article key={step.id} className="studio-pro-metric-card">
            <span className="studio-pro-metric-label">{step.label}</span>
            <strong className="studio-pro-metric-value">{step.summary}</strong>
            <p className="studio-pro-metric-copy">{step.detail}</p>
            {step.actionLabel && step.onAction ? (
              <div className="studio-pro-action-cluster">
                <button type="button" className="settings-button" onClick={step.onAction}>
                  {step.actionLabel}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
