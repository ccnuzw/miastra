import { StudioProExecutionPanel } from '@/features/studio-pro/StudioProExecutionPanel'

type AdvancedSettingsPanelProps = {
  detailStrength: number
  detailTone: string
  onDetailStrengthChange: (value: number) => void
  proPanel?: {
    providerLabel: string
    providerId: string
    providerModeLabel: string
    modelLabel: string
    requestKindLabel: string
    requestUrl: string
    editRequestUrl: string
    loading: boolean
    onOpenProviderSettings: () => void
  } | null
}

export function AdvancedSettingsPanel({
  detailStrength,
  detailTone,
  onDetailStrengthChange,
  proPanel = null,
}: AdvancedSettingsPanelProps) {
  return (
    <section className="style-inline-panel studio-balanced-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Advanced</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-porcelain-50">
            细节控制
          </h3>
        </div>
        <span className="param-value">
          {detailStrength}% · {detailTone}
        </span>
      </div>
      <p className="mt-2 text-sm text-porcelain-100/55">
        在不改动主体参数的前提下，微调画面细腻度和锐度倾向。
      </p>
      <div className="mt-4 rounded-[1.45rem] border border-porcelain-50/10 bg-porcelain-50/[0.035] p-4">
        <input
          type="range"
          min="0"
          max="100"
          value={detailStrength}
          onChange={(event) => onDetailStrengthChange(Number(event.target.value))}
          className="detail-slider"
          style={{ ['--detail-value' as string]: `${detailStrength}%` }}
        />
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-porcelain-100/35">
          <span>柔和</span>
          <span>锐利</span>
        </div>
      </div>
      {proPanel ? <StudioProExecutionPanel {...proPanel} /> : null}
    </section>
  )
}
