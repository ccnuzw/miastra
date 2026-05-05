import { ImagePlus, Sparkles } from 'lucide-react'
import { ConsumerResultActions } from '@/features/studio-consumer/ConsumerResultActions'
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
          <span className="eyebrow preview-eyebrow">{activePreview?.src ? '结果预览' : '结果区'}</span>
          <ImagePlus className="h-5 w-5 text-signal-amber" />
        </div>

        <div className="mt-5 rounded-[1.6rem] border border-porcelain-50/10 bg-ink-950/[0.48] p-4">
          <p className="text-lg font-semibold text-porcelain-50">
            {activePreview?.src ? '这是刚生成的结果' : '第一版会显示在这里'}
          </p>
          <p className="mt-2 text-sm leading-6 text-porcelain-100/55">
            {activePreview?.src
              ? '先看看这版效果，如果还不够满意，可以直接在下方继续改。'
              : '先从左边说一句你想做什么，或上传一张图，然后点“先试试看”。'}
          </p>
        </div>

        {activePreview?.src ? (
          <>
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
            <ConsumerResultActions preview={activePreview} />
          </>
        ) : (
          <div className="preview-placeholder">
            <Sparkles className="h-10 w-10 text-signal-cyan" />
            <div className="space-y-2">
              <p>图片生成完成后会显示在这里</p>
              <p className="text-xs text-porcelain-100/45">先出第一版，不满意再继续改。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
