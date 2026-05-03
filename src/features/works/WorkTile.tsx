import { Bolt, Check, CheckCircle2, ClipboardCopy, Download, Eye, ImagePlus, Loader2, Star, Tag, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type MouseEvent } from 'react'
import { drawTaskStatusText } from '@/features/draw-card/drawCard.constants'
import type { GalleryImage } from './works.types'

type WorkTileProps = {
  item: GalleryImage
  mode?: 'rail' | 'grid'
  onPreview: (item: GalleryImage) => void
  onDownload: (item: GalleryImage) => void
  onPushReference?: (item: GalleryImage) => void
  onRemove: (id: string) => void
  onRetry?: (item: GalleryImage) => void
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onToggleFavorite?: (id: string) => void
  onAddTag?: (id: string, tag: string) => void
  onRemoveTag?: (id: string, tag: string) => void
}

export function WorkTile({
  item,
  mode = 'grid',
  onPreview,
  onDownload,
  onPushReference,
  onRemove,
  onRetry,
  selected = false,
  onToggleSelect,
  onToggleFavorite,
  onAddTag,
  onRemoveTag,
}: WorkTileProps) {
  const hasImage = Boolean(item.src)
  const hasTask = Boolean(item.taskStatus)
  const promptText = item.promptText || item.promptSnippet || item.meta
  const isFavorite = Boolean(item.isFavorite ?? item.favorite)
  const assetSyncText = item.assetSyncStatus === 'synced'
    ? '已同步'
    : item.assetSyncStatus === 'pending-sync'
      ? '待同步'
      : item.assetSyncStatus === 'local-only'
        ? '仅本地'
        : ''
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle')
  const [tagDraft, setTagDraft] = useState('')

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

  function handleAddTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    const nextTag = tagDraft.trim()
    if (!nextTag) return
    onAddTag?.(item.id, nextTag)
    setTagDraft('')
  }

  return (
    <div
      className={`sample-tile ${mode === 'rail' ? 'rail-tile' : 'grid-tile'} ${hasImage ? 'sample-tile-active' : hasTask ? 'sample-tile-task' : 'sample-tile-empty'} ${selected ? 'sample-tile-selected' : ''}`}
    >
      {item.src ? (
        <div
          className="tile-image-zone"
          role="button"
          tabIndex={0}
          onClick={() => onPreview(item)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onPreview(item)
          }}
        >
          <img src={item.src} alt={item.title} className="tile-image" />
          <div className="tile-image-overlay">
            <div className="flex items-center gap-2">
              <Bolt className="h-5 w-5 text-signal-cyan" />
              {item.variation && <span className="variation-badge">{item.drawIndex ? `#${item.drawIndex}` : '变体'}</span>}
              {assetSyncText && <span className="variation-badge text-signal-cyan">{item.assetRemoteKey ? `${assetSyncText} · ${item.assetRemoteKey}` : assetSyncText}</span>}
              {isFavorite && <span className="variation-badge text-signal-amber"><Star className="h-3 w-3 fill-current" /> 收藏</span>}
            </div>
          </div>
        </div>
      ) : hasTask ? (
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
        <div className="tile-toolbar" onClick={(event) => event.stopPropagation()}>
          <div className="tile-toolbar-main">
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
              {onToggleFavorite && (
                <button
                  type="button"
                  className={`tile-action ${isFavorite ? 'tile-action-success text-signal-amber' : ''}`}
                  onClick={(event) => { event.stopPropagation(); onToggleFavorite(item.id) }}
                  aria-label={isFavorite ? '取消收藏作品' : '收藏作品'}
                >
                  <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
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
              <button type="button" className="tile-action" onClick={(event) => { event.stopPropagation(); onPushReference?.(item) }} aria-label="推送到输入框" disabled={!onPushReference}>
                <ImagePlus className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="tile-action tile-action-danger" onClick={(event) => { event.stopPropagation(); onRemove(item.id) }} aria-label="移除图片">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {onAddTag && (
              <form onSubmit={handleAddTag} className="tile-tag-form">
                <Tag className="h-3 w-3 text-porcelain-100/35" />
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  placeholder="加标签"
                  className="tile-tag-input"
                  aria-label="添加标签"
                />
                <button type="submit" className="tile-tag-submit">加</button>
              </form>
            )}
          </div>
          {copyState !== 'idle' && (
            <p className={`tile-toolbar-status ${copyState === 'success' ? 'tile-toolbar-status-success' : 'tile-toolbar-status-error'}`}>
              {copyState === 'success' ? '提示词已复制' : '复制失败'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
