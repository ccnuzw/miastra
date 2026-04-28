import { ImagePlus, Sparkles } from 'lucide-react'
import type { GalleryImage } from '@/features/works/works.types'

type PreviewStageProps = {
  activePreview?: GalleryImage | null
  onPreview: (item: GalleryImage) => void
}

export function PreviewStage({ activePreview, onPreview }: PreviewStageProps) {
  return (
    <div className="preview-stage">
      <div className="preview-orb" />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="eyebrow preview-eyebrow">生成预览</span>
          <ImagePlus className="h-5 w-5 text-signal-amber" />
        </div>
        {activePreview?.src ? (
          <button
            type="button"
            className="preview-image-frame preview-image-frame-active"
            onClick={() => onPreview(activePreview)}
            aria-label="点击放大生成预览"
          >
            <span className="preview-image-canvas" aria-hidden="true">
              <img
                src={activePreview.src}
                alt={activePreview.title || '生成预览'}
                className="preview-image-safe"
                decoding="async"
                draggable={false}
              />
            </span>
            <span className="preview-image-hint">点击放大预览</span>
          </button>
        ) : (
          <div className="preview-placeholder">
            <Sparkles className="h-10 w-10 text-signal-cyan" />
            <p>图片生成完成后会显示在这里</p>
          </div>
        )}
      </div>
    </div>
  )
}
