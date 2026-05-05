import { Crop, Images, Mountain, Palette, RotateCcw, Wand2 } from 'lucide-react'
import type { GalleryImage } from '@/features/works/works.types'
import { dispatchStudioConsumerIntent } from './consumerFlow.events'

type ConsumerResultActionsProps = {
  preview: GalleryImage
}

const actionDefinitions = [
  {
    id: 'closer',
    title: '更像这一张',
    description: '保留主体、光线和构图，再做一版更接近的结果。',
    icon: Wand2,
    text: '请沿用这张图的主体、光线和构图，再生成一版更接近我想要的效果。',
  },
  {
    id: 'style',
    title: '换个风格',
    description: '保留主要内容，换一种更有感觉的表现方式。',
    icon: Palette,
    text: '请保留主要内容不变，换一种更有风格感的表现方式。',
  },
  {
    id: 'partial',
    title: '只改这一部分',
    description: '只调整最需要修改的一小部分，其他内容尽量不动。',
    icon: Crop,
    text: '请只调整画面里最需要修改的一小部分，其余内容尽量保持不变。',
  },
  {
    id: 'background',
    title: '保留主体换背景',
    description: '把当前结果作为基础图，换一个更合适的环境。',
    icon: Mountain,
    text: '请保留主体不变，把背景换成更合适的环境，构图尽量自然。',
  },
  {
    id: 'more',
    title: '再生成几张',
    description: '沿着这张图的方向，再多试几版相近方案。',
    icon: Images,
    text: '请基于当前结果再多生成几张相近方案，保留主体和整体方向。',
  },
  {
    id: 'retry',
    title: '回到上一步重试',
    description: '不清空当前内容，回到输入区继续微调后再试。',
    icon: RotateCcw,
    text: '请保留当前主体和核心方向，再试一版更稳定、更清楚的结果。',
  },
] as const

export function ConsumerResultActions({ preview }: ConsumerResultActionsProps) {
  function handleAction(text: string) {
    if (!preview.src) return
    dispatchStudioConsumerIntent({
      type: 'prompt',
      mode: 'followup',
      text,
      attachPreview: {
        src: preview.src,
        title: preview.title,
      },
      focus: true,
      submit: true,
    })
  }

  return (
    <section className="mt-5 rounded-[1.7rem] border border-porcelain-50/10 bg-ink-950/[0.52] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Next</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-porcelain-50">接下来你可以这样继续改</h3>
        </div>
        <p className="max-w-md text-sm leading-6 text-porcelain-100/55">
          不满意没关系，继续改通常会更接近你想要的效果。
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actionDefinitions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action.text)}
              className="group flex min-h-[124px] flex-col items-start gap-3 rounded-[1.4rem] border border-porcelain-50/10 bg-porcelain-50/[0.04] p-4 text-left transition hover:-translate-y-0.5 hover:border-signal-cyan/45 hover:bg-signal-cyan/[0.10]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-signal-cyan/20 bg-signal-cyan/[0.08] text-signal-cyan transition group-hover:border-signal-cyan/45 group-hover:bg-signal-cyan/15">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-porcelain-50">{action.title}</p>
                <p className="mt-1 text-sm leading-6 text-porcelain-100/52">{action.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
