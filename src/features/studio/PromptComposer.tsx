import { type ChangeEvent, type RefObject, useEffect, useRef, useState } from 'react'
import { BookmarkPlus, ImagePlus, Library, Wand2, X } from 'lucide-react'
import type { ReferenceImage } from '@/features/references/reference.types'
import { studioConsumerIntentEvent, type StudioConsumerIntent } from '@/features/studio-consumer/consumerFlow.events'
import { ConsumerTaskEntrySection } from '@/features/studio-home/ConsumerTaskEntrySection'
import type { ConsumerScenePreset, ConsumerTaskPreset } from '@/features/studio-home/consumerHomePresets'
import { StudioProPromptPanel } from '@/features/studio-pro/StudioProPromptPanel'
import type { StyleToken } from './studio.types'

type PromptComposerProps = {
  prompt: string
  negativePrompt: string
  referenceImages: ReferenceImage[]
  hasReferenceImage: boolean
  inputRef: RefObject<HTMLInputElement>
  onPromptChange: (value: string) => void
  onNegativePromptChange: (value: string) => void
  onReferenceUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveReference: (id: string) => void
  onSaveTemplate: () => void
  onOpenTemplateLibrary: () => void
  templateActionDisabled?: boolean
  proPanel?: {
    finalPrompt: string
    selectedStyleTokens: StyleToken[]
  } | null
}

function appendPrompt(base: string, text: string) {
  const trimmedBase = base.trim()
  const trimmedText = text.trim()
  if (!trimmedText) return trimmedBase
  if (!trimmedBase) return trimmedText
  if (trimmedBase.includes(trimmedText)) return trimmedBase
  return `${trimmedBase}\n\n${trimmedText}`
}

function upsertFollowup(base: string, text: string) {
  const cleanedBase = base.replace(/\n*\n这一轮重点：[\s\S]*$/u, '').trim()
  const trimmedText = text.trim()
  if (!trimmedText) return cleanedBase
  return cleanedBase ? `${cleanedBase}\n\n这一轮重点：${trimmedText}` : trimmedText
}

