import type { ResolutionTier } from './studio.types'
import { aspectOptions, qualityOptions, resolutionOptions } from './studio.constants'

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
}

export function ParameterPanel(props: ParameterPanelProps) {
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
              <button key={option.label} type="button" onClick={() => props.onAspectChange(option.label)} className={`aspect-chip ${props.aspectLabel === option.label ? 'aspect-chip-active' : ''}`}>
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
              <button key={option.value} type="button" onClick={() => props.onResolutionChange(option.value)} className={`resolution-chip ${props.resolutionTier === option.value ? 'resolution-chip-active' : ''}`}>
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
                <button key={option.value} type="button" onClick={() => props.onQualityChange(option.value)} className={`quality-chip ${props.quality === option.value ? 'quality-chip-active' : ''}`}>
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
              <input checked={props.stream} onChange={(event) => props.onStreamChange(event.target.checked)} type="checkbox" />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
