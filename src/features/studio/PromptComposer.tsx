import { type ChangeEvent, type RefObject, useEffect, useRef, useState } from 'react'
import { BookmarkPlus, ImagePlus, Library, Wand2, X } from 'lucide-react'
import type { ReferenceImage } from '@/features/references/reference.types'
import type { ConsumerGuidedFlowSnapshot } from '@/features/studio-consumer/consumerGuidedFlow'
import { studioConsumerIntentEvent, type StudioConsumerIntent } from '@/features/studio-consumer/consumerFlow.events'
import { ConsumerTaskEntrySection } from '@/features/studio-home/ConsumerTaskEntrySection'
import type { ConsumerScenePreset, ConsumerTaskPreset } from '@/features/studio-home/consumerHomePresets'
import { StudioProPromptPanel } from '@/features/studio-pro/StudioProPromptPanel'
import type { StudioProPromptSection, StudioProTemplateContext } from '@/features/studio-pro/studioPro.utils'
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
  consumerGuidedFlow?: ConsumerGuidedFlowSnapshot | null
  onConsumerGuidedFlowChange?: (value: ConsumerGuidedFlowSnapshot | null) => void
  proPanel?: {
    workspacePrompt: string
    finalPrompt: string
    selectedStyleTokens: StyleToken[]
    promptSections: StudioProPromptSection[]
    finalPromptLength: number
    workspacePromptLength: number
    enabledSectionCount: number
    templateContext?: StudioProTemplateContext | null
    replayContext?: import('@/features/studio-pro/studioPro.utils').StudioProReplayContext | null
    onApplyTemplatePrompt?: () => void
    onApplyReplayPrompt?: () => void
    onResetPromptToWorkspace?: () => void
  } | null
}

