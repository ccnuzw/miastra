import type {
  ConsumerGuidedFlowRuntimeDecision,
  ConsumerGuidedFlowRuntimeEntryDecision,
  ConsumerGuidedFlowSnapshot,
  ConsumerGuidedFlowStepSnapshot,
} from '@/features/studio-consumer/consumerGuidedFlow'
import { buildConsumerGuidedFlowLoopState } from '@/features/studio-consumer/consumerGuidedFlow'
import { buildPromptTemplatePresentation } from './promptTemplate.presentation'
import {
  getPromptTemplateStructure,
  resolvePromptTemplateGuidedFieldDefaultOptionId,
} from './promptTemplate.schema'
import type {
  PromptTemplateFieldDefinition,
  PromptTemplateListItem,
  PromptTemplateWorkbenchEntryIntent,
  PromptTemplateWorkbenchEntryMode,
} from './promptTemplate.types'
import {
  getStudioFlowScene,
  type StudioFlowActionId,
  type StudioFlowScene,
  type StudioFlowSceneId,
  type StudioFlowSourceType,
} from './studioFlowSemantic'

export type PromptTemplateRuntimeContext = {
  mode: PromptTemplateWorkbenchEntryMode
  intent: PromptTemplateWorkbenchEntryIntent
  sceneId: StudioFlowSceneId
  scene: StudioFlowScene
  sourceType: StudioFlowSourceType
  nextActionId?: StudioFlowActionId
}

export type PromptTemplateRuntimeOptions = {
  sceneId?: StudioFlowSceneId
  sourceType?: StudioFlowSourceType
  nextActionId?: StudioFlowActionId
}

export type PromptTemplateRuntimeConsumption = {
  context: PromptTemplateRuntimeContext
  guidedFlow: ConsumerGuidedFlowSnapshot | null
  promptText: string
}

function isGuidedField(field: PromptTemplateFieldDefinition) {
  return Boolean(field.guided?.options?.length)
}

function buildTemplateDefaultStep(
  field: PromptTemplateFieldDefinition,
  order: number,
): ConsumerGuidedFlowStepSnapshot | null {
  if (!field.guided?.options?.length) return null
  const defaultOption =
    field.guided.options.find(
      (option) => option.id === resolvePromptTemplateGuidedFieldDefaultOptionId(field),
    ) ?? field.guided.options[0]
  if (!defaultOption) return null

  return {
    questionId: field.id,
    fieldId: field.guided.semanticFieldId,
    questionTitle: field.guided.questionTitle?.trim() || field.label,
    optionId: defaultOption.id,
    optionLabel: defaultOption.label,
    promptText: defaultOption.prompt,
    order,
    selectionSource: 'template-default',
  }
}

function buildTemplateFollowUpSummary(steps: ConsumerGuidedFlowStepSnapshot[]) {
  if (!steps.length) return '当前模板没有默认追问分支，会先按原始模板内容起稿。'
  return `已按模板默认追问路径带入：${steps
    .map((step) => `${step.questionTitle}：${step.optionLabel}`)
    .join(' / ')}`
}

function buildRuntimeEntryDecisions(
  template: PromptTemplateListItem,
  selectedMode: PromptTemplateWorkbenchEntryMode,
): ConsumerGuidedFlowRuntimeDecision['entries'] {
  const structure = getPromptTemplateStructure(template)
  const presentation = buildPromptTemplatePresentation(template)
  const availableModes: PromptTemplateWorkbenchEntryMode[] = structure.entryModes.length
    ? structure.entryModes
    : ['consumer', 'pro']
  const recommendedMode = presentation.recommendedEntry.mode

  const createDecision = (
    mode: PromptTemplateWorkbenchEntryMode,
  ): ConsumerGuidedFlowRuntimeEntryDecision => {
    const entry = presentation.entries.find((item) => item.mode === mode)
    const available = availableModes.includes(mode)
    const recommended = recommendedMode === mode
    const locked = selectedMode === mode && !available
    const fallbackReason = available
      ? recommended
        ? '当前模板推荐从这个入口进入。'
        : '当前模板允许从这个入口进入。'
      : '当前模板没有把这个入口作为主要起手路径。'

    return {
      mode,
      intent: entry?.intent ?? (mode === 'consumer' ? 'task' : 'panel'),
      available,
      recommended,
      locked,
      reason:
        presentation.recommendedEntry.mode === mode
          ? presentation.recommendedEntry.reason
          : fallbackReason,
      summary:
        mode === 'consumer'
          ? presentation.runtime.consumerEntrySummary
          : presentation.runtime.proEntrySummary,
      bestFor: entry?.bestFor,
      nextStep: entry?.nextStep,
    }
  }

  return {
    consumer: createDecision('consumer'),
    pro: createDecision('pro'),
  }
}

