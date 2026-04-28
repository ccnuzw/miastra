import type { ResolutionTier } from './studio.types'
import { aspectOptions, qualityOptions, resolutionOptions } from './studio.constants'

type ParameterPanelProps = {
  size: string
  aspectLabel: string
  selectedResolutionLabel: string
  resolutionTier: ResolutionTier
  quality: string
  stream: boolean
  detailStrength: number
  detailTone: string
  negativePrompt: string
  onAspectChange: (value: string) => void
  onResolutionChange: (value: ResolutionTier) => void
  onQualityChange: (value: string) => void
  onStreamChange: (value: boolean) => void
  onDetailStrengthChange: (value: number) => void
  onNegativePromptChange: (value: string) => void
}

export function ParameterPanel(props: ParameterPanelProps) {
  return (
    <div className="parameter-panel">
      <div className="parameter-top-row">
        <div className="field-block parameter-card aspect-card">
          <div className="flex items-center justify-between gap-3">
            <span className="field-label">画幅比例</span>
            <span className="param-value">{props.size}</span>
          </div>
          <div className="aspect-grid">
            {aspectOptions.map((option) => (
              <button key={option.label} type="button" onClick={() => props.onAspectChange(option.label)} className={`aspect-chip ${props.aspectLabel === option.label ? 'aspect-chip-active' : ''}`}>
                <span>{option.label}</span>
                <small>{option.note}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="field-block parameter-card resolution-card">
          <div className="flex items-center justify-between gap-3">
            <span className="field-label">分辨率档位</span>
            <span className="param-value">{props.selectedResolutionLabel}</span>
          </div>
          <div className="resolution-grid">
            {resolutionOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => props.onResolutionChange(option.value)} className={`resolution-chip ${props.resolutionTier === option.value ? 'resolution-chip-active' : ''}`}>
                <span>{option.label}</span>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
          <p className="resolution-note">当前实际请求尺寸：{props.size}，需远端模型或兼容层支持该尺寸。</p>
        </div>

        <div className="field-block parameter-card generation-card">
          <span className="field-label">生成设置</span>
          <div className="generation-controls">
            <div className="quality-grid">
              {qualityOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => props.onQualityChange(option.value)} className={`quality-chip ${props.quality === option.value ? 'quality-chip-active' : ''}`}>
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>
            <label className="stream-switch">
              <span className="switch-copy">
                <strong>流式生成</strong>
                <small>边生成边预览</small>
              </span>
              <input checked={props.stream} onChange={(event) => props.onStreamChange(event.target.checked)} type="checkbox" />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="field-block detail-control">
        <div className="flex items-center justify-between gap-3">
          <span className="field-label">细节强度</span>
          <span className="param-value">{props.detailStrength}% · {props.detailTone}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={props.detailStrength}
          onChange={(event) => props.onDetailStrengthChange(Number(event.target.value))}
          className="detail-slider"
          style={{ ['--detail-value' as string]: `${props.detailStrength}%` }}
        />
        <div className="flex items-center justify-between text-xs font-semibold text-porcelain-100/35">
          <span>柔和</span>
          <span>锐利</span>
        </div>
      </div>

      <label className="field-block">
        <span className="field-label">负面提示词</span>
        <textarea
          value={props.negativePrompt}
          onChange={(event) => props.onNegativePromptChange(event.target.value)}
          className="negative-area"
          rows={3}
          placeholder="不希望出现在图片里的元素、风格或缺陷"
        />
      </label>
    </div>
  )
}
