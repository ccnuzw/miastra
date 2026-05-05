import { useEffect, useMemo, useState } from 'react'
import { History, ImagePlus, Megaphone, Package, Type, UserRound } from 'lucide-react'
import { getStudioFlowSceneLabel } from '@/features/prompt-templates/studioFlowSemantic'
import {
  buildConsumerGuidedFlowSnapshot,
  buildGuidedPrompt,
  buildGuidedSelectionSummary,
  consumerExamplePrompts,
  consumerGuidedFlowPresets,
  consumerScenePresets,
  consumerTaskPresets,
  findConsumerGuidedFlowById,
  findConsumerGuidedFlowBySceneId,
  findConsumerGuidedFlowByTaskId,
  getConsumerGuidedFlowNextQuestionIndex,
  type ConsumerGuidedFlowPreset,
  type ConsumerScenePreset,
  type ConsumerTaskPreset,
} from './consumerHomePresets'
import {
  getConsumerGuidedFlowSelectionMap,
  type ConsumerGuidedFlowSnapshot,
} from '@/features/studio-consumer/consumerGuidedFlow'

type ConsumerTaskEntrySectionProps = {
  onSelectTask: (task: ConsumerTaskPreset) => void
  onSelectScene: (scene: ConsumerScenePreset) => void
  onUseExample: (prompt: string) => void
  onGuidedFlowChange?: (value: ConsumerGuidedFlowSnapshot | null) => void
  activeEntryLabel?: string | null
  guidedFlowValue?: ConsumerGuidedFlowSnapshot | null
  onJumpToInput?: () => void
}

