import { ImagePlus, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  ConsumerResultActions,
  type StudioConsumerResultActionDetail,
  studioConsumerResultActionEvent,
} from '@/features/studio-consumer/ConsumerResultActions'
import type { GalleryImage } from '@/features/works/works.types'

type PreviewStageProps = {
  activePreview?: GalleryImage | null
  onPreview: (item: GalleryImage) => void
}

export function PreviewStage({ activePreview, onPreview }: PreviewStageProps) {
  const [resultActionFeedback, setResultActionFeedback] =
    useState<StudioConsumerResultActionDetail | null>(null)
  const hasFinalPreview = Boolean(activePreview?.src) && activePreview?.id !== 'live-preview-image'

  useEffect(() => {
    function handleResultAction(rawEvent: Event) {
      const event = rawEvent as CustomEvent<StudioConsumerResultActionDetail>
      setResultActionFeedback((current) => {
        if (!activePreview?.src || event.detail.preview.src !== activePreview.src) return current
        return event.detail
      })
    }

    window.addEventListener(studioConsumerResultActionEvent, handleResultAction as EventListener)
    return () => {
      window.removeEventListener(
        studioConsumerResultActionEvent,
        handleResultAction as EventListener,
      )
    }
  }, [activePreview?.src])

  return (
    <div className="preview-stage">
      <div className="preview-orb" />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="eyebrow preview-eyebrow">
            {activePreview?.src ? '结果预览' : '结果区'}
          </span>
          <ImagePlus className="h-5 w-5 text-signal-amber" />
        </div>

        <div className="mt-5 rounded-[1.6rem] border border-porcelain-50/10 bg-ink-950/[0.48] p-4">
          <p className="text-lg font-semibold text-porcelain-50">
            {hasFinalPreview
              ? '先确认这版方向，再顺手继续改'
              : activePreview?.src
                ? '这版结果还在接收中'
                : '第一版会显示在这里'}
          </p>
          <p className="mt-2 text-sm leading-6 text-porcelain-100/55">
            {hasFinalPreview
              ? '不满意时，不需要重新开始。可以直接沿用当前结果继续做，或者先把它带回输入区补一句。'
              : activePreview?.src
                ? '等这版结果接收完成后，就可以直接基于它继续修改，不会丢掉当前方向。'
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
            {hasFinalPreview &&
            resultActionFeedback &&
            resultActionFeedback.preview.src === activePreview.src ? (
              <div className="mt-4 rounded-[1.35rem] border border-signal-cyan/20 bg-signal-cyan/[0.08] p-4">
                <p className="text-sm font-semibold text-porcelain-50">
                  {resultActionFeedback.submit
                    ? `已按“${resultActionFeedback.actionTitle}”继续这一版`
                    : `已按“${resultActionFeedback.actionTitle}”准备${resultActionFeedback.workflowLabel}`}
                </p>
                <p className="mt-1 text-sm leading-6 text-porcelain-100/60">
                  {resultActionFeedback.nextStep}
                </p>
              </div>
            ) : null}
            {hasFinalPreview ? (
              <ConsumerResultActions
                key={`${activePreview.id}:${activePreview.src ?? ''}`}
                preview={activePreview}
              />
            ) : null}
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
