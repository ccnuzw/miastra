import { StudioProParameterPanel } from '@/features/studio-pro/StudioProParameterPanel'
import { aspectOptions, qualityOptions, resolutionOptions } from './studio.constants'
import type { ResolutionTier } from './studio.types'

type ParameterPanelProps = {
  size: string
  aspectLabel: string
  selectedResolutionLabel: string
  resolutionTier: ResolutionTier
  quality: string
  stream: boolean
  onAspectChange: (value: string) => void
  onResolutionChange: (value: ResolutionTier) => void
  onQualityChange: (value: string) => void
  onStreamChange: (value: boolean) => void
  proPanel?: {
    studioMode: 'create' | 'draw'
    detailStrength: number
    detailTone: string
    referenceCount: number
  } | null
}

export function ParameterPanel(props: ParameterPanelProps) {
  if (props.proPanel) {
    return (
      <div className="parameter-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Core Controls</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-porcelain-50">常用参数</h3>
          </div>
          <span className="status-pill">高频参数优先展示</span>
        </div>

        <div className="parameter-top-row">
          <div className="field-block parameter-card aspect-card">
            <div className="flex items-center justify-between gap-3">
              <span className="field-label">画幅比例</span>
              <span className="param-value">{props.size}</span>
            </div>
            <div className="aspect-grid">
              {aspectOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => props.onAspectChange(option.label)}
                  className={`aspect-chip ${props.aspectLabel === option.label ? 'aspect-chip-active' : ''}`}
                >
                  <span>{option.label}</span>
                  <small>{option.note}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="field-block parameter-card resolution-card studio-balanced-card">
            <div className="flex items-center justify-between gap-3">
              <span className="field-label">分辨率档位</span>
              <span className="param-value">{props.selectedResolutionLabel}</span>
            </div>
            <div className="resolution-grid">
              {resolutionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => props.onResolutionChange(option.value)}
                  className={`resolution-chip ${props.resolutionTier === option.value ? 'resolution-chip-active' : ''}`}
                >
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>
            <p className="resolution-note">当前实际请求尺寸：{props.size}，需远端模型直接支持该尺寸。</p>
          </div>

          <div className="field-block parameter-card generation-card studio-balanced-card">
            <span className="field-label">生成设置</span>
            <div className="generation-controls">
              <div className="quality-grid">
                {qualityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => props.onQualityChange(option.value)}
                    className={`quality-chip ${props.quality === option.value ? 'quality-chip-active' : ''}`}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
              <div className="quality-note-row">
                {qualityOptions.map((option) => (
                  <span key={option.value} className="quality-note-pill">
                    {option.label} · {option.hint}
                  </span>
                ))}
              </div>
              <label className="stream-switch">
                <span className="switch-copy">
                  <strong>流式生成</strong>
                  <small>边生成边预览</small>
                </span>
                <input
                  checked={props.stream}
                  onChange={(event) => props.onStreamChange(event.target.checked)}
                  type="checkbox"
                />
                <span className="switch-track" aria-hidden="true">
                  <span className="switch-thumb" />
                </span>
              </label>
            </div>
          </div>
        </div>

        <StudioProParameterPanel
          studioMode={props.proPanel.studioMode}
          size={props.size}
          aspectLabel={props.aspectLabel}
          resolutionLabel={props.selectedResolutionLabel}
          quality={props.quality}
          stream={props.stream}
          detailStrength={props.proPanel.detailStrength}
          detailTone={props.proPanel.detailTone}
          referenceCount={props.proPanel.referenceCount}
        />
      </div>
    )
  }

  return (
    <div className="parameter-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Guide</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-porcelain-50">第二步 · 选一下你更偏向的效果</h3>
        </div>
        <span className="status-pill">不想纠结也没关系，默认已经能直接出图</span>
      </div>

      <div className="rounded-[1.55rem] border border-porcelain-50/10 bg-ink-950/[0.4] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-porcelain-50">画面比例</p>
            <p className="mt-1 text-sm leading-6 text-porcelain-100/48">先决定这张图更适合方图、竖图还是横图。</p>
          </div>
          <span className="param-value">{props.size}</span>
        </div>
        <div className="mt-4 aspect-grid">
          {aspectOptions.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => props.onAspectChange(option.label)}
              className={`aspect-chip ${props.aspectLabel === option.label ? 'aspect-chip-active' : ''}`}
            >
              <span>{option.note}</span>
              <small>{option.label}</small>
            </button>
          ))}
        </div>
      </div>

      <details className="rounded-[1.55rem] border border-porcelain-50/10 bg-ink-950/[0.35] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-porcelain-50">
          更多设置
        </summary>
        <p className="mt-2 text-sm leading-6 text-porcelain-100/48">
          需要更清楚、更多细节或边出边看时，再展开这里调整就够了。
        </p>

        <div className="parameter-top-row mt-4">
          <div className="field-block parameter-card resolution-card studio-balanced-card">
            <div className="flex items-center justify-between gap-3">
              <span className="field-label">清晰度</span>
              <span className="param-value">{props.selectedResolutionLabel}</span>
            </div>
            <div className="resolution-grid">
              {resolutionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => props.onResolutionChange(option.value)}
                  className={`resolution-chip ${props.resolutionTier === option.value ? 'resolution-chip-active' : ''}`}
                >
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>
            <p className="resolution-note">当前出图尺寸：{props.size}。想先快点看效果，选 1K 就够用。</p>
          </div>

          <div className="field-block parameter-card generation-card studio-balanced-card">
            <span className="field-label">生成节奏</span>
            <div className="generation-controls">
              <div className="quality-grid">
                {qualityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => props.onQualityChange(option.value)}
                    className={`quality-chip ${props.quality === option.value ? 'quality-chip-active' : ''}`}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
              <div className="quality-note-row">
                {qualityOptions.map((option) => (
                  <span key={option.value} className="quality-note-pill">
                    {option.label} · {option.hint}
                  </span>
                ))}
              </div>
              <label className="stream-switch">
                <span className="switch-copy">
                  <strong>边出边看</strong>
                  <small>生成过程中先看预览</small>
                </span>
                <input
                  checked={props.stream}
                  onChange={(event) => props.onStreamChange(event.target.checked)}
                  type="checkbox"
                />
                <span className="switch-track" aria-hidden="true">
                  <span className="switch-thumb" />
                </span>
              </label>
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}
