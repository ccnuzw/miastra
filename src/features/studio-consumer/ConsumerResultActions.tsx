import { useEffect, useState } from 'react'
import { Crop, Images, Mountain, Palette, RotateCcw, Wand2 } from 'lucide-react'
import { getWorkVersionSourceSummary } from '@/features/works/workReplay'
import type { GalleryImage } from '@/features/works/works.types'
import { dispatchStudioConsumerIntent } from './consumerFlow.events'

type ConsumerResultActionsProps = {
  preview: GalleryImage
}

export const studioConsumerResultActionEvent = 'studio-consumer:result-action'

export type StudioConsumerResultActionDetail = {
  actionId: string
  actionTitle: string
  actionDescription: string
  preview: {
    id: string
    src: string
    title: string
    meta: string
  }
  submit: boolean
  nextStep: string
}

const actionDefinitions = [
  {
    id: 'closer',
    title: '更像这一版',
    description: '沿着这张图的主体、光线和构图继续收紧，先回输入区确认后再试。',
    icon: Wand2,
    text: '请沿用这张结果图的主体、光线和构图，再生成一版更接近我想要的效果。',
    submit: false,
    badge: '先回输入区',
  },
  {
    id: 'style',
    title: '换个风格',
    description: '保留主要内容不变，先把这张图带回去，再换一种更有感觉的表现方式。',
    icon: Palette,
    text: '请保留这张结果图的主要内容不变，换一种更有风格感的表现方式。',
    submit: false,
    badge: '先回输入区',
  },
  {
    id: 'partial',
    title: '只改局部',
    description: '把当前结果带回输入区，只调整最需要修改的一小部分，其他内容尽量不动。',
    icon: Crop,
    text: '请只调整这张结果图里最需要修改的一小部分，其余内容尽量保持不变。',
    submit: false,
    badge: '先回输入区',
  },
  {
    id: 'background',
    title: '主体不动，换背景',
    description: '把这张图当作基础图带回去，保留主体，只换一个更合适的环境。',
    icon: Mountain,
    text: '请保留这张结果图的主体不变，把背景换成更合适的环境，构图尽量自然。',
    submit: false,
    badge: '先回输入区',
  },
  {
    id: 'more',
    title: '沿着这一版再做几张',
    description: '直接沿着这张图的方向继续生成几版相近方案，不用重新起步。',
    icon: Images,
    text: '请基于这张结果图再多生成几张相近方案，保留主体和整体方向。',
    submit: true,
    badge: '直接继续做',
  },
  {
    id: 'retry',
    title: '回到输入区细调',
    description: '不清空现有内容，保留这张图和方向，回到输入区补一句再试。',
    icon: RotateCcw,
    text: '请保留这张结果图的主体和核心方向，再试一版更稳定、更清楚的结果。',
    submit: false,
    badge: '先回输入区',
  },
] as const

function trimText(value?: string, fallback = '当前结果') {
  const normalized = value?.trim()
  if (!normalized) return fallback
  return normalized.length > 30 ? `${normalized.slice(0, 30)}…` : normalized
}

export function ConsumerResultActions({ preview }: ConsumerResultActionsProps) {
  const [lastTriggeredActionId, setLastTriggeredActionId] = useState<string | null>(null)
  const versionSource = getWorkVersionSourceSummary(preview)

  useEffect(() => {
    setLastTriggeredActionId(null)
  }, [preview.id, preview.src])

  function handleAction(action: (typeof actionDefinitions)[number]) {
    if (!preview.src) return
    setLastTriggeredActionId(action.id)

    dispatchStudioConsumerIntent({
      type: 'prompt',
      mode: 'followup',
      text: action.text,
      attachPreview: {
        src: preview.src,
        title: preview.title,
      },
      focus: true,
      submit: action.submit,
    })

    const nextStep = action.submit
      ? '系统会沿用这张结果图继续生成，你可以直接等下一版出来。'
      : '这张结果图会回到输入区作为基础图，你可以直接点“先试试看”，也可以再补一句。'

    window.dispatchEvent(
      new CustomEvent<StudioConsumerResultActionDetail>(studioConsumerResultActionEvent, {
        detail: {
          actionId: action.id,
          actionTitle: action.title,
          actionDescription: action.description,
          preview: {
            id: preview.id,
            src: preview.src,
            title: preview.title || '当前结果',
            meta: preview.meta || '',
          },
          submit: action.submit,
          nextStep,
        },
      }),
    )
  }

  const previewTitle = trimText(preview.title, '这张刚生成的结果')
  const previewMeta = trimText(preview.meta, '点击任一动作时，都会沿用这张图继续往下改。')
  const lastTriggeredAction = actionDefinitions.find((action) => action.id === lastTriggeredActionId)

  return (
    <section className="mt-5 rounded-[1.7rem] border border-porcelain-50/10 bg-ink-950/[0.52] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Continue</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-porcelain-50">基于这一版继续往下改</h3>
        </div>
        <p className="max-w-md text-sm leading-6 text-porcelain-100/55">
          不用重新开始，下面每个动作都会自动沿用当前结果，再决定是直接继续做，还是先回输入区补一句。
        </p>
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-signal-cyan/15 bg-signal-cyan/[0.06] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-signal-cyan/70">当前继续来源</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.1] px-3 py-1 text-sm font-semibold text-signal-cyan">
            {versionSource.originLabel}
          </span>
          <span className="rounded-full border border-porcelain-50/10 bg-ink-950/40 px-3 py-1 text-sm text-porcelain-100/62">
            {versionSource.detailLabel}
          </span>
          <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.1] px-3 py-1 text-sm font-semibold text-signal-cyan">
            {previewTitle}
          </span>
          <span className="rounded-full border border-porcelain-50/10 bg-ink-950/40 px-3 py-1 text-sm text-porcelain-100/62">
            {previewMeta}
          </span>
        </div>
      </div>

      {lastTriggeredAction ? (
        <div className="mt-4 rounded-[1.35rem] border border-emerald-300/20 bg-emerald-300/[0.08] p-4">
          <p className="text-sm font-semibold text-porcelain-50">已选“{lastTriggeredAction.title}”</p>
          <p className="mt-1 text-sm leading-6 text-porcelain-100/62">
            {lastTriggeredAction.submit
              ? '系统正在沿用这张结果继续生成下一版。'
              : '当前结果会自动带回输入区作为基础图，你可以直接继续细调。'}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actionDefinitions.map((action) => {
          const Icon = action.icon
          const isActive = action.id === lastTriggeredActionId
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action)}
              aria-pressed={isActive}
              className={`group flex min-h-[140px] flex-col items-start gap-3 rounded-[1.4rem] border p-4 text-left transition hover:-translate-y-0.5 hover:border-signal-cyan/45 hover:bg-signal-cyan/[0.10] ${
                isActive
                  ? 'border-signal-cyan/45 bg-signal-cyan/[0.12]'
                  : 'border-porcelain-50/10 bg-porcelain-50/[0.04]'
              }`}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-signal-cyan/20 bg-signal-cyan/[0.08] text-signal-cyan transition group-hover:border-signal-cyan/45 group-hover:bg-signal-cyan/15">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-porcelain-50/10 bg-ink-950/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-porcelain-100/55">
                  {action.badge}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-porcelain-50">{action.title}</p>
                <p className="mt-1 text-sm leading-6 text-porcelain-100/52">{action.description}</p>
              </div>
              <p className="mt-auto text-xs leading-5 text-porcelain-100/42">
                {action.submit
                  ? '会沿用这张结果图，直接开始下一轮生成。'
                  : '会把这张结果图带回输入区，保留当前方向继续改。'}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
