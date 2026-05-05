import type { StudioProReplayContext, StudioProTemplateContext } from './studioPro.utils'
import {
  buildStudioProParameterDecision,
  buildStudioProParameterReplayComparisonItems,
  buildStudioProTemplateParameterComparisonItems,
  getStudioProDrawStrategyLabel,
  getStudioProQualityLabel,
  getStudioProVariationStrengthLabel,
  summarizeStudioProComparisons,
} from './studioPro.utils'

type StudioProParameterPanelProps = {
  studioMode: 'create' | 'draw'
  size: string
  aspectLabel: string
  resolutionLabel: string
  quality: string
  stream: boolean
  detailStrength: number
  detailTone: string
  referenceCount: number
  requestKindLabel: string
  drawCount: number
  drawStrategy: 'linear' | 'smart' | 'turbo'
  drawConcurrency: number
  drawDelayMs: number
  drawRetries: number
  drawTimeoutSec: number
  variationStrength: 'low' | 'medium' | 'high'
  variationDimensionCount: number
  providerLabel: string
  modelLabel: string
  templateContext?: StudioProTemplateContext | null
  replayContext?: StudioProReplayContext | null
  onApplyTemplateDefaults?: () => void
  onApplyReplayParameters?: () => void
  onRestoreSourceExecution?: () => void
}

