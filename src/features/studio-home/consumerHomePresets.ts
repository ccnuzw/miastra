import {
  buildPromptTemplateStructure,
  getPromptTemplateScenarioConfigById,
  resolvePromptTemplateGuidedFieldDefaultOptionId,
  resolvePromptTemplateGuidedFieldRecommendedOptionId,
} from '@/features/prompt-templates/promptTemplate.schema'
import type {
  PromptTemplateFieldDefinition,
  PromptTemplateGuidedFlowEntryBinding,
  PromptTemplateGuidedSelectionMode,
  PromptTemplateScenarioId,
} from '@/features/prompt-templates/promptTemplate.types'
import type {
  ConsumerGuidedFlowSelectionMap,
  ConsumerGuidedFlowSnapshot,
  ConsumerGuidedFlowStepSnapshot,
  ConsumerGuidedFlowSelectionSource,
} from '@/features/studio-consumer/consumerGuidedFlow'
import type {
  StudioFlowActionId,
  StudioFlowFieldId,
  StudioFlowSceneId,
  StudioFlowSourceType,
} from '@/features/prompt-templates/studioFlowSemantic'
import {
  getStudioFlowFieldLabel,
  getStudioFlowScene,
  getStudioFlowSceneLabel,
  mapPromptScenarioToFlowSceneId,
} from '@/features/prompt-templates/studioFlowSemantic'

export type ConsumerTaskPreset = {
  id: string
  title: string
  description: string
  icon: 'text' | 'image' | 'product' | 'poster' | 'portrait' | 'history'
  sceneId?: StudioFlowSceneId
  prompt?: string
  openUpload?: boolean
  action?: 'continue'
  ctaLabel?: string
  afterSelectHint?: string
}

export type ConsumerScenePreset = {
  id: string
  title: string
  description: string
  sceneId?: StudioFlowSceneId
  prompt: string
  afterSelectHint?: string
}

export type ConsumerGuidedFlowOption = {
  id: string
  label: string
  prompt: string
}

export type ConsumerGuidedFlowQuestion = {
  id: string
  fieldId?: StudioFlowFieldId
  title: string
  defaultOptionId?: string
  recommendedOptionId?: string
  options: ConsumerGuidedFlowOption[]
}

export type ConsumerGuidedFlowEntryBinding = {
  id: string
  mode: PromptTemplateGuidedSelectionMode
  selections: ConsumerGuidedFlowSelectionMap
  semanticActionId?: StudioFlowActionId
}

export type ConsumerGuidedFlowPreset = {
  id: string
  scenarioId: PromptTemplateScenarioId
  sceneId: StudioFlowSceneId
  title: string
  description: string
  prompt: string
  defaultPromptText: string
  taskIds?: string[]
  sceneIds?: string[]
  resultActionIds?: string[]
  taskBindings?: ConsumerGuidedFlowEntryBinding[]
  sceneBindings?: ConsumerGuidedFlowEntryBinding[]
  resultActionBindings?: ConsumerGuidedFlowEntryBinding[]
  questions: ConsumerGuidedFlowQuestion[]
}

export type ConsumerGuidedFlowResolveContext = {
  taskId?: string
  sceneId?: string
  resultActionId?: string
  currentSelections?: ConsumerGuidedFlowSelectionMap
  fallbackMode?: PromptTemplateGuidedSelectionMode
}

export type ConsumerGuidedFlowBuildOptions = {
  updatedAt?: number
  sourceType?: StudioFlowSourceType | 'manual'
  selectionSource?: ConsumerGuidedFlowSelectionSource
  actionId?: StudioFlowActionId
  promptAppendix?: string
}

const consumerGuidedFlowScenarioIds: PromptTemplateScenarioId[] = [
  'product-shot',
  'poster-campaign',
  'portrait-look',
  'space-scene',
  'illustration-concept',
  'generic-starter',
]

function createQuestionId(fieldId: string) {
  return fieldId
}

