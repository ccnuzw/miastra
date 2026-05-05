import { History, ImagePlus, Megaphone, Package, Type, UserRound } from 'lucide-react'
import {
  consumerExamplePrompts,
  consumerScenePresets,
  consumerTaskPresets,
  type ConsumerScenePreset,
  type ConsumerTaskPreset,
} from './consumerHomePresets'

type ConsumerTaskEntrySectionProps = {
  onSelectTask: (task: ConsumerTaskPreset) => void
  onSelectScene: (scene: ConsumerScenePreset) => void
  onUseExample: (prompt: string) => void
}

const iconMap = {
  text: Type,
  image: ImagePlus,
  product: Package,
  poster: Megaphone,
  portrait: UserRound,
  history: History,
} as const

export function ConsumerTaskEntrySection({
  onSelectTask,
  onSelectScene,
  onUseExample,
}: ConsumerTaskEntrySectionProps) {
  return (
    <section className="rounded-[2rem] border border-porcelain-50/10 bg-[linear-gradient(145deg,rgba(255,250,240,0.08),rgba(94,234,212,0.08)_42%,rgba(7,8,10,0.72))] p-5 shadow-card">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="eyebrow">Start</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-porcelain-50">你现在想做什么图？</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-porcelain-100/60">
            一句话描述，或上传一张图，我们帮你开始。
          </p>
        </div>
        <div className="max-w-md rounded-[1.6rem] border border-porcelain-50/10 bg-ink-950/50 px-4 py-3 text-sm leading-6 text-porcelain-100/55">
          先出第一版，不满意再继续改。你不需要先把所有细节都想清楚。
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {consumerTaskPresets.map((task) => {
          const Icon = iconMap[task.icon]
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task)}
              className="group flex min-h-[148px] flex-col items-start justify-between rounded-[1.6rem] border border-porcelain-50/10 bg-ink-950/[0.56] p-4 text-left transition hover:-translate-y-0.5 hover:border-signal-cyan/45 hover:bg-signal-cyan/[0.08]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-signal-cyan/20 bg-signal-cyan/[0.08] text-signal-cyan transition group-hover:border-signal-cyan/45 group-hover:bg-signal-cyan/15">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-semibold text-porcelain-50">{task.title}</p>
                <p className="mt-2 text-sm leading-6 text-porcelain-100/52">{task.description}</p>
                <span className="mt-4 inline-flex rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.04] px-3 py-1.5 text-xs font-bold text-porcelain-50 transition group-hover:border-signal-cyan/45 group-hover:text-signal-cyan">
                  立即开始
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[1.6rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
          <p className="text-sm font-semibold text-porcelain-50">常用场景</p>
          <p className="mt-1 text-sm text-porcelain-100/48">不知道怎么写时，可以先从常见任务开始。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {consumerScenePresets.map((scene) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelectScene(scene)}
                className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.04] px-4 py-2 text-sm font-semibold text-porcelain-100/72 transition hover:-translate-y-0.5 hover:border-signal-cyan/45 hover:text-signal-cyan"
                title={scene.description}
              >
                {scene.title}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
          <p className="text-sm font-semibold text-porcelain-50">不会写也没关系</p>
          <p className="mt-1 text-sm text-porcelain-100/48">直接点一句示例，再按你的需要改一改。</p>
          <div className="mt-4 grid gap-2">
            {consumerExamplePrompts.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onUseExample(example)}
                className="rounded-[1.2rem] border border-porcelain-50/10 bg-porcelain-50/[0.04] px-4 py-3 text-left text-sm font-semibold text-porcelain-100/72 transition hover:-translate-y-0.5 hover:border-signal-cyan/45 hover:text-porcelain-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
