import { Check, Download, ImagePlus, RefreshCw, Search, Star, Tag, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { GalleryImage } from '@/features/works/works.types'

type ImageWallModalProps = {
  open: boolean
  gallery: GalleryImage[]
  totalCount: number
  selectedIds: string[]
  searchQuery: string
  availableTags: string[]
  activeTag: string
  favoritesOnly: boolean
  selectedTags?: string[]
  onClose: () => void
  onPreview: (item: GalleryImage) => void
  onDownload: (item: GalleryImage) => void
  onDownloadSelected: () => void
  includeMetadata: boolean
  onIncludeMetadataChange: (value: boolean) => void
  onPushReference: (item: GalleryImage) => void
  onToggleSelect: (id: string) => void
  onToggleFavorite: (id: string) => void
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onAddSelectedTag?: (tag: string) => void
  onRemoveSelectedTag?: (tag: string) => void
  onClearSelection: () => void
  onRemoveSelected: () => void
  onRemove: (id: string) => void
  onRetry?: (item: GalleryImage) => void
  onSearchChange: (query: string) => void
  onTagChange: (tag: string) => void
  onFavoritesOnlyChange: (value: boolean) => void
  onClearFilters: () => void
}

export function ImageWallModal({
  open,
  gallery,
  totalCount,
  selectedIds,
  searchQuery,
  availableTags,
  activeTag,
  favoritesOnly,
  selectedTags = [],
  onClose,
  onPreview,
  onDownload,
  onDownloadSelected,
  includeMetadata,
  onIncludeMetadataChange,
  onPushReference,
  onToggleSelect,
  onToggleFavorite,
  onAddTag,
  onRemoveTag,
  onAddSelectedTag,
  onRemoveSelectedTag,
  onClearSelection,
  onRemoveSelected,
  onRemove,
  onRetry,
  onSearchChange,
  onTagChange,
  onFavoritesOnlyChange,
  onClearFilters,
}: ImageWallModalProps) {
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({})
  const [selectedTagDraft, setSelectedTagDraft] = useState('')
  if (!open) return null

  const hasFilters = Boolean(searchQuery.trim() || activeTag !== 'all' || favoritesOnly)

  function handleAddTag(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault()
    event.stopPropagation()
    const nextTag = (tagDrafts[id] ?? '').trim()
    if (!nextTag) return
    onAddTag(id, nextTag)
    setTagDrafts((items) => ({ ...items, [id]: '' }))
  }

  function handleAddSelectedTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextTag = selectedTagDraft.trim()
    if (!nextTag) return
    onAddSelectedTag?.(nextTag)
    setSelectedTagDraft('')
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="图片墙">
      <div className="image-wall-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Image Wall</p>
            <h2 className="mt-2 font-display text-4xl leading-none">图片墙</h2>
            <p className="mt-3 text-sm text-porcelain-100/55">集中浏览、筛选、预览和管理全部生成作品，当前 {gallery.length}/{totalCount} 张。</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedIds.length > 0 && (
              <div className="bulk-action-bar wall-bulk-action-bar">
                <span>已选 {selectedIds.length}</span>
                {onAddSelectedTag && (
                  <form onSubmit={handleAddSelectedTag} className="inline-flex items-center gap-1 rounded-full border border-porcelain-50/10 bg-ink-950/35 px-2 py-1">
                    <input
                      value={selectedTagDraft}
                      onChange={(event) => setSelectedTagDraft(event.target.value)}
                      placeholder="批量加标签"
                      className="w-24 bg-transparent text-[11px] font-black text-porcelain-50 outline-none placeholder:text-porcelain-100/30"
                      aria-label="批量加标签"
                    />
                    <button type="submit" className="bulk-ghost">加</button>
                  </form>
                )}
                {onRemoveSelectedTag && selectedTags.length > 0 && selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onRemoveSelectedTag(tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-porcelain-50/10 bg-ink-950/35 px-2 py-1 text-[11px] font-black text-porcelain-100/60 transition hover:border-signal-coral/45 hover:text-signal-coral"
                    aria-label={`批量移除标签 ${tag}`}
                  >
                    #{tag}<X className="h-3 w-3" />
                  </button>
                ))}
                <button type="button" onClick={onDownloadSelected} className="bulk-ghost">下载 ZIP</button>
                <button type="button" onClick={onClearSelection} className="bulk-ghost"><X className="h-3.5 w-3.5" />取消</button>
                <button type="button" onClick={onRemoveSelected} className="bulk-danger"><Trash2 className="h-3.5 w-3.5" />删除</button>
                <label className="bulk-metadata-toggle" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(event) => onIncludeMetadataChange(event.target.checked)}
                  />
                  <span>metadata.json</span>
                </label>
              </div>
            )}
            <button type="button" onClick={onClose} className="icon-button" aria-label="关闭图片墙">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.38] p-3">
          <label className="flex min-w-0 items-center gap-2 rounded-full border border-porcelain-50/10 bg-ink-950/60 px-3 py-2 text-xs text-porcelain-100/55 focus-within:border-signal-cyan/55">
            <Search className="h-4 w-4 shrink-0 text-signal-cyan" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索标题、meta、Prompt、模型、尺寸、质量、标签、批次、状态、错误"
              className="w-full min-w-0 bg-transparent text-sm font-semibold text-porcelain-50 outline-none placeholder:text-porcelain-100/30"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onFavoritesOnlyChange(!favoritesOnly)} className={`batch-chip batch-chip-inline ${favoritesOnly ? 'batch-chip-active' : ''}`}>
              <Star className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-current' : ''}`} />
              收藏
            </button>
            <button type="button" onClick={() => onTagChange('all')} className={`batch-chip ${activeTag === 'all' ? 'batch-chip-active' : ''}`}>全部标签</button>
            {availableTags.map((tag) => (
              <button key={tag} type="button" onClick={() => onTagChange(tag)} className={`batch-chip ${activeTag === tag ? 'batch-chip-active' : ''}`}>#{tag}</button>
            ))}
            {hasFilters && <button type="button" onClick={onClearFilters} className="batch-chip">清空筛选</button>}
          </div>
        </div>
        {gallery.length ? (
          <div className="image-wall-grid">
            {gallery.map((item) => {
              const selected = selectedIds.includes(item.id)
              const isFavorite = Boolean(item.isFavorite ?? item.favorite)
              const tags = item.tags ?? []
              const canRetry = item.taskStatus === 'failed' && item.retryable !== false && onRetry
              return (
                <div
                  key={item.id}
                  className={`wall-tile ${selected ? 'wall-tile-selected' : ''}`}
                  onClick={() => onPreview(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onPreview(item)
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {item.src && <img src={item.src} alt={item.title} />}
                  <button
                    type="button"
                    className={`tile-select wall-select ${selected ? 'tile-select-active' : ''}`}
                    onClick={(event) => { event.stopPropagation(); onToggleSelect(item.id) }}
                    aria-label={selected ? '取消选择作品' : '选择作品'}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : null}
                  </button>
                  <div className="wall-tile-overlay">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.variation && <span className="variation-badge">{item.drawIndex ? `#${item.drawIndex}` : '变体'}</span>}
                        {isFavorite && <span className="variation-badge text-signal-amber"><Star className="h-3 w-3 fill-current" /> 收藏</span>}
                        {item.taskStatus && <span className="variation-badge text-signal-cyan">{item.taskStatus}</span>}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-porcelain-50">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-porcelain-100/55">{item.meta}</p>
                      {(item.size || item.quality || item.providerModel) && (
                        <p className="mt-1 text-[11px] font-semibold text-signal-cyan/80">{[item.providerModel, item.size, item.quality].filter(Boolean).join(' · ')}</p>
                      )}
                      {item.error && <p className="mt-1 text-[11px] font-semibold text-signal-amber/85">失败原因：{item.error}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-signal-cyan/20 bg-signal-cyan/10 px-2 py-1 text-[10px] font-bold text-signal-cyan transition hover:border-signal-coral/45 hover:text-signal-coral"
                            onClick={(event) => { event.stopPropagation(); onRemoveTag(item.id, tag) }}
                            aria-label={`删除标签 ${tag}`}
                          >
                            #{tag}<X className="h-3 w-3" />
                          </button>
                        ))}
                        {canRetry && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-signal-amber/20 bg-signal-amber/10 px-2 py-1 text-[10px] font-bold text-signal-amber transition hover:border-signal-cyan/40 hover:text-signal-cyan"
                            onClick={(event) => { event.stopPropagation(); onRetry?.(item) }}
                            aria-label="重试失败项"
                          >
                            <RefreshCw className="h-3 w-3" />
                            重试
                          </button>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-porcelain-50/10 bg-ink-950/60 px-2 py-1 text-[10px] font-bold text-porcelain-50 transition hover:border-signal-cyan/35 hover:text-signal-cyan"
                          onClick={(event) => { event.stopPropagation(); onPushReference(item) }}
                          aria-label="推送到输入框"
                        >
                          <ImagePlus className="h-3 w-3" />
                          参考图
                        </button>
                        {onAddTag && (
                          <form onSubmit={(event) => handleAddTag(event, item.id)} className="inline-flex items-center gap-1 rounded-full border border-porcelain-50/10 bg-ink-950/60 px-2 py-1">
                            <Tag className="h-3 w-3 text-porcelain-100/35" />
                            <input
                              value={tagDrafts[item.id] ?? ''}
                              onChange={(event) => setTagDrafts((items) => ({ ...items, [item.id]: event.target.value }))}
                              onClick={(event) => event.stopPropagation()}
                              placeholder="加标签"
                              className="w-16 bg-transparent text-[10px] font-bold text-porcelain-50 outline-none placeholder:text-porcelain-100/30"
                            />
                          </form>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" className={`tile-action ${isFavorite ? 'tile-action-success text-signal-amber' : ''}`} onClick={(event) => { event.stopPropagation(); onToggleFavorite(item.id) }} aria-label={isFavorite ? '取消收藏作品' : '收藏作品'}>
                        <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                      </button>
                      <button type="button" className="tile-action" onClick={(event) => { event.stopPropagation(); onDownload(item) }} aria-label="下载图片">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="tile-action tile-action-danger" onClick={(event) => { event.stopPropagation(); onRemove(item.id) }} aria-label="删除图片">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="image-wall-empty">{hasFilters ? '没有符合当前搜索和筛选条件的作品。' : '生成图片后，这里会自动形成图片墙。'}</div>
        )}
      </div>
    </div>
  )
}