function toGuidedQuestion(field: PromptTemplateFieldDefinition): ConsumerGuidedFlowQuestion | null {
  if (!field.guided?.options?.length) return null
  return {
    id: createQuestionId(field.id),
    fieldId: field.guided.semanticFieldId,
    title: field.guided.questionTitle?.trim() || field.label,
    defaultOptionId: resolvePromptTemplateGuidedFieldDefaultOptionId(field),
    recommendedOptionId: resolvePromptTemplateGuidedFieldRecommendedOptionId(field),
    options: field.guided.options.map((option) => ({
      id: option.id,
      label: option.label,
      prompt: option.prompt,
    })),
  }
}

function toEntryBindings(
  bindings: PromptTemplateGuidedFlowEntryBinding[] | undefined,
  semanticActionIds?: Partial<Record<string, StudioFlowActionId | undefined>>,
) {
  return (bindings ?? []).map((binding) => ({
    id: binding.id,
    mode: binding.mode ?? 'default',
    selections: binding.selections ?? {},
    semanticActionId: semanticActionIds?.[binding.id],
  }))
}

function buildGuidedFlowPreset(scenarioId: PromptTemplateScenarioId): ConsumerGuidedFlowPreset | null {
  const scenarioConfig = getPromptTemplateScenarioConfigById(scenarioId)
  const guidedFlowConfig = scenarioConfig?.guidedFlow
  if (!scenarioConfig || !guidedFlowConfig) return null

  const structure = buildPromptTemplateStructure({
    id: `consumer-guided-${scenarioId}`,
    title: scenarioConfig.label,
    content: guidedFlowConfig.defaultPromptText,
    createdAt: 0,
    structure: {
      scenarioId,
      defaults: scenarioConfig.defaults,
      fields: scenarioConfig.fields,
      status: 'structured',
      familyId: scenarioConfig.familyId,
      scenarioLabel: scenarioConfig.label,
      sceneDescription: scenarioConfig.description,
      scene: getStudioFlowScene(mapPromptScenarioToFlowSceneId(scenarioId)),
      recommendedMode: scenarioConfig.recommendedMode,
      recommendedIntent: scenarioConfig.recommendedIntent,
      entryModes: ['consumer'],
      summary: [],
    },
  })
  const questions = structure.fields
    .map(toGuidedQuestion)
    .filter((item): item is ConsumerGuidedFlowQuestion => Boolean(item))

  if (!questions.length) return null

  const resultActionSemanticIds = Object.fromEntries(
    (guidedFlowConfig.resultActionBindings ?? []).map((binding) => [binding.id, binding.semanticActionId]),
  ) as Partial<Record<string, StudioFlowActionId | undefined>>
  const taskBindings = toEntryBindings(guidedFlowConfig.taskBindings)
  const sceneBindings = toEntryBindings(guidedFlowConfig.sceneBindings)
  const resultActionBindings = toEntryBindings(
    guidedFlowConfig.resultActionBindings,
    resultActionSemanticIds,
  )

  return {
    id: scenarioId,
    scenarioId,
    sceneId: mapPromptScenarioToFlowSceneId(scenarioId),
    title: structure.scenarioLabel,
    description: structure.sceneDescription,
    prompt: guidedFlowConfig.defaultPromptText,
    defaultPromptText: guidedFlowConfig.defaultPromptText,
    taskIds: taskBindings.map((binding) => binding.id),
    sceneIds: sceneBindings.map((binding) => binding.id),
    resultActionIds: resultActionBindings.map((binding) => binding.id),
    taskBindings,
    sceneBindings,
    resultActionBindings,
    questions,
  }
}

