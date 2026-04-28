import { Download, ImagePlus, RefreshCw, SlidersHorizontal, X } from 'lucide-react'
import type { GenerationDrawSnapshot, GenerationMode, GenerationReferenceSnapshot } from '@/features/generation/generation.types'
import type { GalleryImage } from './works.types'

type ImageViewerModalProps = {
  image: GalleryImage | null
  onClose: () => void
  onDownload: (item: GalleryImage) => void
  onPushReference: (item: GalleryImage) => void
  onReuseParameters?: (item: GalleryImage) => void
  onRegenerateFromParameters?: (item: GalleryImage) => void
}

type ParameterRow = {
  label: string
  value?: string | number | boolean | null
}

const modeLabels: Record<GenerationMode, string> = {
  text2image: '文生图',
  image2image: '图生图',
  'draw-text2image': '抽卡 · 文生图',
  'draw-image2image': '抽卡 · 图生图',
}

function formatMaybeDate(value?: number) {
  if (!value) return '未记录'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function valueOrEmpty(value?: string | number | boolean | null) {
  if (value === undefined || value === null || value === '') return '未记录'
  if (typeof value === 'boolean') return value ? '开启' : '关闭'
  return String(value)
}

function buildReferenceRows(references?: GenerationReferenceSnapshot): ParameterRow[] {
  if (!references) return []
  const sources = Array.isArray(references.sources) ? references.sources : []
  return [
    { label: '参考图数量', value: references.count },
    { label: '参考图来源', value: sources.length ? sources.map((item) => `${item.source === 'work' ? '作品' : '上传'}:${item.name}`).join(' / ') : '未记录来源' },
  ]
}

function buildDrawRows(draw?: GenerationDrawSnapshot, image?: GalleryImage): ParameterRow[] {
  const batchId = draw?.batchId ?? image?.batchId
  const drawIndex = draw?.drawIndex ?? image?.drawIndex
  const variation = draw?.variation ?? image?.variation
  if (!draw && !batchId && drawIndex === undefined && !variation) return []

  return [
    { label: '抽卡数量', value: draw?.count },
    { label: '策略', value: draw?.strategy },
    { label: '并发', value: draw?.concurrency },
    { label: '延迟', value: draw ? `${draw.delayMs}ms` : undefined },
    { label: '重试', value: draw?.retries },
    { label: '超时', value: draw ? `${draw.timeoutSec}s` : undefined },
    { label: '安全模式', value: draw?.safeMode },
    { label: '变化强度', value: draw?.variationStrength },
    { label: '变化维度', value: draw?.dimensions.join(' / ') },
    { label: '批次', value: batchId },
    { label: '序号', value: drawIndex === undefined ? undefined : drawIndex + 1 },
    { label: '变化描述', value: variation },
  ]
}

function ParameterGrid({ rows }: { rows: ParameterRow[] }) {
  return (
    <div className="viewer-parameter-grid">
      {rows.map((row) => (
        <div key={row.label} className="viewer-parameter-item">
          <span>{row.label}</span>
          <strong>{valueOrEmpty(row.value)}</strong>
        </div>
      ))}
    </div>
  )
}

export function ImageViewerModal({
  image,
  onClose,
  onDownload,
  onPushReference,
  onReuseParameters,
  onRegenerateFromParameters,
}: ImageViewerModalProps) {
  if (!image?.src) return null

  const snapshot = image.generationSnapshot
  const mode = snapshot?.mode ?? image.mode
  const promptText = snapshot?.workspacePrompt || snapshot?.prompt || image.promptText || image.promptSnippet
  const requestPrompt = snapshot?.requestPrompt
  const references = snapshot?.references
  const drawRows = buildDrawRows(snapshot?.draw, image)
  const baseRows: ParameterRow[] = [
    { label: '模式', value: mode ? modeLabels[mode] : undefined },
    { label: '模型', value: snapshot?.model ?? image.providerModel },
    { label: '尺寸', value: snapshot?.size ?? image.size },
    { label: '质量', value: snapshot?.quality ?? image.quality },
    { label: 'Provider', value: snapshot?.providerId },
    { label: 'API URL', value: snapshot?.apiUrl },
    { label: '请求端点', value: snapshot?.requestUrl },
    { label: '流式', value: snapshot?.stream },
    { label: '创建时间', value: formatMaybeDate(snapshot?.createdAt ?? image.createdAt) },
    { label: '快照', value: snapshot?.id ?? image.snapshotId },
    { label: '参数来源', value: snapshot ? 'generationSnapshot' : 'legacy fields' },
  ]
  const referenceRows = buildReferenceRows(references)
  const isLegacy = !snapshot
  const hasReusableParameters = Boolean(promptText || snapshot || image.providerModel || image.size || image.quality || image.mode)
  const hasReferenceHint = Boolean(references?.count || mode?.includes('image2image'))

  return (
    <div className="modal-backdrop image-viewer-backdrop" role="dialog" aria-modal="true" aria-label="图片放大预览" onClick={onClose}>
      <div className="image-viewer-card" onClick={(event) => event.stopPropagation()}>
        <div className="image-viewer-header">
          <div className="min-w-0">
            <p className="eyebrow">Preview</p>
            <h2 className="truncate font-display text-3xl">{image.title}</h2>
            <p className="mt-1 truncate text-xs text-porcelain-100/55">{image.meta}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" className="icon-button" onClick={() => onPushReference(image)} aria-label="推送到输入框">
              <ImagePlus className="h-4 w-4" />
            </button>
            <button type="button" className="icon-button" onClick={() => onDownload(image)} aria-label="下载图片">
              <Download className="h-4 w-4" />
            </button>
            <button type="button" className="icon-button" onClick={onClose} aria-label="关闭预览">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="image-viewer-layout">
          <div className="image-viewer-body">
            <img src={image.src} alt={image.title} />
          </div>
          <aside className="viewer-parameters-panel" aria-label="生成参数详情">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Parameters</p>
                <h3 className="mt-2 font-display text-xl">生成参数</h3>
              </div>
              {isLegacy && <span className="viewer-legacy-badge">Legacy</span>}
            </div>

            <section className="viewer-parameter-section">
              <p className="viewer-section-title">Prompt</p>
              <div className="viewer-prompt-box">{promptText || '旧作品未保存 prompt，仅可复用已记录的模型、尺寸、质量等参数。'}</div>
              {requestPrompt && requestPrompt !== promptText && (
                <details className="viewer-request-prompt">
                  <summary>查看请求 Prompt</summary>
                  <p>{requestPrompt}</p>
                </details>
              )}
            </section>

            <section className="viewer-parameter-section">
              <p className="viewer-section-title">基础参数</p>
              <ParameterGrid rows={baseRows} />
            </section>

            {referenceRows.length > 0 && (
              <section className="viewer-parameter-section">
                <p className="viewer-section-title">参考图</p>
                <ParameterGrid rows={referenceRows} />
                <p className="viewer-reference-note">{references?.note ? `${references.note}；参考图文件需重新提供。` : '参考图文件未随作品快照保存；复用或再次生成前需重新提供参考图文件。'}</p>
              </section>
            )}
            {hasReferenceHint && referenceRows.length === 0 && (
              <p className="viewer-reference-note">该作品可能基于图生图生成；旧数据未保存参考图详情，复用后参考图文件需重新提供。</p>
            )}

            {drawRows.length > 0 && (
              <section className="viewer-parameter-section">
                <p className="viewer-section-title">抽卡参数</p>
                <ParameterGrid rows={drawRows} />
              </section>
            )}

            <div className="viewer-action-row">
              <button
                type="button"
                className="settings-button flex-1"
                disabled={!hasReusableParameters || !onReuseParameters}
                onClick={() => onReuseParameters?.(image)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                复用参数
              </button>
              <button
                type="button"
                className="generate-button flex-1"
                disabled={!hasReusableParameters || !onRegenerateFromParameters}
                onClick={() => onRegenerateFromParameters?.(image)}
              >
                <RefreshCw className="h-4 w-4" />
                再次生成
              </button>
            </div>
            <p className="text-xs leading-5 text-porcelain-100/45">再次生成会先回填旧参数；为避免状态异步读取旧值，请确认工作区参数后点击主生成按钮。</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
