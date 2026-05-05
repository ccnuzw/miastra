import type { StudioProReplayContext, StudioProTemplateContext } from './studioPro.utils'
import { getStudioFlowSceneLabel } from '@/features/prompt-templates/studioFlowSemantic'

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
}

const qualityLabelMap: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  auto: '自动',
}

const drawStrategyLabelMap: Record<'linear' | 'smart' | 'turbo', string> = {
  linear: '线性',
  smart: '智能',
  turbo: '极速',
}

const variationStrengthLabelMap: Record<'low' | 'medium' | 'high', string> = {
  low: '低变体',
  medium: '中变体',
  high: '高变体',
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
}: StudioProParameterPanelProps) {
  const hasReplayContext = Boolean(replayContext)
  const drawModeCopy =
    studioMode === 'draw'
      ? `当前会按 ${drawCount} 次抽卡执行，策略 ${drawStrategyLabelMap[drawStrategy]}，并发 ${drawConcurrency}。`
      : '当前按单次生成流程执行，更适合先精调 Prompt 再重跑。'

  return (
    <section className="studio-pro-panel">
      <div className="studio-pro-panel-header">
        <div>
          <p className="eyebrow">Pro Parameters</p>
          <h4 className="studio-pro-panel-title">当前参数快照</h4>
        </div>
        <div className="studio-pro-pill-group">
          <span className="status-pill">{requestKindLabel}</span>
          <span className="status-pill">{stream ? '流式开启' : '流式关闭'}</span>
          {hasReplayContext ? <span className="status-pill">{replayContext?.actionLabel}</span> : null}
        </div>
      </div>

      <p className="studio-pro-panel-copy">
        当前工作台会把核心参数和执行上下文整理成一组快照，便于继续重跑和回看。
      </p>

      <div className="studio-pro-summary-strip">
        <span className="studio-pro-summary-pill">尺寸 {size}</span>
        <span className="studio-pro-summary-pill">比例 {aspectLabel}</span>
        <span className="studio-pro-summary-pill">分辨率 {resolutionLabel}</span>
        <span className="studio-pro-summary-pill">质量 {qualityLabelMap[quality] ?? quality}</span>
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
            {qualityLabelMap[quality] ?? quality}
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
              ? `策略 ${drawStrategyLabelMap[drawStrategy]} · 变体 ${variationStrengthLabelMap[variationStrength]} · 已启用 ${variationDimensionCount} 个变体维度。`
              : '当前优先按单轮参数执行，适合结合 Prompt 微调快速重跑。'}
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
              ? `已从${replayContext.sourceLabel}恢复${templateContext ? `「${getStudioFlowSceneLabel(templateContext.sceneId as never)}」` : ''}参数`
              : '等待从结果继续调整'}
          </strong>
          <p className="studio-pro-metric-copy">
            {replayContext
              ? `${replayContext.statusText}。${replayContext.hint}`
              : '当你从作品或任务回到专业版时，这里会提示可恢复的 Prompt、参数和参考图状态。'}
          </p>
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
          <p className="studio-pro-metric-copy">
            {templateContext
              ? `当前结构模板默认参数：${templateContext.defaultSettingsLabel}。关注字段：${templateContext.structureFields.join(' / ')}。复用参数时可以优先确认这些字段是否仍然成立。`
              : '当前没有结构模板基线，复用参数时建议先确认主体描述、尺寸和参考图关系是否仍然适用。'}
          </p>
        </article>

        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">参数差异对比预留</span>
          <strong className="studio-pro-metric-value">
            {hasReplayContext ? '上一版快照 vs 当前控制区' : '等待挂接一版结果作为对照基线'}
          </strong>
          <p className="studio-pro-metric-copy">
            这一块先为后续快照 diff 预留结构位，当前用于固定展示“来源快照”和“当前设置”的对照位置，避免后面再改版面。
          </p>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <article className="rounded-[1.2rem] border border-porcelain-50/[0.08] bg-ink-950/[0.72] p-4">
              <span className="studio-pro-metric-label">来源快照</span>
              <strong className="studio-pro-metric-value">
                {hasReplayContext ? replayContext?.snapshotId : '未接入'}
              </strong>
              <p className="studio-pro-metric-copy">
                {hasReplayContext
                  ? `${replayContext?.sourceProviderId} / ${replayContext?.sourceModelLabel} · ${replayContext?.sourceRequestKindLabel}`
                  : '从作品或任务恢复一版后，这里会固定显示来源 Provider、模型和执行路径。'}
              </p>
            </article>
            <article className="rounded-[1.2rem] border border-porcelain-50/[0.08] bg-ink-950/[0.72] p-4">
              <span className="studio-pro-metric-label">当前设置</span>
              <strong className="studio-pro-metric-value">
                {providerLabel} / {modelLabel}
              </strong>
              <p className="studio-pro-metric-copy">
                {size} · {resolutionLabel} · 质量 {qualityLabelMap[quality] ?? quality} ·{' '}
                {studioMode === 'draw' ? `${drawCount} 次抽卡` : '单次生成'}
              </p>
            </article>
          </div>
        </article>
      </div>
    </section>
  )
}
