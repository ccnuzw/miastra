import { Check, Download, ImagePlus, Trash2, X } from 'lucide-react'
import type { GalleryImage } from './works.types'

type ImageWallModalProps = {
  open: boolean
  gallery: GalleryImage[]
  selectedIds: string[]
  onClose: () => void
  onPreview: (item: GalleryImage) => void
  onDownload: (item: GalleryImage) => void
  onPushReference: (item: GalleryImage) => void
  onToggleSelect: (id: string) => void
  onRemove: (id: string) => void
}

export function ImageWallModal({ open, gallery, selectedIds, onClose, onPreview, onDownload, onPushReference, onToggleSelect, onRemove }: ImageWallModalProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="图片墙">
      <div className="image-wall-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Image Wall</p>
            <h2 className="mt-2 font-display text-4xl leading-none">图片墙</h2>
            <p className="mt-3 text-sm text-porcelain-100/55">集中浏览、筛选、预览和管理全部生成作品，共 {gallery.length} 张。</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && <span className="wall-selected-count">已选 {selectedIds.length}</span>}
            <button type="button" onClick={onClose} className="icon-button" aria-label="关闭图片墙">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {gallery.length ? (
          <div className="image-wall-grid">
            {gallery.map((item) => {
              const selected = selectedIds.includes(item.id)
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
                    <div>
                      {item.variation && <span className="variation-badge">{item.drawIndex ? `#${item.drawIndex}` : '变体'}</span>}
                      <p className="mt-2 text-sm font-semibold text-porcelain-50">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-porcelain-100/55">{item.meta}</p>
                      {(item.size || item.quality || item.providerModel) && (
                        <p className="mt-1 text-[11px] font-semibold text-signal-cyan/80">{[item.providerModel, item.size, item.quality].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" className="tile-action" onClick={(event) => { event.stopPropagation(); onPushReference(item) }} aria-label="推送到输入框">
                        <ImagePlus className="h-3.5 w-3.5" />
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
          <div className="image-wall-empty">生成图片后，这里会自动形成图片墙。</div>
        )}
      </div>
    </div>
  )
}