export function resolvePromptTemplateRuntimeMode(
  template: PromptTemplateListItem,
  preferredMode: PromptTemplateWorkbenchEntryMode,
): PromptTemplateWorkbenchEntryMode {
  const structure = getPromptTemplateStructure(template)
  const presentation = buildPromptTemplatePresentation(template)
  const availableModes: PromptTemplateWorkbenchEntryMode[] = structure.entryModes.length
    ? structure.entryModes
    : ['consumer', 'pro']
  if (availableModes.includes(preferredMode)) return preferredMode
  if (availableModes.includes(presentation.recommendedEntry.mode))
    return presentation.recommendedEntry.mode
  return availableModes[0] ?? preferredMode
}

export function buildPromptTemplateRuntimeContext(
  template: PromptTemplateListItem,
  preferredMode: PromptTemplateWorkbenchEntryMode,
  options?: PromptTemplateRuntimeOptions,
): PromptTemplateRuntimeContext {
  const resolvedMode = resolvePromptTemplateRuntimeMode(template, preferredMode)
  const structure = getPromptTemplateStructure(template)
  const runtimeDecision = buildPromptTemplateRuntimeDecision(template, [], resolvedMode, {
    nextActionId: options?.nextActionId,
  })
  const activeEntry = runtimeDecision.activeEntry
  const sceneId = options?.sceneId ?? structure.scene.id

  return {
    mode: resolvedMode,
    intent: activeEntry.intent,
    sceneId,
    scene: getStudioFlowScene(sceneId),
    sourceType: options?.sourceType ?? 'template',
    nextActionId: options?.nextActionId ?? runtimeDecision.result.defaultActionId,
  }
}

export function buildPromptTemplateRuntimeDecision(
  template: PromptTemplateListItem,
  steps: ConsumerGuidedFlowStepSnapshot[],
  mode: PromptTemplateWorkbenchEntryMode,
  options?: {
    nextActionId?: StudioFlowActionId
  },
): ConsumerGuidedFlowRuntimeDecision {
  const presentation = buildPromptTemplatePresentation(template)
  const structure = getPromptTemplateStructure(template)
  const entries = buildRuntimeEntryDecisions(template, mode)
  const availableEntryModes = (Object.values(entries) as ConsumerGuidedFlowRuntimeEntryDecision[])
    .filter((entry) => entry.available)
    .map((entry) => entry.mode)
  const recommendedEntry = entries[presentation.recommendedEntry.mode]
  const activeEntry = entries[mode]
  const defaultSelectionSummary = steps.length
    ? steps.map((step) => `${step.questionTitle}：${step.optionLabel}`).join(' / ')
    : undefined
  const actionPriority = presentation.resultBridge.actions.map((action) => action.id)
  const defaultActionId = options?.nextActionId ?? presentation.runtime.defaultAction?.id

  return {
    entries,
    availableEntryModes,
    recommendedEntry,
    activeEntry,
    followUp: {
      mode: 'template-guided',
      summary: buildTemplateFollowUpSummary(steps),
      guidedQuestionCount: steps.length,
      guidedFieldLabels: structure.fields.filter(isGuidedField).map((field) => field.label),
      defaultSelectionSummary,
    },
    result: {
      defaultActionId,
      actionPriority,
      summary: presentation.runtime.resultActionPrioritySummary,
    },
    contract: {
      sourceType: 'template',
      summary: `运行时 contract 会优先承接模板入口、模板追问和结果动作优先级，来源上下文记为模板「${presentation.title}」。`,
    },
    version: {
      summary: presentation.chainContext.versionSummary,
    },
  }
}