export function PromptComposer({
  prompt,
  negativePrompt,
  referenceImages,
  hasReferenceImage,
  inputRef,
  onPromptChange,
  onNegativePromptChange,
  onReferenceUpload,
  onRemoveReference,
  onSaveTemplate,
  onOpenTemplateLibrary,
  templateActionDisabled = false,
  proPanel = null,
}: PromptComposerProps) {
  const hasPrompt = prompt.trim().length > 0
  const [completionSummary, setCompletionSummary] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const promptRef = useRef(prompt)

  useEffect(() => {
    promptRef.current = prompt
  }, [prompt])

  function focusComposer() {
    textareaRef.current?.focus()
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function attachPreviewAsReference(preview: NonNullable<StudioConsumerIntent['attachPreview']>) {
    if (!inputRef.current) return
    const response = await fetch(preview.src)
    const blob = await response.blob()
    const extension = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
    const filename = `${(preview.title || 'continue-edit').replace(/\s+/gu, '-').toLowerCase()}.${extension}`
    const file = new File([blob], filename, { type: blob.type || 'image/png' })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    inputRef.current.files = transfer.files
    inputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
  }

  useEffect(() => {
    function handleConsumerIntent(rawEvent: Event) {
      const event = rawEvent as CustomEvent<StudioConsumerIntent>
      if (event.detail.type !== 'prompt') return

      void (async () => {
        let nextPrompt = promptRef.current
        if (event.detail.text?.trim()) {
          nextPrompt =
            event.detail.mode === 'replace'
              ? event.detail.text.trim()
              : event.detail.mode === 'followup'
                ? upsertFollowup(nextPrompt, event.detail.text)
                : appendPrompt(nextPrompt, event.detail.text)
          onPromptChange(nextPrompt)
        }

        if (event.detail.attachPreview?.src) {
          try {
            await attachPreviewAsReference(event.detail.attachPreview)
          } catch {
            // 结果图回推失败时仍保留文字修改链路，避免打断主流程。
          }
        }

        if (event.detail.openUpload) inputRef.current?.click()
        if (event.detail.focus !== false) focusComposer()
        if (event.detail.submit) {
          window.setTimeout(() => {
            const submitButton = document.querySelector<HTMLButtonElement>('#studio-form button[type="submit"]')
            if (submitButton?.disabled) return
            document
              .getElementById('studio-form')
              ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
          }, 180)
        }
      })()
    }

    window.addEventListener(studioConsumerIntentEvent, handleConsumerIntent as EventListener)
    return () => {
      window.removeEventListener(studioConsumerIntentEvent, handleConsumerIntent as EventListener)
    }
  }, [inputRef, onPromptChange])

  function handleTaskSelect(task: ConsumerTaskPreset) {
    if (task.action === 'continue') {
      document.querySelector('.studio-works-column')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (task.prompt) onPromptChange(task.prompt)
    if (task.openUpload) inputRef.current?.click()
    focusComposer()
  }

  function handleSceneSelect(scene: ConsumerScenePreset) {
    onPromptChange(scene.prompt)
    focusComposer()
  }

  function handleQuickDirection(text: string) {
    onPromptChange(upsertFollowup(promptRef.current, text))
    focusComposer()
  }

  function handleUseExample(text: string) {
    onPromptChange(text)
    focusComposer()
  }

  function handleCompleteDetails() {
    const summary = hasReferenceImage
      ? '将优先保留主体，并补全背景、光线和构图。'
      : '将按你的描述补全背景、光线和构图，先做出一版接近需求的结果。'
    const addition = hasReferenceImage
      ? '请优先保留主体，并把背景、光线和构图补全得更自然。'
      : '请根据我的描述补全背景、光线和构图细节，让第一版更完整。'

    setCompletionSummary(summary)
    onPromptChange(appendPrompt(promptRef.current, addition))
    focusComposer()
  }

  if (proPanel) {
    return (
      <div className="field-block prompt-composer">
        <div className="prompt-composer-header">
          <span className="field-label">
            <Wand2 className="h-4 w-4" />
            Prompt
          </span>
          <div className="prompt-template-entry-group">
            <button
              type="button"
              className="settings-button prompt-template-entry"
              onClick={onSaveTemplate}
              disabled={templateActionDisabled}
              title={hasPrompt ? '保存当前 Prompt 为模板' : 'Prompt 为空，无法保存为模板'}
            >
              <BookmarkPlus className="h-4 w-4" />
              保存为模板
            </button>
            <button type="button" className="settings-button prompt-template-entry" onClick={onOpenTemplateLibrary}>
              <Library className="h-4 w-4" />
              模板库
            </button>
          </div>
        </div>
        <textarea value={prompt} onChange={(event) => onPromptChange(event.target.value)} className="prompt-area" rows={9} />
        <label className="field-block">
          <span className="field-label">Negative Prompt</span>
          <textarea
            value={negativePrompt}
            onChange={(event) => onNegativePromptChange(event.target.value)}
            className="negative-area"
            rows={4}
            placeholder="不希望出现在图片里的元素、风格或缺陷"
          />
        </label>
        <StudioProPromptPanel
          finalPrompt={proPanel.finalPrompt}
          negativePrompt={negativePrompt}
          referenceCount={referenceImages.length}
          selectedStyleTokens={proPanel.selectedStyleTokens}
        />
        <div className="reference-tray">
          <div className="reference-strip">
            {referenceImages.map((image, index) => (
              <div key={image.id} className="reference-thumb" title={image.name}>
                <img src={image.src} alt={image.name} />
                <span>{`图 ${index + 1} · ${image.source === 'upload' ? '上传' : '作品'}`}</span>
                <button type="button" onClick={() => onRemoveReference(image.id)} aria-label="移除参考图">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button type="button" className="reference-add" onClick={() => inputRef.current?.click()}>
              <ImagePlus className="h-5 w-5" />
              <span>参考图</span>
            </button>
          </div>
          <span className={`reference-mode ${hasReferenceImage ? 'reference-mode-active' : ''}`}>
            {hasReferenceImage ? `已启用图生图 · 将按顺序发送 ${referenceImages.length} 张参考图` : '无参考图时使用文生图'}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            onChange={onReferenceUpload}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="field-block prompt-composer">
      <ConsumerTaskEntrySection
        onSelectTask={handleTaskSelect}
        onSelectScene={handleSceneSelect}
        onUseExample={handleUseExample}
      />

      <div className="prompt-composer-header">
        <span className="field-label">
          <Wand2 className="h-4 w-4" />
          第一步 · 描述一下你想做的图片
        </span>
        <div className="prompt-template-entry-group">
          <button
            type="button"
            className="settings-button prompt-template-entry"
            onClick={onSaveTemplate}
            disabled={templateActionDisabled}
            title={hasPrompt ? '收藏这段描述，方便下次继续使用' : '先写一点描述，再收藏这段内容'}
          >
            <BookmarkPlus className="h-4 w-4" />
            收藏描述
          </button>
          <button type="button" className="settings-button prompt-template-entry" onClick={onOpenTemplateLibrary}>
            <Library className="h-4 w-4" />
            常用描述
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)]">
        <div className="rounded-[1.7rem] border border-porcelain-50/10 bg-ink-950/[0.5]">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            className="prompt-area"
            rows={8}
            placeholder="比如：做一张高级感新品海报"
          />
        </div>

        <div className="grid gap-3 rounded-[1.7rem] border border-porcelain-50/10 bg-ink-950/[0.5] p-4">
          <div>
            <p className="text-sm font-semibold text-porcelain-50">再确认一个小问题，结果会更准</p>
            <p className="mt-1 text-sm leading-6 text-porcelain-100/52">
              不想回答也没关系，先试一版也可以。
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-porcelain-100/40">你更偏向哪种效果？</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ['更简洁', '整体更简洁，画面更干净。'],
                ['更高级', '整体更有高级感，质感更明显。'],
                ['更写实', '整体更写实自然，不要太像效果图。'],
                ['更有氛围', '整体更有氛围感，光线和情绪更明显。'],
              ].map(([label, text]) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.04] px-3 py-2 text-sm font-semibold text-porcelain-100/70 transition hover:-translate-y-0.5 hover:border-signal-cyan/40 hover:text-signal-cyan"
                  onClick={() => handleQuickDirection(text)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {hasReferenceImage ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-porcelain-100/40">你更想保留主体，还是更想换背景？</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ['保留主体', '请优先保留主体和主要构图。'],
                  ['换背景', '请保留主体，重点把背景换成更合适的环境。'],
                  ['你帮我决定', '请优先判断哪部分更值得保留，并给我更自然的一版结果。'],
                ].map(([label, text]) => (
                  <button
                    key={label}
                    type="button"
                    className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.04] px-3 py-2 text-sm font-semibold text-porcelain-100/70 transition hover:-translate-y-0.5 hover:border-signal-cyan/40 hover:text-signal-cyan"
                    onClick={() => handleQuickDirection(text)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[1.35rem] border border-signal-cyan/15 bg-signal-cyan/[0.06] p-4">
            <p className="text-sm font-semibold text-porcelain-50">让我们先帮你补全细节</p>
            <p className="mt-1 text-sm leading-6 text-porcelain-100/52">
              {completionSummary || '系统会优先补全背景、光线和构图细节，让你更快看到第一版。'}
            </p>
            <button
              type="button"
              className="mt-3 rounded-full border border-signal-cyan/25 bg-signal-cyan/[0.10] px-4 py-2 text-sm font-bold text-signal-cyan transition hover:-translate-y-0.5 hover:border-signal-cyan/45 hover:bg-signal-cyan/15"
              onClick={handleCompleteDetails}
            >
              帮我补全细节
            </button>
          </div>
        </div>
      </div>

      <details className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.38] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-porcelain-50">
          如果有明显不想要的内容，再补一句
        </summary>
        <p className="mt-2 text-sm leading-6 text-porcelain-100/48">
          比如不想要卡通感、过度磨皮、文字错误或夸张光影。
        </p>
        <textarea
          value={negativePrompt}
          onChange={(event) => onNegativePromptChange(event.target.value)}
          className="negative-area mt-3"
          rows={4}
          placeholder="不想出现的元素、风格或明显问题"
        />
      </details>
      <div className="reference-tray">
        <div className="reference-strip">
          {referenceImages.map((image, index) => (
            <div key={image.id} className="reference-thumb" title={image.name}>
              <img src={image.src} alt={image.name} />
              <span>{`${index === 0 ? '基础图' : `参考图 ${index + 1}`} · ${image.source === 'upload' ? '上传' : '结果'}`}</span>
              <button type="button" onClick={() => onRemoveReference(image.id)} aria-label="移除参考图">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button type="button" className="reference-add" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="h-5 w-5" />
            <span>{hasReferenceImage ? '再加一张参考图' : '上传原图'}</span>
          </button>
        </div>
        <span className={`reference-mode ${hasReferenceImage ? 'reference-mode-active' : ''}`}>
          {hasReferenceImage
            ? `已上传 ${referenceImages.length} 张图片，本次会按这些图片继续修改`
            : '还没上传图片时，会先按文字描述生成第一版'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="sr-only"
          onChange={onReferenceUpload}
        />
      </div>
    </div>
  )
}