export function StudioProParameterPanel({
  studioMode,
  size,
  aspectLabel,
  resolutionLabel,
  quality,
  stream,
  detailStrength,
  detailTone,
  referenceCount,
  requestKindLabel,
  drawCount,
  drawStrategy,
  drawConcurrency,
  drawDelayMs,
  drawRetries,
  drawTimeoutSec,
  variationStrength,
  variationDimensionCount,
  providerLabel,
  modelLabel,
  templateContext = null,
  replayContext = null,
  onApplyTemplateDefaults,
  onApplyReplayParameters,
  onRestoreSourceExecution,
}: StudioProParameterPanelProps) {
  const hasReplayContext = Boolean(replayContext)
  const hasTemplateContext = Boolean(templateContext)
  const drawModeCopy =
    studioMode === 'draw'
      ? `当前会按 ${drawCount} 次抽卡执行，策略 ${getStudioProDrawStrategyLabel(drawStrategy)}，并发 ${drawConcurrency}。`
      : '当前按单次生成流程执行，更适合先精调 Prompt 再重跑。'
  const replayComparisonItems = buildStudioProParameterReplayComparisonItems({
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
  const replayComparisonSummary = summarizeStudioProComparisons(replayComparisonItems)
  const templateComparisonItems = buildStudioProTemplateParameterComparisonItems({
    aspectLabel,
    resolutionLabel,
    quality,
    templateContext,
  })
  const templateComparisonSummary = summarizeStudioProComparisons(templateComparisonItems)
  const parameterDecision = buildStudioProParameterDecision({
    templateContext,
    replayContext,
    replayComparisonItems,
    replayComparisonSummary,
    templateComparisonItems,
    templateComparisonSummary,
    studioMode,
    referenceCount,
  })
  const replayReferenceStatus =
    replayContext && replayContext.expectedReferenceCount > 0
      ? `参考图恢复 ${replayContext.restoredReferenceCount}/${replayContext.expectedReferenceCount} 张`
      : replayContext?.referenceSummaryLabel ?? '这一版没有参考图依赖'
  const replayRecommendedActionLabel = replayContext?.recommendedActionLabel ?? ''
  const replayDecisionSummary = replayContext?.decisionSummary ?? ''
  const replayActionDecisionReason = replayContext?.actionDecisionReason ?? ''

  function getDecisionPillClass(state: typeof parameterDecision.state) {
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
    <section className="studio-pro-panel">
      <div className="studio-pro-panel-header">
        <div>
          <p className="eyebrow">Pro Parameters</p>
          <h4 className="studio-pro-panel-title">先收紧参数，再决定是否重跑</h4>
        </div>
        <div className="studio-pro-pill-group">
          <span className="status-pill">{requestKindLabel}</span>
          <span className="status-pill">{stream ? '流式开启' : '流式关闭'}</span>
          {hasReplayContext ? <span className="status-pill">{replayContext?.actionLabel}</span> : null}
        </div>
      </div>

      <p className="studio-pro-panel-copy">
        参数区先消费来源版和模板默认值，再看当前控制区偏了几项，这样更容易判断本轮是校准还是派生。
      </p>

      <article
        className={`mt-4 rounded-[1.35rem] border p-4 ${
          parameterDecision.state === 'rerun'
            ? 'border-signal-cyan/25 bg-signal-cyan/[0.08]'
            : parameterDecision.state === 'calibrate'
              ? 'border-amber-300/20 bg-amber-300/[0.08]'
              : parameterDecision.state === 'branch'
                ? 'border-rose-300/20 bg-rose-300/[0.08]'
                : 'border-porcelain-50/10 bg-ink-950/[0.48]'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="studio-pro-metric-label">参数决策台</span>
            <strong className="studio-pro-metric-value">{parameterDecision.title}</strong>
          </div>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getDecisionPillClass(parameterDecision.state)}`}>
            {parameterDecision.stateLabel}
          </span>
        </div>
        <p className="studio-pro-metric-copy">{parameterDecision.summary}</p>
        <p className="studio-pro-metric-copy">{parameterDecision.recommendation}</p>
        {replayContext ? (
          <>
            <p className="studio-pro-metric-copy">版本建议：{replayRecommendedActionLabel}</p>
            <p className="studio-pro-metric-copy">{replayDecisionSummary}</p>
            <p className="studio-pro-metric-copy">{replayActionDecisionReason}</p>
          </>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="status-pill">主动作：{parameterDecision.primaryAction}</span>
          {parameterDecision.secondaryAction ? (
            <span className="status-pill">{parameterDecision.secondaryAction}</span>
          ) : null}
        </div>
        {parameterDecision.focusItems.length ? (
          <div className="mt-4 grid gap-2 xl:grid-cols-3">
            {parameterDecision.focusItems.map((item) => (
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
        <article className={`studio-pro-console-card ${hasTemplateContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">模板默认参数</span>
          <strong className="studio-pro-metric-value">
            {templateContext ? templateContext.defaultSettingsLabel : '当前无模板默认基线'}
          </strong>
          <p className="studio-pro-metric-copy">
            {templateContext
              ? `模板字段 ${templateContext.structureFields.join(' / ')} 对应的默认画幅、分辨率和质量，会作为这类场景的首轮复用基线。`
              : '从模板进入专业版后，这里会提供一键恢复默认参数，帮助你快速回到场景标准起跑线。'}
          </p>
          <div className="studio-pro-action-cluster">
            <button
              type="button"
              className="settings-button"
              onClick={onApplyTemplateDefaults}
              disabled={!templateContext || !onApplyTemplateDefaults}
            >
              恢复模板默认参数
            </button>
          </div>
        </article>
        <article className={`studio-pro-console-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">来源版参数</span>
          <strong className="studio-pro-metric-value">
            {hasReplayContext
              ? `${replayContext?.sourceSize} · 质量 ${getStudioProQualityLabel(replayContext?.sourceQuality)}`
              : '当前未挂接来源快照'}
          </strong>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? '当你把结果带回控制区时，可以先恢复上一版参数快照，再决定是同基线重跑，还是改动参数形成目标版。'
              : '从结果回流后，这里会提供参数快照恢复入口，帮助你直接接着上一版继续控制。'}
          </p>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? replayContext?.hasCompleteReferenceRestore
                ? `${replayReferenceStatus}，当前参数恢复是完整的。`
                : `${replayReferenceStatus}，请先补齐参考图，再判断是否直接重跑。`
              : '当前没有来源快照时，这里不会假定任何旧参数或参考图基线。'}
          </p>
          {hasReplayContext ? (
            <p className="studio-pro-metric-copy">
              动作建议：{replayRecommendedActionLabel}。{replayDecisionSummary}
            </p>
          ) : null}
          {replayContext?.deltaHeadline ? (
            <p className="studio-pro-metric-copy">{replayContext.deltaHeadline}</p>
          ) : null}
          {replayContext?.parentDeltaLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.parentDeltaLabel}</p>
          ) : null}
          {replayContext?.directLinks?.length ? (
            <div className="studio-pro-compare-grid">
              {replayContext?.directLinks
                .filter((item) => item.id === 'parameters' || item.id === 'references')
                .map((item) => (
                  <article key={`direct:${item.id}`} className="studio-pro-compare-card">
                    <span className="studio-pro-metric-label">{item.label}</span>
                    <p className="studio-pro-metric-copy">{item.summary}</p>
                  </article>
                ))}
            </div>
          ) : null}
          <div className="studio-pro-action-cluster">
            <button
              type="button"
              className="settings-button"
              onClick={onApplyReplayParameters}
              disabled={!replayContext || !onApplyReplayParameters}
            >
              恢复来源参数
            </button>
            <button
              type="button"
              className="settings-button"
              onClick={onRestoreSourceExecution}
              disabled={!replayContext || !onRestoreSourceExecution}
            >
              对齐来源执行基线
            </button>
          </div>
        </article>
      </div>

      <div className="studio-pro-summary-strip">
        <span className="studio-pro-summary-pill">尺寸 {size}</span>
        <span className="studio-pro-summary-pill">比例 {aspectLabel}</span>
        <span className="studio-pro-summary-pill">分辨率 {resolutionLabel}</span>
        <span className="studio-pro-summary-pill">质量 {getStudioProQualityLabel(quality)}</span>
        <span className="studio-pro-summary-pill">参考图 {referenceCount} 张</span>
        <span className="studio-pro-summary-pill">
          {studioMode === 'draw' ? `${drawCount} 次抽卡` : '单次生成'}
        </span>
      </div>

      <div className="studio-pro-metric-grid">
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">任务模式</span>
          <strong className="studio-pro-metric-value">
            {studioMode === 'draw' ? '图片抽卡' : '创作生成'}
          </strong>
          <p className="studio-pro-metric-copy">{drawModeCopy}</p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">输出尺寸</span>
          <strong className="studio-pro-metric-value">{size}</strong>
          <p className="studio-pro-metric-copy">
            画幅 {aspectLabel} · 分辨率档位 {resolutionLabel}
          </p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">质量与返回</span>
          <strong className="studio-pro-metric-value">
            {getStudioProQualityLabel(quality)}
          </strong>
          <p className="studio-pro-metric-copy">
            {stream
              ? '流式生成已开启，结果会边出边预览。'
              : '流式生成已关闭，等待完整结果返回。'}
          </p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">细节强度</span>
          <strong className="studio-pro-metric-value">{detailStrength}%</strong>
          <p className="studio-pro-metric-copy">
            {detailTone}倾向，会进入最终 Prompt 作为细节控制说明。
          </p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">输入参考</span>
          <strong className="studio-pro-metric-value">{referenceCount} 张</strong>
          <p className="studio-pro-metric-copy">
            {referenceCount > 0
              ? '当前按图生图路径附带参考图输入。'
              : '当前未附带参考图，按文生图路径执行。'}
          </p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">执行策略</span>
          <strong className="studio-pro-metric-value">{requestKindLabel}</strong>
          <p className="studio-pro-metric-copy">
            {studioMode === 'draw'
              ? `策略 ${getStudioProDrawStrategyLabel(drawStrategy)} · 变体 ${getStudioProVariationStrengthLabel(variationStrength)} · 已启用 ${variationDimensionCount} 个变体维度。`
              : '当前优先按单轮参数执行，适合在 Prompt 收紧后快速重跑。'}
          </p>
        </article>
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">批量与重试</span>
          <strong className="studio-pro-metric-value">
            {studioMode === 'draw' ? `${drawCount} 次 · 并发 ${drawConcurrency}` : '单轮直出'}
          </strong>
          <p className="studio-pro-metric-copy">
            {studioMode === 'draw'
              ? `任务间隔 ${drawDelayMs}ms，失败重试 ${drawRetries} 次，单任务超时 ${drawTimeoutSec}s。`
              : '当前不会拆成抽卡队列，参数会直接进入本轮请求。'}
          </p>
        </article>
        <article className={`studio-pro-metric-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">结果回到控制区</span>
          <strong className="studio-pro-metric-value">
            {replayContext
              ? `已从${replayContext.sourceLabel}恢复${templateContext ? `「${templateContext.sceneLabel}」` : ''}参数`
              : '等待从结果继续调整'}
          </strong>
          <p className="studio-pro-metric-copy">
            {replayContext
              ? `${replayContext.statusText}。${replayContext.hint}`
              : '当你从作品或任务回到专业版时，这里会提示可恢复的 Prompt、参数和参考图状态。'}
          </p>
          {replayContext ? (
            <p className="studio-pro-metric-copy">{replayContext.actionDecisionReason}</p>
          ) : null}
          {replayContext ? (
            <p className="studio-pro-metric-copy">{replayReferenceStatus}</p>
          ) : null}
          {replayContext?.sourceKindLabel ? (
            <p className="studio-pro-metric-copy">
              来源链路：{replayContext.sourceKindLabel} · {replayContext.sceneLabel ?? replayContext.scene?.label ?? '未记录场景'}
            </p>
          ) : null}
          {replayContext?.deltaHeadline ? (
            <p className="studio-pro-metric-copy">{replayContext.deltaHeadline}</p>
          ) : null}
          {replayContext?.sourceDeltaLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.sourceDeltaLabel}</p>
          ) : null}
          {replayContext?.quickDeltaLabels?.length ? (
            <div className="studio-pro-tag-wrap">
              {replayContext.quickDeltaLabels.map((label) => (
                <span key={label} className="studio-pro-tag">
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          {replayContext?.nodePathLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.nodePathLabel}</p>
          ) : null}
          {replayContext?.currentLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.currentLabel}</p>
          ) : null}
          {replayContext?.parentLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.parentLabel}</p>
          ) : null}
          {replayContext?.ancestorLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.ancestorLabel}</p>
          ) : null}
          {replayContext?.guidedFlowLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.guidedFlowLabel}</p>
          ) : null}
        </article>
      </div>

      <div className="studio-pro-meta-grid">
        <article className={`studio-pro-metric-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">参数快照复用提示</span>
          <strong className="studio-pro-metric-value">
            {hasReplayContext ? `优先沿用快照 ${replayContext?.snapshotId}` : '当前设置会沉淀为下一轮快照'}
          </strong>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? `如果继续沿用 ${providerLabel} / ${modelLabel}，这组参数最适合同基线重跑；如果改尺寸、质量、抽卡策略或 Provider，会自然形成新的派生版本。`
              : '本轮生成完成后，尺寸、质量、参考图、抽卡策略和执行方式会一起进入结果快照，后续可一键带回专业版继续调整。'}
          </p>
          {hasReplayContext && !replayContext?.hasCompleteReferenceRestore ? (
            <p className="studio-pro-metric-copy">
              由于参考图没有完整回流，这次更适合先补齐输入条件，再决定是否严格复现来源版。
            </p>
          ) : null}
          {replayContext?.parameterLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.parameterLabel}</p>
          ) : null}
          {replayContext?.referenceSummaryLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.referenceSummaryLabel}</p>
          ) : null}
          {replayContext?.deltaItems.length ? (
            <div className="studio-pro-compare-grid">
              {replayContext.deltaItems
                .filter((item) => item.id === 'parameters' || item.id === 'references' || item.id === 'retry')
                .map((item) => (
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
          <p className="studio-pro-metric-copy">
            {templateContext
              ? `当前结构模板默认参数：${templateContext.defaultSettingsLabel}。关注字段：${templateContext.structureFields.join(' / ')}。复用参数时可以优先确认这些字段是否仍然成立。`
              : '当前没有结构模板基线，复用参数时建议先确认主体描述、尺寸和参考图关系是否仍然适用。'}
          </p>
        </article>

        <article className={`studio-pro-metric-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="studio-pro-metric-label">来源快照校准</span>
              <strong className="studio-pro-metric-value">{replayComparisonSummary.summary}</strong>
            </div>
            <span
              className={`studio-pro-compare-pill ${
                replayComparisonSummary.status === 'aligned'
                  ? 'studio-pro-compare-pill-aligned'
                  : replayComparisonSummary.status === 'shifted'
                    ? 'studio-pro-compare-pill-shifted'
                    : 'studio-pro-compare-pill-missing'
              }`}
            >
              {replayComparisonSummary.statusLabel}
            </span>
          </div>
          <p className="studio-pro-metric-copy">{replayComparisonSummary.suggestion}</p>
          <p className="studio-pro-metric-copy">建议动作：{parameterDecision.primaryAction}</p>
          <div className="studio-pro-compare-grid">
            {replayComparisonItems.length ? (
              replayComparisonItems.map((item) => (
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
                    {item.status === 'shifted' ? '下一步：先确认这是不是刻意派生。' : '下一步：这一项可以先保持不动。'}
                  </p>
                </article>
              ))
            ) : (
              <article className="studio-pro-compare-card">
                <span className="studio-pro-metric-label">等待来源快照</span>
                <strong className="studio-pro-metric-value">还没有可对照的参数基线</strong>
                <p className="studio-pro-metric-copy">
                  从作品或任务恢复一版后，这里会固定显示来源参数和当前控制区的差异。
                </p>
              </article>
            )}
          </div>
        </article>

        <article className={`studio-pro-metric-card ${hasTemplateContext ? 'studio-pro-emphasis-card' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="studio-pro-metric-label">模板默认值校准</span>
              <strong className="studio-pro-metric-value">
                {hasTemplateContext ? templateComparisonSummary.summary : '当前未绑定模板默认参数'}
              </strong>
            </div>
            {hasTemplateContext ? (
              <span
                className={`studio-pro-compare-pill ${
                  templateComparisonSummary.status === 'aligned'
                    ? 'studio-pro-compare-pill-aligned'
                    : templateComparisonSummary.status === 'shifted'
                      ? 'studio-pro-compare-pill-shifted'
                      : 'studio-pro-compare-pill-missing'
                }`}
              >
                {templateComparisonSummary.statusLabel}
              </span>
            ) : null}
          </div>
          <p className="studio-pro-metric-copy">
            {hasTemplateContext
              ? templateComparisonSummary.suggestion
              : '从模板进入专业版后，这里会告诉你当前参数和模板默认起跑线差了几项。'}
          </p>
          {hasTemplateContext ? (
            <div className="studio-pro-compare-grid">
              {templateComparisonItems.map((item) => (
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
                  <p className="studio-pro-metric-copy">模板：{item.baselineValue}</p>
                  <p className="studio-pro-metric-copy">当前：{item.currentValue}</p>
                  <p className="studio-pro-metric-copy">{item.hint}</p>
                  <p className="studio-pro-metric-copy">
                    {item.status === 'shifted' ? '下一步：如需回模板起跑线，可优先恢复这一项。' : '下一步：这一项可以继续沿用当前值。'}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  )
}
