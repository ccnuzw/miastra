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
  actionsDisabled?: boolean
  onApplyReplayPrompt?: () => void
  onApplyReplayParameters?: () => void
  onApplyReplayRoute?: () => void
  onApplyTemplatePrompt?: () => void
  onApplyTemplateDefaults?: () => void
  onRestoreTemplateStart?: () => void
  onRunReplayBaseline?: () => void
  onRunCurrentTarget?: () => void
  onClearReplayBaseline?: () => void
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
  actionsDisabled = false,
  onApplyReplayPrompt,
  onApplyReplayParameters,
  onApplyReplayRoute,
  onApplyTemplatePrompt,
  onApplyTemplateDefaults,
  onRestoreTemplateStart,
  onRunReplayBaseline,
  onRunCurrentTarget,
  onClearReplayBaseline,
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
      ? '目标版会直接形成新派生'
      : executionDecision.state === 'rerun' &&
          parameterDecision.state === 'rerun' &&
          promptDecision.state === 'rerun'
        ? '目标版接近同基线重跑'
        : '目标版先校准再继续'
  const currentVersionLabel =
    workspacePromptLength > 0 ? `工作区 ${workspacePromptLength} 字 · ${size}` : '当前控制区待补齐'
  const sourceVersionLabel = replayContext
    ? `${replayContext.sourceLabel} · 快照 ${replayContext.snapshotId}`
    : templateContext
      ? templateContext.title
      : '当前未接入来源版'
  const directLinkSummaries = replayContext?.directLinks?.slice(0, 3) ?? []
  const primaryReplayActionLabel = replayContext?.canAutoRerun ? '恢复来源基线并重跑' : '恢复来源基线'
  const canRunCurrentTarget = workspacePromptLength > 0 || referenceCount > 0

  function getDecisionPillClass(state: typeof promptDecision.state) {
    switch (state) {
      case 'rerun':
        return 'studio-pro-compare-pill-aligned'
      case 'calibrate':
        return 'studio-pro-compare-pill-shifted'
      case 'branch':
        return 'border-rose-300/25 bg-rose-300/[0.12] text-rose-200'
      default:
        return 'studio-pro-compare-pill-missing'
    }
  }

  const nextStepRows = [
    {
      id: 'prompt',
      label: '1. Prompt',
      stateLabel: promptDecision.stateLabel,
      summary: promptDecision.primaryAction,
      detail: promptDecision.summary,
      relation:
        replayContext?.promptLabel ??
        (templateContext ? `模板起跑线：${templateContext.recommendedNextStep}` : workspaceBaseline.deltaLabel),
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
      stateLabel: parameterDecision.stateLabel,
      summary: parameterDecision.primaryAction,
      detail: parameterDecision.summary,
      relation:
        replayContext?.parameterLabel ??
        (templateContext
          ? `模板默认参数：${templateContext.defaultSettingsLabel}`
          : `${aspectLabel} · ${resolutionLabel} · 质量 ${quality}`),
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
      stateLabel: executionDecision.stateLabel,
      summary: executionDecision.primaryAction,
      detail: executionDecision.summary,
      relation:
        replayContext?.sourceDeltaLabel ??
        `${providerLabel} / ${modelLabel} · ${requestKindLabel}`,
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
        先看来源版，再看当前版，最后决定目标版是同基线重跑、沿当前版校准，还是直接沉成新派生。
      </p>

      {replayContext ? (
        <article className="studio-pro-metric-card mt-4 studio-pro-emphasis-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="studio-pro-metric-label">版本快决策</span>
              <strong className="studio-pro-metric-value">{replayContext.recommendedActionLabel}</strong>
            </div>
            <span className="status-pill">{replayContext.sourceKindLabel}</span>
          </div>
          <p className="studio-pro-metric-copy">{replayContext.decisionSummary}</p>
          <p className="studio-pro-metric-copy">{replayContext.actionDecisionReason}</p>
          <p className="studio-pro-metric-copy">
            先看：
            {replayContext.directLinks
              .filter(
                (item) =>
                  item.id === 'guided' ||
                  item.id === 'parameters' ||
                  item.id === 'references' ||
                  item.id === 'prompt',
              )
              .slice(0, 2)
              .map((item) => item.label.replace(/\s*直达$/, ''))
              .join(' / ') || '参数 / 参考'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {replayContext.quickDeltaLabels.slice(0, 3).map((label) => (
              <span key={`${replayContext.snapshotId}:${label}`} className="status-pill">
                {label}
              </span>
            ))}
          </div>
        </article>
      ) : null}

      <div className="studio-pro-console-strip xl:grid-cols-3">
        <article className={`studio-pro-console-card ${replayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">来源版</span>
          <strong className="studio-pro-metric-value">{sourceVersionLabel}</strong>
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
          <strong className="studio-pro-metric-value">{currentVersionLabel}</strong>
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
          <p className="studio-pro-metric-copy">{promptDecision.recommendation}</p>
          <p className="studio-pro-metric-copy">{parameterDecision.recommendation}</p>
          <p className="studio-pro-metric-copy">{executionDecision.recommendation}</p>
        </article>
      </div>

      <div className="studio-pro-action-cluster">
        {replayContext ? (
          <button
            type="button"
            className="generate-button"
            onClick={onRunReplayBaseline}
            disabled={actionsDisabled || !onRunReplayBaseline}
          >
            {primaryReplayActionLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="generate-button"
          onClick={onRunCurrentTarget}
          disabled={actionsDisabled || !onRunCurrentTarget || !canRunCurrentTarget}
        >
          按当前版生成目标版
        </button>
        {templateContext && !replayContext ? (
          <button
            type="button"
            className="settings-button"
            onClick={onRestoreTemplateStart}
            disabled={actionsDisabled || !onRestoreTemplateStart}
          >
            回到模板起跑线
          </button>
        ) : null}
        {replayContext ? (
          <button
            type="button"
            className="settings-button"
            onClick={onClearReplayBaseline}
            disabled={actionsDisabled || !onClearReplayBaseline}
          >
            解除来源绑定
          </button>
        ) : null}
      </div>

      {replayContext ? (
        <article className="studio-pro-metric-card mt-4 studio-pro-emphasis-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="studio-pro-metric-label">来源版 / 当前版 / 目标版直达关系</span>
              <strong className="studio-pro-metric-value">{replayContext.nodePathLabel}</strong>
            </div>
            <span className="studio-pro-compare-pill studio-pro-compare-pill-aligned">
              {replayContext.recommendedActionLabel}
            </span>
          </div>
          <p className="studio-pro-metric-copy">{replayContext.currentLabel}</p>
          <p className="studio-pro-metric-copy">{replayContext.parentDeltaLabel}</p>
          <p className="studio-pro-metric-copy">{replayContext.sourceDeltaLabel}</p>
          {directLinkSummaries.length ? (
            <div className="studio-pro-compare-grid">
              {directLinkSummaries.map((item) => (
                <article key={`direct:${item.id}`} className="studio-pro-compare-card">
                  <span className="studio-pro-metric-label">{item.label}</span>
                  <p className="studio-pro-metric-copy">{item.summary}</p>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      ) : null}

      <div className="studio-pro-metric-grid xl:grid-cols-3">
        {nextStepRows.map((step) => (
          <article key={step.id} className="studio-pro-metric-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="studio-pro-metric-label">{step.label}</span>
              <span className={`studio-pro-compare-pill ${getDecisionPillClass(
                step.id === 'prompt'
                  ? promptDecision.state
                  : step.id === 'parameters'
                    ? parameterDecision.state
                    : executionDecision.state,
              )}`}>
                {step.stateLabel}
              </span>
            </div>
            <strong className="studio-pro-metric-value">{step.summary}</strong>
            <p className="studio-pro-metric-copy">{step.detail}</p>
            <p className="studio-pro-metric-copy">{step.relation}</p>
            {step.actionLabel && step.onAction ? (
              <div className="studio-pro-action-cluster">
                <button
                  type="button"
                  className="settings-button"
                  onClick={step.onAction}
                  disabled={actionsDisabled}
                >
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