export const consumerTaskPresets: ConsumerTaskPreset[] = [
  {
    id: 'text-to-image',
    title: '从文字生成图片',
    description: '先说一句需求，马上起一版。',
    icon: 'text',
    sceneId: 'generic-create',
    prompt: '做一张有明确主题和风格的图片，先给我一版可以继续修改的结果。',
    ctaLabel: '直接写需求',
    afterSelectHint: '已带入起步描述。继续补一句主体、感觉或用途，就可以直接开始。',
  },
  {
    id: 'image-to-image',
    title: '按现有图片继续修改',
    description: '上传原图，再说想保留什么、想改哪里。',
    icon: 'image',
    sceneId: 'image-edit',
    prompt: '请在保留主要内容的前提下，继续把这张图改得更接近我想要的效果。',
    openUpload: true,
    ctaLabel: '上传原图',
    afterSelectHint: '已带入继续修改的起步描述。上传原图后，再补一句最想改哪里就够了。',
  },
  {
    id: 'product',
    title: '做商品图',
    description: '适合白底图、展示图和上架素材。',
    icon: 'product',
    sceneId: 'product-shot',
    prompt: '做一张适合商品展示的图片，主体干净清楚，画面利落，适合上架或详情页使用。',
    ctaLabel: '开始做商品图',
    afterSelectHint: '已按商品图带入起步内容。继续补一句卖点、背景或用途会更准。',
  },
  {
    id: 'poster',
    title: '做海报或宣传图',
    description: '适合活动宣传、品牌展示和社媒封面。',
    icon: 'poster',
    sceneId: 'poster-campaign',
    prompt: '做一张有高级感和传播感的宣传海报，主信息突出，画面完整，适合活动或品牌展示。',
    ctaLabel: '开始做海报',
    afterSelectHint: '已按海报方向带入起步内容。继续补一句主题、活动信息或氛围即可。',
  },
  {
    id: 'portrait',
    title: '做头像或人像图',
    description: '适合头像优化、人像美化和职业照方向。',
    icon: 'portrait',
    sceneId: 'portrait-avatar',
    prompt: '做一张适合头像或人像展示的图片，人物状态自然，干净耐看，适合社媒头像或职业形象。',
    ctaLabel: '开始做人像图',
    afterSelectHint: '已按人像方向带入起步内容。继续补一句风格、场景或想保留的状态即可。',
  },
  {
    id: 'continue-last',
    title: '继续上次创作',
    description: '回到你刚才做到一半的内容。',
    icon: 'history',
    action: 'continue',
    ctaLabel: '去最近结果',
  },
]

export const consumerScenePresets: ConsumerScenePreset[] = [
  {
    id: 'white-background',
    title: '商品白底图',
    description: '适合上架、展示和详情页首图',
    sceneId: 'product-shot',
    prompt: '生成一个干净的商品白底图，主体完整，边缘清楚，适合电商上架展示。',
    afterSelectHint: '已带入白底图方向。继续补一句商品类型或想强调的卖点会更贴近需求。',
  },
  {
    id: 'swap-background',
    title: '商品换背景',
    description: '保留主体，换成更适合的展示环境',
    sceneId: 'product-shot',
    prompt: '保留主体不变，把背景换成更适合展示商品的环境，整体看起来高级、自然、干净。',
    afterSelectHint: '已带入换背景方向。继续补一句想换成什么环境或氛围即可。',
  },
  {
    id: 'event-poster',
    title: '活动海报',
    description: '适合新品发布、活动宣传和品牌露出',
    sceneId: 'poster-campaign',
    prompt: '做一张活动海报，氛围明确，主视觉突出，适合线上宣传和品牌露出。',
    afterSelectHint: '已带入活动海报方向。继续补一句活动主题、主标题或想要的感觉即可。',
  },
  {
    id: 'social-cover',
    title: '社媒封面',
    description: '适合小红书、朋友圈和内容封面',
    sceneId: 'poster-campaign',
    prompt: '做一张适合社媒封面的图片，构图醒目，主题明确，适合内容平台展示。',
    afterSelectHint: '已带入封面方向。继续补一句内容主题或想突出的人物、商品即可。',
  },
  {
    id: 'portrait-retouch',
    title: '头像美化',
    description: '让头像更干净、更好看、更有风格',
    sceneId: 'portrait-avatar',
    prompt: '做一张更适合头像使用的人像图，人物自然耐看，整体干净，有质感。',
    afterSelectHint: '已带入头像美化方向。继续补一句想要更职业、自然还是更有氛围即可。',
  },
  {
    id: 'space-showcase',
    title: '空间展示图',
    description: '适合客厅、展台和门店效果展示',
    sceneId: 'space-scene',
    prompt: '做一个完整清楚的空间展示图，结构明确，氛围自然，适合继续细化设计方向。',
    afterSelectHint: '已带入空间展示方向。继续补一句空间用途、视角或想要的氛围即可。',
  },
  {
    id: 'remove-clutter',
    title: '去杂物或去文字',
    description: '去掉干扰内容，让画面更干净',
    sceneId: 'image-edit',
    prompt: '保留主体，去掉画面里的杂物和多余文字，让整体更干净。',
    afterSelectHint: '已带入清理画面的方向。继续补一句想重点保留哪部分即可。',
  },
]

