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
  promptAppendix?: string
  updatedAt: number
}

export type ConsumerGuidedFlowSelectionMap = Record<string, string>

export function getConsumerGuidedFlowSelectionMap(
  snapshot?: ConsumerGuidedFlowSnapshot | null,
): ConsumerGuidedFlowSelectionMap {
  if (!snapshot) return {}
  return snapshot.steps.reduce<ConsumerGuidedFlowSelectionMap>((accumulator, step) => {
    accumulator[step.questionId] = step.optionId
    return accumulator
  }, {})
}
