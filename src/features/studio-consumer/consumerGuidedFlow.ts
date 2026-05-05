import type {
  PromptTemplateWorkbenchEntryIntent,
  PromptTemplateWorkbenchEntryMode,
} from '@/features/prompt-templates/promptTemplate.types'
import type {
  StudioFlowActionId,
  StudioFlowFieldId,
  StudioFlowScene,
  StudioFlowSceneId,
  StudioFlowSourceType,
} from '@/features/prompt-templates/studioFlowSemantic'
import {
  getStudioFlowActionLabel,
  getStudioFlowScene,
  getStudioFlowSourceLabel,
} from '@/features/prompt-templates/studioFlowSemantic'

export type ConsumerGuidedFlowSelectionSource =
  | 'manual'
  | 'template-default'
  | 'preset-default'
  | 'result-followup'

export type ConsumerGuidedFlowStepSnapshot = {
  questionId: string
  fieldId?: StudioFlowFieldId
  questionTitle: string
  optionId: string
  optionLabel: string
  promptText: string
  order: number
  selectionSource?: ConsumerGuidedFlowSelectionSource
}

export type ConsumerGuidedFlowLoopStage =
  | 'template-entry'
  | 'guided-followup'
  | 'result-action'
  | 'version-replay'

export type ConsumerGuidedFlowLoopState = {
  skillId: string
  skillLabel: string
  originSourceType: StudioFlowSourceType | 'manual'
  currentSourceType: StudioFlowSourceType | 'manual'
  stage: ConsumerGuidedFlowLoopStage
  stageLabel: string
  runLabel: string
  loopHint: string
  nextActionId?: StudioFlowActionId
  nextActionLabel?: string
  branchActionId?: StudioFlowActionId
  branchActionLabel?: string
  lastActionId?: StudioFlowActionId
  lastActionLabel?: string
  versionLabel?: string
}

export type ConsumerGuidedFlowRuntimeEntryDecision = {
  mode: PromptTemplateWorkbenchEntryMode
  intent: PromptTemplateWorkbenchEntryIntent
  available: boolean
  recommended: boolean
  locked: boolean
  reason: string
  summary: string
  bestFor?: string
  nextStep?: string
}

export type ConsumerGuidedFlowRuntimeDecision = {
  entries: Record<PromptTemplateWorkbenchEntryMode, ConsumerGuidedFlowRuntimeEntryDecision>
  availableEntryModes: PromptTemplateWorkbenchEntryMode[]
  recommendedEntry: ConsumerGuidedFlowRuntimeEntryDecision
  activeEntry: ConsumerGuidedFlowRuntimeEntryDecision
  followUp: {
    mode: 'template-guided' | 'scene-guided' | 'freeform'
    summary: string
    guidedQuestionCount: number
    guidedFieldLabels: string[]
    defaultSelectionSummary?: string
  }
  result: {
    defaultActionId?: StudioFlowActionId
    actionPriority: StudioFlowActionId[]
    summary: string
  }
  contract: {
    sourceType: StudioFlowSourceType | 'manual'
    summary: string
  }
  version: {
    summary: string
  }
}

export type ConsumerGuidedFlowActionPlan = {
  defaultActionId?: StudioFlowActionId
  actionPriority: StudioFlowActionId[]
}

export type ConsumerGuidedFlowSnapshot = {
  version: 1
  guideId: string
  sceneId: StudioFlowSceneId
  scene: StudioFlowScene
  guideTitle: string
  guideDescription: string
  basePrompt: string
  promptText: string
  summary: string
  questionOrder: string[]
  totalQuestionCount: number
  completedQuestionCount: number
  steps: ConsumerGuidedFlowStepSnapshot[]
  sourceType?: StudioFlowSourceType | 'manual'
  templateId?: string
  templateTitle?: string
  entryMode?: PromptTemplateWorkbenchEntryMode
  entryIntent?: PromptTemplateWorkbenchEntryIntent
  followUpMode?: 'template-guided' | 'scene-guided' | 'freeform'
  followUpLabel?: string
  actionId?: StudioFlowActionId
  actionPriority?: StudioFlowActionId[]
  defaultActionId?: StudioFlowActionId
  runtimeDecision?: ConsumerGuidedFlowRuntimeDecision
  promptAppendix?: string
  loopState?: ConsumerGuidedFlowLoopState
  updatedAt: number
}

