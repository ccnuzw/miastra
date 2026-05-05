import type {
  StudioFlowFieldId,
  StudioFlowScene,
  StudioFlowSceneId,
} from '@/features/prompt-templates/studioFlowSemantic'

export type ConsumerGuidedFlowStepSnapshot = {
  questionId: string
  fieldId?: StudioFlowFieldId
  questionTitle: string
  optionId: string
  optionLabel: string
  promptText: string
  order: number
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
