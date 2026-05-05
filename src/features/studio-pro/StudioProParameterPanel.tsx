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
}

const qualityLabelMap: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  auto: '自动',
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
}: StudioProParameterPanelProps) {
  return (
    <section className="studio-pro-panel">
      <div className="studio-pro-panel-header">
        <div>
          <p className="eyebrow">Pro Parameters</p>
          <h4 className="studio-pro-panel-title">当前参数快照</h4>
        </div>
        <span className="status-pill">仅在专业版展示更完整参数</span>
      </div>

      <p className="studio-pro-panel-copy">
        当前工作台会把核心参数和执行上下文整理成一组快照，便于继续重跑和回看。
      </p>

      <div className="studio-pro-metric-grid">
        <article className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">任务模式</span>
          <strong className="studio-pro-metric-value">
            {studioMode === 'draw' ? '图片抽卡' : '创作生成'}
          </strong>
          <p className="studio-pro-metric-copy">
            {studioMode === 'draw'
              ? '当前会按抽卡队列执行多次生成。'
              : '当前按单次生成流程执行。'}
          </p>
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
      </div>
    </section>
  )
}
