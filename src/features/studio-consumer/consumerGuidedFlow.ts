export type ConsumerGuidedFlowStepSnapshot = {
  questionId: string
  questionTitle: string
  optionId: string
  optionLabel: string
  promptText: string
  order: number
}

export type ConsumerGuidedFlowSnapshot = {
  version: 1
  guideId: string
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
