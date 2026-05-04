import { PreviewStage } from '@/features/generation/PreviewStage'
import { ResponsePanel } from '@/features/generation/ResponsePanel'
import type { GalleryImage } from '@/features/works/works.types'

type StudioGenerationColumnProps = {
  activePreview: GalleryImage | null
  onPreview: (item: GalleryImage) => void
  responseText: string
  responseCollapsed: boolean
  responseSummary: string
  onToggleResponse: () => void
  onClearResponse: () => void
  statusText: string
  stage: string
  progressValue: number
  onCancel: () => void
}

export function StudioGenerationColumn({
  activePreview,
  onPreview,
  responseText,
  responseCollapsed,
  responseSummary,
  onToggleResponse,
  onClearResponse,
  statusText,
  stage,
  progressValue,
  onCancel,
}: StudioGenerationColumnProps) {
  return (
    <div className="space-y-6">
      <PreviewStage activePreview={activePreview} onPreview={onPreview} />

      <article className="progress-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Status</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-porcelain-50">{statusText}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-pill">{stage}</span>
            <button type="button" className="settings-button" onClick={onCancel}>取消任务</button>
          </div>
        </div>
        <div className="studio-status-grid">
          <div className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">进度</p>
            <p className="mt-2 text-xl font-semibold text-porcelain-50">{progressValue}%</p>
          </div>
          <div className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">阶段</p>
            <p className="mt-2 text-base font-semibold text-porcelain-50">{stage}</p>
          </div>
        </div>
      </article>
      <ResponsePanel
        responseText={responseText}
        collapsed={responseCollapsed}
        summary={responseSummary}
        onToggle={onToggleResponse}
        onClear={onClearResponse}
      />
    </div>
  )
}