export type ConsumerGuidedFlowSelectionMap = Record<string, string>

type BuildConsumerGuidedFlowLoopStateInput = {
  guideId: string
  guideTitle: string
  templateId?: string
  templateTitle?: string
  sourceType?: StudioFlowSourceType | 'manual'
  stage: ConsumerGuidedFlowLoopStage
  actionId?: StudioFlowActionId
  defaultActionId?: StudioFlowActionId
  actionPriority?: StudioFlowActionId[]
  versionLabel?: string
}

type RebaseConsumerGuidedFlowSnapshotOptions = {
  sourceType?: StudioFlowSourceType | 'manual'
  stage: ConsumerGuidedFlowLoopStage
  actionId?: StudioFlowActionId
  sceneId?: StudioFlowSceneId
  followUpMode?: ConsumerGuidedFlowSnapshot['followUpMode']
  promptAppendix?: string
  promptText?: string
  defaultActionId?: StudioFlowActionId
  actionPriority?: StudioFlowActionId[]
  updatedAt?: number
}

export function buildConsumerGuidedFlowLoopState(
  input: BuildConsumerGuidedFlowLoopStateInput,
): ConsumerGuidedFlowLoopState {
  const skillId = input.templateId?.trim() ? `template:${input.templateId.trim()}` : input.guideId
  const skillLabel = input.templateTitle?.trim() || input.guideTitle.trim() || '当前 Skill'
  const currentSourceType = input.sourceType ?? 'manual'
  const actionPlan = normalizeConsumerGuidedFlowActionPlan({
    defaultActionId: input.defaultActionId,
    actionPriority: input.actionPriority,
  })
  const nextActionId = actionPlan.defaultActionId
  const branchActionId = actionPlan.actionPriority.find((actionId) => actionId !== nextActionId)
  const nextActionLabel = nextActionId ? getStudioFlowActionLabel(nextActionId) : undefined
  const branchActionLabel = branchActionId ? getStudioFlowActionLabel(branchActionId) : undefined
  const lastActionLabel = input.actionId ? getStudioFlowActionLabel(input.actionId) : undefined

  if (input.stage === 'template-entry') {
    return {
      skillId,
      skillLabel,
      originSourceType: currentSourceType,
      currentSourceType,
      stage: input.stage,
      stageLabel: '模板起手',
      runLabel: `模板「${skillLabel}」已进入运行态`,
      loopHint: nextActionLabel
        ? `先按模板追问补齐首轮输入，再出首版结果，默认接「${nextActionLabel}」。`
        : '先按模板追问补齐首轮输入，再出首版结果。',
      nextActionId,
      nextActionLabel,
      branchActionId,
      branchActionLabel,
      versionLabel: input.versionLabel,
    }
  }

  if (input.stage === 'guided-followup') {
    return {
      skillId,
      skillLabel,
      originSourceType: currentSourceType,
      currentSourceType,
      stage: input.stage,
      stageLabel: '追问补全',
      runLabel: `当前仍在 Skill「${skillLabel}」的追问补全过程`,
      loopHint: nextActionLabel
        ? `追问结果会直接带入本轮执行，首个结果动作优先接「${nextActionLabel}」。`
        : '追问结果会直接带入本轮执行。',
      nextActionId,
      nextActionLabel,
      branchActionId,
      branchActionLabel,
      versionLabel: input.versionLabel,
    }
  }

  if (input.stage === 'version-replay') {
    return {
      skillId,
      skillLabel,
      originSourceType: currentSourceType,
      currentSourceType,
      stage: input.stage,
      stageLabel: '版本回流',
      runLabel: `当前版本已回到 Skill「${skillLabel}」的运行链`,
      loopHint: nextActionLabel
        ? `这次回流会沿原 Skill 语义继续，建议先恢复当前链路，再接「${nextActionLabel}」。`
        : '这次回流会沿原 Skill 语义继续。',
      nextActionId,
      nextActionLabel,
      branchActionId,
      branchActionLabel,
      lastActionId: input.actionId,
      lastActionLabel,
      versionLabel: input.versionLabel,
    }
  }

  return {
    skillId,
    skillLabel,
    originSourceType: currentSourceType,
    currentSourceType,
    stage: input.stage,
    stageLabel: '结果分支',
    runLabel: `当前结果动作已回写到 Skill「${skillLabel}」`,
    loopHint: input.actionId
      ? `这次会沿「${getStudioFlowActionLabel(input.actionId)}」分支继续，并保留 ${
          currentSourceType === 'manual'
            ? '当前工作台'
            : getStudioFlowSourceLabel(currentSourceType)
        } 的上下文。`
      : '这次会沿当前结果分支继续。',
    nextActionId,
    nextActionLabel,
    branchActionId,
    branchActionLabel,
    lastActionId: input.actionId,
    lastActionLabel,
    versionLabel: input.versionLabel,
  }
}