export const consumerExamplePrompts = [
  '做一张高级感新品海报',
  '把这张图背景换成影棚',
  '生成一个干净的商品白底图',
]

export const consumerGuidedFlowPresets: ConsumerGuidedFlowPreset[] = consumerGuidedFlowScenarioIds
  .map(buildGuidedFlowPreset)
  .filter((item): item is ConsumerGuidedFlowPreset => Boolean(item))

export function findConsumerGuidedFlowByTaskId(taskId?: string) {
  if (!taskId) return undefined
  return consumerGuidedFlowPresets.find((item) => item.taskIds?.includes(taskId))
}

export function findConsumerGuidedFlowBySceneId(sceneId?: string) {
  if (!sceneId) return undefined
  return consumerGuidedFlowPresets.find(
    (item) => item.sceneId === sceneId || item.sceneIds?.includes(sceneId),
  )
}

export function findConsumerGuidedFlowByResultActionId(actionId?: string) {
  if (!actionId) return undefined
  return consumerGuidedFlowPresets.find((item) => item.resultActionIds?.includes(actionId))
}

export function findConsumerGuidedFlowById(guideId?: string) {
  if (!guideId) return undefined
  return consumerGuidedFlowPresets.find((item) => item.id === guideId)
}

function buildGuidedSelectionSeed(
  guide: ConsumerGuidedFlowPreset,
  mode: PromptTemplateGuidedSelectionMode,
) {
  if (mode === 'empty') return {}
  return guide.questions.reduce<ConsumerGuidedFlowSelectionMap>((accumulator, question) => {
    const optionId =
      mode === 'recommended'
        ? (question.recommendedOptionId ?? question.defaultOptionId)
        : question.defaultOptionId
    if (optionId) accumulator[question.id] = optionId
    return accumulator
  }, {})
}

function findGuidedFlowEntryBinding(
  guide: ConsumerGuidedFlowPreset,
  context: ConsumerGuidedFlowResolveContext,
) {
  if (context.resultActionId) {
    return guide.resultActionBindings?.find((binding) => binding.id === context.resultActionId) ?? null
  }
  if (context.sceneId) {
    return guide.sceneBindings?.find((binding) => binding.id === context.sceneId) ?? null
  }
  if (context.taskId) {
    return guide.taskBindings?.find((binding) => binding.id === context.taskId) ?? null
  }
  return null
}

export function resolveConsumerGuidedFlowSelections(
  guide: ConsumerGuidedFlowPreset,
  context: ConsumerGuidedFlowResolveContext = {},
) {
  const binding = findGuidedFlowEntryBinding(guide, context)
  const fallbackMode =
    context.fallbackMode ??
    (context.sceneId && context.sceneId === guide.sceneId ? 'default' : 'empty')
  const selectionMode = binding?.mode ?? fallbackMode

  return {
    ...buildGuidedSelectionSeed(guide, selectionMode),
    ...(context.currentSelections ?? {}),
    ...(binding?.selections ?? {}),
  }
}

export function buildGuidedPrompt(
  guide: ConsumerGuidedFlowPreset,
  selections: ConsumerGuidedFlowSelectionMap,
  promptAppendix?: string,
) {
  const details = guide.questions
    .map((question) => question.options.find((option) => option.id === selections[question.id])?.prompt)
    .filter(Boolean)
  const appendix = promptAppendix?.trim()
  return [guide.prompt, ...details, appendix].filter(Boolean).join('\n')
}