type ConsumerEntryState = {
  label: string
  note: string
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
  consumerGuidedFlow = null,
  onConsumerGuidedFlowChange,
  proPanel = null,
}: PromptComposerProps) {
  const hasPrompt = prompt.trim().length > 0
  const [completionSummary, setCompletionSummary] = useState('')
  const [activeEntry, setActiveEntry] = useState<ConsumerEntryState | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const promptRef = useRef(prompt)

  useEffect(() => {
    promptRef.current = prompt
  }, [prompt])

  useEffect(() => {
    if (!prompt.trim()) setActiveEntry(null)
  }, [prompt])

  useEffect(() => {
    if (!prompt.trim() && consumerGuidedFlow) onConsumerGuidedFlowChange?.(null)
  }, [consumerGuidedFlow, onConsumerGuidedFlowChange, prompt])

  useEffect(() => {
    if (!consumerGuidedFlow) return
    setActiveEntry({
      label: consumerGuidedFlow.guideTitle,
      note:
        consumerGuidedFlow.completedQuestionCount > 0
          ? `已恢复这组轻量追问，当前已完成 ${consumerGuidedFlow.completedQuestionCount}/${consumerGuidedFlow.totalQuestionCount} 步。`
          : '已恢复这个场景的起步描述。继续补几步追问，输入区会同步更新。',
    })
  }, [consumerGuidedFlow])

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

        if (event.detail.guidedFlow !== undefined) {
          onConsumerGuidedFlowChange?.(event.detail.guidedFlow ?? null)
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
      setActiveEntry({
        label: task.title,
        note: '最近结果区已经在下方，选一张你刚做过的图，就能继续往下改。',
      })
      document.querySelector('.studio-works-column')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (task.prompt) onPromptChange(task.prompt)
    onConsumerGuidedFlowChange?.(null)
    setActiveEntry({
      label: task.title,
      note:
        task.afterSelectHint ||
        (task.openUpload
          ? '已带入继续修改的起步描述。上传原图后，再补一句最想改哪里就可以开始。'
          : '已带入起步描述。继续补一句主体、感觉或用途，就可以直接开始。'),
    })
    if (task.openUpload) inputRef.current?.click()
    focusComposer()
  }

  function handleSceneSelect(scene: ConsumerScenePreset) {
    onPromptChange(scene.prompt)
    onConsumerGuidedFlowChange?.(null)
    setActiveEntry({
      label: scene.title,
      note: scene.afterSelectHint || '已带入常见场景描述。继续补一句你最在意的效果，结果会更贴近需求。',
    })
    focusComposer()
  }

  function handleQuickDirection(text: string) {
    onPromptChange(upsertFollowup(promptRef.current, text))
    focusComposer()
  }

  function handleUseExample(text: string) {
    onPromptChange(text)
    setActiveEntry({
      label: '示例起手',
      note: '已带入一句现成描述。继续改成你自己的商品、人物或场景即可。',
    })
    focusComposer()
  }

  function handleCompleteDetails() {
    const summary = hasReferenceImage
      ? '会优先保留主体，再帮你补全背景、光线和整体氛围。'
      : '会按你现在的描述，先把背景、光线和构图补得更完整。'
    const addition = hasReferenceImage
      ? '请优先保留主体，并把背景、光线和整体氛围补全得更自然。'
      : '请根据我的描述补全背景、光线和构图细节，让第一版更完整、更接近真实需求。'

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
          workspacePrompt={proPanel.workspacePrompt}
          finalPrompt={proPanel.finalPrompt}
          referenceCount={referenceImages.length}
          selectedStyleTokens={proPanel.selectedStyleTokens}
          promptSections={proPanel.promptSections}
          finalPromptLength={proPanel.finalPromptLength}
          workspacePromptLength={proPanel.workspacePromptLength}
          enabledSectionCount={proPanel.enabledSectionCount}
          templateContext={proPanel.templateContext}
          replayContext={proPanel.replayContext}
          onApplyTemplatePrompt={proPanel.onApplyTemplatePrompt}
          onApplyReplayPrompt={proPanel.onApplyReplayPrompt}
          onResetPromptToWorkspace={proPanel.onResetPromptToWorkspace}
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
        onGuidedFlowChange={onConsumerGuidedFlowChange}
        activeEntryLabel={activeEntry?.label ?? null}
        guidedFlowValue={consumerGuidedFlow}
        onJumpToInput={focusComposer}
      />

      <div className="prompt-composer-header">
        <div className="space-y-2">
          <span className="field-label">
            <Wand2 className="h-4 w-4" />
            把需求告诉我
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight text-porcelain-50 sm:text-[1.55rem]">
              {activeEntry ? `继续补一句，让「${activeEntry.label}」更接近你想要的效果` : '先说主体、感觉或用途就够了'}
            </p>
            <p className="mt-2 text-sm leading-6 text-porcelain-100/55">
              {activeEntry?.note ||
                (hasReferenceImage
                  ? '如果你已经上传图片，直接告诉我想保留什么、想改哪里，我会按这张图继续做。'
                  : '不知道怎么开头也没关系，先说你要做什么图、想要什么感觉，或者这张图用在哪里。')}
            </p>
          </div>
        </div>
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.74fr)]">
        <div className="rounded-[1.85rem] border border-signal-cyan/18 bg-[linear-gradient(160deg,rgba(94,234,212,0.10),rgba(255,250,240,0.04)_22%,rgba(7,8,10,0.68)_72%)] p-4 shadow-card">
          <div className="rounded-[1.4rem] border border-porcelain-50/10 bg-ink-950/[0.55] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.10] px-3 py-1 text-xs font-bold text-signal-cyan">
                {hasPrompt ? '输入区已准备好' : '还没想完整也没关系'}
              </span>
              {activeEntry ? (
                <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.05] px-3 py-1 text-xs font-semibold text-porcelain-100/68">
                  已从「{activeEntry.label}」带入起步内容
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-porcelain-100/58">
              {hasPrompt
                ? '现在可以直接生成，也可以再补一句你最在意的地方，比如主体、风格、氛围、用途或想保留的内容。'
                : '不知道怎么写时，就按这 3 点说：做什么、想要什么感觉、这张图用在哪里。'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-porcelain-100/58">
              <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.05] px-3 py-1.5">主体是什么</span>
              <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.05] px-3 py-1.5">想做成什么感觉</span>
              <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.05] px-3 py-1.5">主要用在哪里</span>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            className="prompt-area mt-4"
            rows={9}
            placeholder={
              hasReferenceImage
                ? '比如：保留主体，把背景换成更干净的影棚风格，整体更高级一点'
                : '比如：做一张高级感新品海报，用在首页首屏，画面干净有质感'
            }
          />
          {consumerGuidedFlow ? (
            <div className="mt-4 rounded-[1.3rem] border border-signal-cyan/18 bg-signal-cyan/[0.06] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.10] px-3 py-1 text-xs font-bold text-signal-cyan">
                  {consumerGuidedFlow.guideTitle}
                </span>
                <span className="rounded-full border border-porcelain-50/10 bg-ink-950/40 px-3 py-1 text-xs text-porcelain-100/60">
                  追问进度 {consumerGuidedFlow.completedQuestionCount}/{consumerGuidedFlow.totalQuestionCount}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-porcelain-100/62">{consumerGuidedFlow.summary}</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-[1.7rem] border border-porcelain-50/10 bg-ink-950/[0.5] p-4">
          <div>
            <p className="text-sm font-semibold text-porcelain-50">还想再补一点方向的话，点一下就行</p>
            <p className="mt-1 text-sm leading-6 text-porcelain-100/52">
              这些都是可选的，不想选也可以直接先出一版。
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-porcelain-100/40">这版更想往哪边走？</p>
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-porcelain-100/40">这张原图你更想怎么延续？</p>
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
            <p className="text-sm font-semibold text-porcelain-50">如果你只想先快点看到一版</p>
            <p className="mt-1 text-sm leading-6 text-porcelain-100/52">
              {completionSummary || '我可以先帮你把背景、光线和构图补完整，让第一版更像一个可继续修改的结果。'}
            </p>
            <button
              type="button"
              className="mt-3 rounded-full border border-signal-cyan/25 bg-signal-cyan/[0.10] px-4 py-2 text-sm font-bold text-signal-cyan transition hover:-translate-y-0.5 hover:border-signal-cyan/45 hover:bg-signal-cyan/15"
              onClick={handleCompleteDetails}
            >
              先帮我补完整一点
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.34] px-4 py-3 text-sm leading-6 text-porcelain-100/55">
        有原图的话，也可以一起上传。我会按这张图继续修改，不用你从头重写。
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