export function getConsumerGuidedFlowSelectionMap(
  snapshot?: ConsumerGuidedFlowSnapshot | null,
): ConsumerGuidedFlowSelectionMap {
  if (!snapshot) return {}
  return snapshot.steps.reduce<ConsumerGuidedFlowSelectionMap>((accumulator, step) => {
    accumulator[step.questionId] = step.optionId
    return accumulator
  }, {})
}

export function normalizeConsumerGuidedFlowActionPlan(input: {
  defaultActionId?: StudioFlowActionId
  actionPriority?: StudioFlowActionId[]
}): ConsumerGuidedFlowActionPlan {
  const normalizedPriority = Array.from(new Set(input.actionPriority ?? []))
  const defaultActionId = input.defaultActionId ?? normalizedPriority[0]
  if (!defaultActionId) {
    return {
      defaultActionId: undefined,
      actionPriority: normalizedPriority,
    }
  }

  return {
    defaultActionId,
    actionPriority: [
      defaultActionId,
      ...normalizedPriority.filter((actionId) => actionId !== defaultActionId),
    ],
  }
}

export function rebaseConsumerGuidedFlowSnapshot(
  snapshot: ConsumerGuidedFlowSnapshot,
  options: RebaseConsumerGuidedFlowSnapshotOptions,
): ConsumerGuidedFlowSnapshot {
  const sourceType = options.sourceType ?? snapshot.sourceType
  const sceneId = options.sceneId ?? snapshot.sceneId
  const actionPlan = normalizeConsumerGuidedFlowActionPlan({
    defaultActionId:
      options.defaultActionId ??
      snapshot.defaultActionId ??
      snapshot.runtimeDecision?.result.defaultActionId,
    actionPriority:
      options.actionPriority ??
      snapshot.actionPriority ??
      snapshot.runtimeDecision?.result.actionPriority ??
      [],
  })
  const defaultActionId = actionPlan.defaultActionId
  const actionPriority = actionPlan.actionPriority

  return {
    ...snapshot,
    sceneId,
    scene: sceneId === snapshot.sceneId ? snapshot.scene : getStudioFlowScene(sceneId),
    sourceType,
    actionId: options.actionId ?? snapshot.actionId,
    followUpMode: options.followUpMode ?? snapshot.followUpMode,
    promptAppendix: options.promptAppendix?.trim() || snapshot.promptAppendix,
    promptText: options.promptText?.trim() || snapshot.promptText,
    defaultActionId,
    actionPriority,
    runtimeDecision: snapshot.runtimeDecision
      ? {
          ...snapshot.runtimeDecision,
          result: {
            ...snapshot.runtimeDecision.result,
            defaultActionId,
            actionPriority,
          },
          contract: {
            ...snapshot.runtimeDecision.contract,
            sourceType: sourceType ?? snapshot.runtimeDecision.contract.sourceType,
          },
        }
      : snapshot.runtimeDecision,
    loopState: buildConsumerGuidedFlowLoopState({
      guideId: snapshot.guideId,
      guideTitle: snapshot.guideTitle,
      templateId: snapshot.templateId,
      templateTitle: snapshot.templateTitle,
      sourceType,
      stage: options.stage,
      actionId: options.actionId ?? snapshot.actionId,
      defaultActionId,
      actionPriority,
      versionLabel: snapshot.loopState?.versionLabel,
    }),
    updatedAt: options.updatedAt ?? Date.now(),
  }
}
