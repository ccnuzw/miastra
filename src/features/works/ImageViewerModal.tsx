import { Download, ImagePlus, X } from 'lucide-react'
import type { GalleryImage } from './works.types'

type ImageViewerModalProps = {
  image: GalleryImage | null
  onClose: () => void
  onDownload: (item: GalleryImage) => void
  onPushReference: (item: GalleryImage) => void
}

export function ImageViewerModal({ image, onClose, onDownload, onPushReference }: ImageViewerModalProps) {
  if (!image?.src) return null

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
        <div className="image-viewer-body">
          <img src={image.src} alt={image.title} />
        </div>
      </div>
    </div>
  )
}
