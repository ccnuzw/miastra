import { Bolt, Check, CheckCircle2, ClipboardCopy, Download, Eye, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { drawTaskStatusText } from '@/features/draw-card/drawCard.constants'
import type { GalleryImage } from './works.types'

type WorkTileProps = {
  item: GalleryImage
  mode?: 'rail' | 'grid'
  onPreview: (item: GalleryImage) => void
  onDownload: (item: GalleryImage) => void
  onPushReference: (item: GalleryImage) => void
  onRemove: (id: string) => void
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export function WorkTile({ item, mode = 'grid', onPreview, onDownload, onPushReference, onRemove, selected = false, onToggleSelect }: WorkTileProps) {
  const hasImage = Boolean(item.src)
  const hasTask = Boolean(item.taskStatus)
  const promptText = item.promptText || item.promptSnippet || item.meta
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle')

  async function handleCopyPrompt(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (!promptText) return
    try {
      await navigator.clipboard.writeText(promptText)
      setCopyState('success')
    } catch {
      setCopyState('error')
    }
    window.setTimeout(() => setCopyState('idle'), 1400)
  }

  return (
    <div
      className={`sample-tile ${mode === 'rail' ? 'rail-tile' : 'grid-tile'} ${hasImage ? 'sample-tile-active' : hasTask ? 'sample-tile-task' : 'sample-tile-empty'} ${selected ? 'sample-tile-selected' : ''}`}
      role={hasImage ? 'button' : undefined}
      tabIndex={hasImage ? 0 : undefined}
      onClick={() => item.src && onPreview(item)}
      onKeyDown={(event) => {
        if (item.src && (event.key === 'Enter' || event.key === ' ')) onPreview(item)
      }}
    >
      {item.src ? <img src={item.src} alt={item.title} className="tile-image" /> : hasTask ? (
        <div className="task-slot-body">
          <div className="flex items-center justify-between gap-2">
            <span className="variation-badge">#{item.drawIndex}</span>
            {(item.taskStatus === 'running' || item.taskStatus === 'receiving' || item.taskStatus === 'retrying') && <Loader2 className="h-4 w-4 animate-spin text-signal-cyan" />}
          </div>
          <div>
            <p className="text-sm font-bold text-porcelain-50">{item.title}</p>
            <p className="mt-1 text-xs font-semibold text-signal-cyan">{item.taskStatus ? drawTaskStatusText[item.taskStatus] : ''}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-porcelain-100/45">{item.meta}</p>
          </div>
        </div>
      ) : <div className="empty-work-slot" aria-hidden="true"><ImagePlus className="h-5 w-5" /></div>}
      {hasImage && (
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bolt className="h-5 w-5 text-signal-cyan" />
              {item.variation && <span className="variation-badge">{item.drawIndex ? `#${item.drawIndex}` : '变体'}</span>}
            </div>
            <div className="tile-actions" aria-label="作品操作">
              {onToggleSelect && (
                <button
                  type="button"
                  className={`tile-action ${selected ? 'tile-action-success' : ''}`}
                  onClick={(event) => { event.stopPropagation(); onToggleSelect(item.id) }}
                  aria-label={selected ? '取消选择作品' : '选择作品'}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
              <button type="button" className="tile-action" onClick={(event) => { event.stopPropagation(); onPreview(item) }} aria-label="放大预览">
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button type="button" className={`tile-action ${copyState === 'success' ? 'tile-action-success' : copyState === 'error' ? 'tile-action-danger' : ''}`} onClick={handleCopyPrompt} aria-label="复制提示词">
                {copyState === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              </button>
              <button type="button" className="tile-action" onClick={(event) => { event.stopPropagation(); onDownload(item) }} aria-label="下载图片">
                <Download className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="tile-action" onClick={(event) => { event.stopPropagation(); onPushReference(item) }} aria-label="推送到输入框">
                <ImagePlus className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="tile-action tile-action-danger" onClick={(event) => { event.stopPropagation(); onRemove(item.id) }} aria-label="移除图片">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {copyState !== 'idle' && (
            <div className={`copy-toast ${copyState === 'success' ? 'copy-toast-success' : 'copy-toast-error'}`}>
              {copyState === 'success' ? '提示词已复制' : '复制失败'}
            </div>
          )}
          <div className="tile-caption">
            <p className="text-sm font-medium text-porcelain-50">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-porcelain-100/[0.52]">{item.meta}</p>
          </div>
        </div>
      )}
    </div>
  )
}