type GuidedSelectionMap = Record<string, string>

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
  onGuidedFlowChange,
  activeEntryLabel = null,
  guidedFlowValue = null,
  onJumpToInput,
}: ConsumerTaskEntrySectionProps) {
  const defaultGuideId = consumerGuidedFlowPresets[0]?.id ?? ''
  const [activeGuideId, setActiveGuideId] = useState(defaultGuideId)
  const [guideSelections, setGuideSelections] = useState<Record<string, GuidedSelectionMap>>({})
  const [guideStepIndexes, setGuideStepIndexes] = useState<Record<string, number>>({})
  const [selectionHint, setSelectionHint] = useState('先选一个起手方式，或者直接用下面的高频追问补出第一版描述。')

  const activeGuide = useMemo(
    () => consumerGuidedFlowPresets.find((item) => item.id === activeGuideId) ?? consumerGuidedFlowPresets[0],
    [activeGuideId],
  )
  const activeSelections = activeGuide ? (guideSelections[activeGuide.id] ?? {}) : {}
  const activeGuidePrompt = activeGuide ? buildGuidedPrompt(activeGuide, activeSelections) : ''
  const activeGuideSummary = activeGuide ? buildGuidedSelectionSummary(activeGuide, activeSelections) : ''
  const activeGuideCompletedCount = activeGuide
    ? activeGuide.questions.filter((question) => Boolean(activeSelections[question.id])).length
    : 0
  const activeQuestionIndex = activeGuide
    ? Math.min(
        guideStepIndexes[activeGuide.id] ?? getConsumerGuidedFlowNextQuestionIndex(activeGuide, activeSelections),
        Math.max(0, activeGuide.questions.length - 1),
      )
    : 0
  const activeQuestion = activeGuide?.questions[activeQuestionIndex]

  useEffect(() => {
    if (!guidedFlowValue) return
    const guide = findConsumerGuidedFlowById(guidedFlowValue.guideId)
    if (!guide) return
    const selections = getConsumerGuidedFlowSelectionMap(guidedFlowValue)
    setActiveGuideId(guide.id)
    setGuideSelections((current) => ({
      ...current,
      [guide.id]: selections,
    }))
    setGuideStepIndexes((current) => ({
      ...current,
      [guide.id]: getConsumerGuidedFlowNextQuestionIndex(guide, selections),
    }))
    setSelectionHint(
      guidedFlowValue.completedQuestionCount > 0
        ? `已恢复「${guide.title}」追问，当前已完成 ${guidedFlowValue.completedQuestionCount}/${guidedFlowValue.totalQuestionCount} 步。`
        : `已恢复「${guide.title}」起步描述。继续点 2 到 3 个按钮，输入框会同步补全描述。`,
    )
  }, [guidedFlowValue])

  function emitGuidedFlowChange(guide: ConsumerGuidedFlowPreset, selections: GuidedSelectionMap) {
    onGuidedFlowChange?.(buildConsumerGuidedFlowSnapshot(guide, selections))
  }

  function activateGuide(guide: ConsumerGuidedFlowPreset, hint?: string) {
    const nextSelections = guideSelections[guide.id] ?? {}
    setActiveGuideId(guide.id)
    setGuideStepIndexes((current) => ({
      ...current,
      [guide.id]: getConsumerGuidedFlowNextQuestionIndex(guide, nextSelections),
    }))
    setSelectionHint(
      hint || `已切到「${getStudioFlowSceneLabel(guide.sceneId)}」场景。继续点 2 到 3 个按钮，输入框会同步补全描述。`,
    )
    onUseExample(buildGuidedPrompt(guide, nextSelections))
    emitGuidedFlowChange(guide, nextSelections)
  }

  function handleGuideOptionSelect(guide: ConsumerGuidedFlowPreset, questionId: string, optionId: string) {
    const nextSelections = {
      ...(guideSelections[guide.id] ?? {}),
      [questionId]: optionId,
    }
    setGuideSelections((current) => ({
      ...current,
      [guide.id]: nextSelections,
    }))
    setGuideStepIndexes((current) => ({
      ...current,
      [guide.id]: getConsumerGuidedFlowNextQuestionIndex(guide, nextSelections),
    }))
    setSelectionHint(`已按「${getStudioFlowSceneLabel(guide.sceneId)}」更新输入框。还可以再补一两个按钮，让第一版更接近目标。`)
    onUseExample(buildGuidedPrompt(guide, nextSelections))
    emitGuidedFlowChange(guide, nextSelections)
  }

  function handleResetGuide(guide: ConsumerGuidedFlowPreset) {
    setGuideSelections((current) => ({
      ...current,
      [guide.id]: {},
    }))
    setGuideStepIndexes((current) => ({
      ...current,
      [guide.id]: 0,
    }))
    setSelectionHint('已回到这个场景的基础描述。你可以重新选择细节。')
    onUseExample(guide.prompt)
    emitGuidedFlowChange(guide, {})
  }

  function handleTaskSelect(task: ConsumerTaskPreset) {
    onSelectTask(task)
    const guide = findConsumerGuidedFlowByTaskId(task.id)
    if (guide) activateGuide(guide, task.afterSelectHint)
    else {
      onGuidedFlowChange?.(null)
      if (task.afterSelectHint) setSelectionHint(task.afterSelectHint)
    }
  }

  function handleSceneSelect(scene: ConsumerScenePreset) {
    onSelectScene(scene)
    const guide = findConsumerGuidedFlowBySceneId(scene.id)
    if (guide) activateGuide(guide, scene.afterSelectHint)
    else {
      onGuidedFlowChange?.(null)
      if (scene.afterSelectHint) setSelectionHint(scene.afterSelectHint)
    }
  }

  function handleUseExample(prompt: string) {
    onUseExample(prompt)
    onGuidedFlowChange?.(null)
    setSelectionHint('已带入一句示例。你可以直接开始，也可以继续用高频追问把描述补完整。')
  }

  return (
    <section className="rounded-[2rem] border border-porcelain-50/10 bg-[linear-gradient(145deg,rgba(255,250,240,0.08),rgba(94,234,212,0.08)_42%,rgba(7,8,10,0.72))] p-5 shadow-card">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="eyebrow">起手</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-porcelain-50">你现在想做什么图？</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-porcelain-100/60">
            先选一个起手方式，下面的输入区会自动帮你接上。
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-porcelain-100/58">
            <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.05] px-3 py-1.5">1 选任务</span>
            <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.05] px-3 py-1.5">2 补一句需求</span>
            <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.05] px-3 py-1.5">3 先出第一版</span>
          </div>
        </div>
        <div className="max-w-md rounded-[1.6rem] border border-porcelain-50/10 bg-ink-950/50 px-4 py-3 text-sm leading-6 text-porcelain-100/55">
          你不用一开始就写很全。先起一版，再继续改，通常更快接近想要的效果。
        </div>
      </div>

      <div className="mt-4 rounded-[1.35rem] border border-signal-cyan/15 bg-signal-cyan/[0.06] px-4 py-3 text-sm text-porcelain-100/72">
        {selectionHint}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {consumerTaskPresets.map((task) => {
          const Icon = iconMap[task.icon]
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => handleTaskSelect(task)}
              className="group flex min-h-[148px] flex-col items-start justify-between rounded-[1.6rem] border border-porcelain-50/10 bg-ink-950/[0.56] p-4 text-left transition hover:-translate-y-0.5 hover:border-signal-cyan/45 hover:bg-signal-cyan/[0.08]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-signal-cyan/20 bg-signal-cyan/[0.08] text-signal-cyan transition group-hover:border-signal-cyan/45 group-hover:bg-signal-cyan/15">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-semibold text-porcelain-50">{task.title}</p>
                <p className="mt-2 text-sm leading-6 text-porcelain-100/52">{task.description}</p>
                <span className="mt-4 inline-flex rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.04] px-3 py-1.5 text-xs font-bold text-porcelain-50 transition group-hover:border-signal-cyan/45 group-hover:text-signal-cyan">
                  {task.ctaLabel ?? '立即开始'}
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
                onClick={() => handleSceneSelect(scene)}
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
                onClick={() => handleUseExample(example)}
                className="rounded-[1.2rem] border border-porcelain-50/10 bg-porcelain-50/[0.04] px-4 py-3 text-left text-sm font-semibold text-porcelain-100/72 transition hover:-translate-y-0.5 hover:border-signal-cyan/45 hover:text-porcelain-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.7rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-porcelain-50">高频场景追问</p>
            <p className="mt-1 text-sm leading-6 text-porcelain-100/48">
              先选一个统一场景，再按步骤补 2 到 3 个按钮，描述会直接进入普通版输入框。
            </p>
          </div>
          <p className="text-sm text-porcelain-100/55">首批先做商品图、海报宣传图、头像与人像 3 个高频场景。</p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {consumerGuidedFlowPresets.map((guide) => {
            const isActive = guide.id === activeGuide?.id
            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => activateGuide(guide)}
                className={`rounded-[1.4rem] border p-4 text-left transition hover:-translate-y-0.5 ${
                  isActive
                    ? 'border-signal-cyan/45 bg-signal-cyan/[0.10]'
                    : 'border-porcelain-50/10 bg-porcelain-50/[0.04] hover:border-signal-cyan/35'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-porcelain-50">{guide.title}</p>
                  <span className="rounded-full border border-porcelain-50/10 bg-ink-950/40 px-2.5 py-1 text-[10px] font-bold text-porcelain-100/55">
                    {getStudioFlowSceneLabel(guide.sceneId)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-porcelain-100/55">{guide.description}</p>
              </button>
            )
          })}
        </div>

        {activeGuide ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="grid gap-3">
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-porcelain-50/[0.035] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.10] px-3 py-1 text-xs font-bold text-signal-cyan">
                    已完成 {activeGuideCompletedCount}/{activeGuide.questions.length} 步
                  </span>
                  {activeGuide.questions.map((question, index) => {
                    const answered = Boolean(activeSelections[question.id])
                    const current = index === activeQuestionIndex
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() =>
                          setGuideStepIndexes((currentIndexes) => ({
                            ...currentIndexes,
                            [activeGuide.id]: index,
                          }))
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          current
                            ? 'border-signal-cyan/45 bg-signal-cyan/[0.12] text-signal-cyan'
                            : answered
                              ? 'border-emerald-300/25 bg-emerald-300/[0.10] text-emerald-200'
                              : 'border-porcelain-50/10 bg-porcelain-50/[0.04] text-porcelain-100/60 hover:border-signal-cyan/30 hover:text-signal-cyan'
                        }`}
                      >
                        {index + 1}. {question.title}
                      </button>
                    )
                  })}
                </div>
              </div>

              {activeQuestion ? (
                <div className="rounded-[1.35rem] border border-signal-cyan/18 bg-signal-cyan/[0.06] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-signal-cyan/70">
                      第 {activeQuestionIndex + 1} 步
                    </p>
                    {activeQuestion.defaultOptionId ? (
                      <span className="rounded-full border border-porcelain-50/10 bg-ink-950/40 px-3 py-1 text-xs text-porcelain-100/55">
                        默认建议：
                        {activeQuestion.options.find((option) => option.id === activeQuestion.defaultOptionId)?.label ?? '未设置'}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-base font-semibold text-porcelain-50">{activeQuestion.title}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {activeQuestion.options.map((option) => {
                      const selected = activeSelections[activeQuestion.id] === option.id
                      const isDefault = option.id === activeQuestion.defaultOptionId
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            selected
                              ? 'border-signal-cyan/45 bg-signal-cyan/[0.12] text-signal-cyan'
                              : 'border-porcelain-50/10 bg-porcelain-50/[0.04] text-porcelain-100/72 hover:border-signal-cyan/35 hover:text-signal-cyan'
                          }`}
                          onClick={() => handleGuideOptionSelect(activeGuide, activeQuestion.id, option.id)}
                        >
                          {option.label}
                          {isDefault ? ' · 默认' : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-porcelain-50/[0.035] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-porcelain-100/40">已选步骤</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeGuide.questions.map((question) => {
                    const selectedLabel = question.options.find((option) => option.id === activeSelections[question.id])?.label
                    return (
                      <span
                        key={question.id}
                        className={`rounded-full border px-3 py-2 text-sm ${
                          selectedLabel
                            ? 'border-emerald-300/25 bg-emerald-300/[0.10] text-emerald-100'
                            : 'border-porcelain-50/10 bg-porcelain-50/[0.04] text-porcelain-100/42'
                        }`}
                      >
                        {question.title}：{selectedLabel ?? '待补'}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-signal-cyan/15 bg-signal-cyan/[0.06] p-4">
              <p className="text-sm font-semibold text-porcelain-50">已带入的场景描述</p>
              <p className="mt-2 text-sm text-porcelain-100/55">统一场景：{getStudioFlowSceneLabel(activeGuide.sceneId)}</p>
              <p className="mt-2 text-sm text-porcelain-100/55">
                当前选择：{activeGuideSummary} · 已完成 {activeGuideCompletedCount}/{activeGuide.questions.length} 步
              </p>
              <div className="mt-4 rounded-[1.2rem] border border-porcelain-50/10 bg-ink-950/[0.48] p-4 text-sm leading-6 text-porcelain-100/72">
                {activeGuidePrompt}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-signal-cyan/25 bg-signal-cyan/[0.10] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:-translate-y-0.5 hover:border-signal-cyan/45"
                  onClick={() => onUseExample(activeGuidePrompt)}
                >
                  重新带入输入框
                </button>
                <button
                  type="button"
                  className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm text-porcelain-100/72 transition hover:border-porcelain-50/25 hover:text-porcelain-50"
                  onClick={() => handleResetGuide(activeGuide)}
                >
                  清空这一组追问
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-[1.6rem] border border-signal-cyan/18 bg-signal-cyan/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-porcelain-50">任务入口会直接把你带到下面的输入区</p>
          <p className="mt-1 text-sm leading-6 text-porcelain-100/55">
            {activeEntryLabel
              ? `当前已选「${activeEntryLabel}」，继续在下面补一句最重要的要求就行。`
              : '也可以跳过上面的卡片，直接去下面输入你现在最想做的图。'}
          </p>
        </div>
        {onJumpToInput ? (
          <button
            type="button"
            onClick={onJumpToInput}
            className="inline-flex items-center justify-center rounded-full border border-signal-cyan/28 bg-signal-cyan/[0.12] px-4 py-2 text-sm font-bold text-signal-cyan transition hover:-translate-y-0.5 hover:border-signal-cyan/50 hover:bg-signal-cyan/18"
          >
            去输入区
          </button>
        ) : null}
      </div>
    </section>
  )
}