export function buildGuidedSelectionSummary(
  guide: ConsumerGuidedFlowPreset,
  selections: ConsumerGuidedFlowSelectionMap,
) {
  const labels = guide.questions
    .map((question) => {
      const optionLabel = question.options.find((option) => option.id === selections[question.id])?.label
      if (!optionLabel) return null
      if (!question.fieldId) return `${question.title}：${optionLabel}`
      return `${getStudioFlowFieldLabel(guide.sceneId, question.fieldId)}：${optionLabel}`
    })
    .filter(Boolean)

  return labels.length ? labels.join(' / ') : '还没选细节'
}

export function buildConsumerGuidedFlowSnapshot(
  guide: ConsumerGuidedFlowPreset,
  selections: ConsumerGuidedFlowSelectionMap,
  options: number | ConsumerGuidedFlowBuildOptions = Date.now(),
): ConsumerGuidedFlowSnapshot {
  const resolvedOptions =
    typeof options === 'number'
      ? { updatedAt: options }
      : { updatedAt: options.updatedAt ?? Date.now(), ...options }
  const steps = guide.questions.reduce<ConsumerGuidedFlowStepSnapshot[]>((accumulator, question, index) => {
    const optionId = selections[question.id]
    const option = question.options.find((item) => item.id === optionId)
    if (!option) return accumulator
    accumulator.push({
      questionId: question.id,
      fieldId: question.fieldId,
      questionTitle: question.title,
      optionId: option.id,
      optionLabel: option.label,
      promptText: option.prompt,
      order: index,
      selectionSource: resolvedOptions.selectionSource,
    })
    return accumulator
  }, [])

  return {
    version: 1,
    guideId: guide.id,
    sceneId: guide.sceneId,
    scene: getStudioFlowScene(guide.sceneId),
    guideTitle: guide.title,
    guideDescription: guide.description,
    basePrompt: guide.prompt,
    promptText: buildGuidedPrompt(guide, selections, resolvedOptions.promptAppendix),
    summary: buildGuidedSelectionSummary(guide, selections),
    questionOrder: guide.questions.map((question) => question.id),
    totalQuestionCount: guide.questions.length,
    completedQuestionCount: steps.length,
    steps,
    sourceType: resolvedOptions.sourceType,
    actionId: resolvedOptions.actionId,
    defaultActionId:
      guide.resultActionBindings?.find((binding) => binding.id === guide.resultActionIds?.[0])
        ?.semanticActionId,
    actionPriority: guide.resultActionBindings
      ?.map((binding) => binding.semanticActionId)
      .filter((item): item is StudioFlowActionId => Boolean(item)),
    followUpMode:
      resolvedOptions.sourceType === 'result-action' ||
      resolvedOptions.sourceType === 'scene-preset' ||
      resolvedOptions.sourceType === 'task-preset'
        ? 'scene-guided'
        : 'template-guided',
    followUpLabel: guide.title,
    promptAppendix: resolvedOptions.promptAppendix?.trim() || undefined,
    updatedAt: resolvedOptions.updatedAt,
  }
}

export function buildConsumerGuidedFlowSnapshotFromContext(
  guide: ConsumerGuidedFlowPreset,
  context: ConsumerGuidedFlowResolveContext,
  options: number | ConsumerGuidedFlowBuildOptions = Date.now(),
) {
  return buildConsumerGuidedFlowSnapshot(
    guide,
    resolveConsumerGuidedFlowSelections(guide, context),
    options,
  )
}

export function getConsumerSceneSemanticLabel(sceneId?: StudioFlowSceneId) {
  return getStudioFlowSceneLabel(sceneId)
}

export function getConsumerGuidedFlowNextQuestionIndex(
  guide: ConsumerGuidedFlowPreset,
  selections: ConsumerGuidedFlowSelectionMap,
) {
  const nextIndex = guide.questions.findIndex((question) => !selections[question.id])
  if (nextIndex >= 0) return nextIndex
  return Math.max(0, guide.questions.length - 1)
}