export function buildPromptTemplateRuntimeConsumption(
  template: PromptTemplateListItem,
  preferredMode: PromptTemplateWorkbenchEntryMode,
  options?: PromptTemplateRuntimeOptions,
): PromptTemplateRuntimeConsumption {
  const context = buildPromptTemplateRuntimeContext(template, preferredMode, options)
  const guidedFlow =
    context.mode === 'consumer'
      ? buildPromptTemplateGuidedFlowSnapshot(template, context.mode, options)
      : null

  return {
    context,
    guidedFlow,
    promptText: guidedFlow?.promptText?.trim() || template.content,
  }
}

export function buildPromptTemplateGuidedFlowSnapshot(
  template: PromptTemplateListItem,
  preferredMode: PromptTemplateWorkbenchEntryMode = 'consumer',
  options: number | (PromptTemplateRuntimeOptions & { updatedAt?: number }) = Date.now(),
): ConsumerGuidedFlowSnapshot | null {
  const resolvedOptions =
    typeof options === 'number'
      ? { updatedAt: options }
      : { updatedAt: options.updatedAt ?? Date.now(), ...options }
  const structure = getPromptTemplateStructure(template)
  const presentation = buildPromptTemplatePresentation(template)
  const guidedFields = structure.fields.filter(isGuidedField)
  if (!guidedFields.length) return null
  const resolvedMode = resolvePromptTemplateRuntimeMode(template, preferredMode)

  const steps = guidedFields
    .map((field, index) => buildTemplateDefaultStep(field, index))
    .filter((step): step is ConsumerGuidedFlowStepSnapshot => Boolean(step))
  const promptText = [template.content.trim(), ...steps.map((step) => step.promptText)]
    .filter(Boolean)
    .join('\n')
  const fieldLabels = guidedFields.map((field) => field.label)
  const runtimeDecision = buildPromptTemplateRuntimeDecision(template, steps, resolvedMode, {
    nextActionId: resolvedOptions.nextActionId,
  })
  const activeEntry = runtimeDecision.activeEntry
  const sceneId = resolvedOptions.sceneId ?? structure.scene.id
  const sourceType = resolvedOptions.sourceType ?? 'template'

  return {
    version: 1,
    guideId: `template:${template.id}`,
    sceneId,
    scene: getStudioFlowScene(sceneId),
    guideTitle: `${presentation.title} · 模板追问`,
    guideDescription: `进入工作台后会先按模板字段补齐 ${fieldLabels.join(' / ')}，再接结果动作继续往下走。`,
    basePrompt: template.content.trim(),
    promptText,
    summary: buildTemplateFollowUpSummary(steps),
    questionOrder: guidedFields.map((field) => field.id),
    totalQuestionCount: guidedFields.length,
    completedQuestionCount: steps.length,
    steps,
    sourceType,
    templateId: template.id,
    templateTitle: presentation.title,
    entryMode: activeEntry.mode,
    entryIntent: activeEntry.intent,
    followUpMode: 'template-guided',
    followUpLabel: `模板追问 ${steps.length}/${guidedFields.length} 步`,
    actionPriority: runtimeDecision.result.actionPriority,
    defaultActionId: runtimeDecision.result.defaultActionId,
    runtimeDecision,
    loopState: buildConsumerGuidedFlowLoopState({
      guideId: `template:${template.id}`,
      guideTitle: `${presentation.title} · 模板追问`,
      templateId: template.id,
      templateTitle: presentation.title,
      sourceType,
      stage: 'template-entry',
      defaultActionId: runtimeDecision.result.defaultActionId,
      actionPriority: runtimeDecision.result.actionPriority,
      versionLabel: presentation.chainContext.versionSummary,
    }),
    updatedAt: resolvedOptions.updatedAt,
  }
}
