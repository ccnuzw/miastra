import type {
  ConsumerGuidedFlowSnapshot,
  ConsumerGuidedFlowStepSnapshot,
} from '@/features/studio-consumer/consumerGuidedFlow'
import { buildPromptTemplatePresentation } from './promptTemplate.presentation'
import {
  getPromptTemplateStructure,
  resolvePromptTemplateGuidedFieldDefaultOptionId,
} from './promptTemplate.schema'
import type {
  PromptTemplateFieldDefinition,
  PromptTemplateListItem,
} from './promptTemplate.types'

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
    ) ??
    field.guided.options[0]
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

export function buildPromptTemplateGuidedFlowSnapshot(
  template: PromptTemplateListItem,
  updatedAt = Date.now(),
): ConsumerGuidedFlowSnapshot | null {
  const structure = getPromptTemplateStructure(template)
  const presentation = buildPromptTemplatePresentation(template)
  const guidedFields = structure.fields.filter(isGuidedField)
  if (!guidedFields.length) return null

  const steps = guidedFields
    .map((field, index) => buildTemplateDefaultStep(field, index))
    .filter((step): step is ConsumerGuidedFlowStepSnapshot => Boolean(step))
  const promptText = [template.content.trim(), ...steps.map((step) => step.promptText)]
    .filter(Boolean)
    .join('\n')
  const fieldLabels = guidedFields.map((field) => field.label)

  return {
    version: 1,
    guideId: `template:${template.id}`,
    sceneId: structure.scene.id,
    scene: structure.scene,
    guideTitle: `${presentation.title} · 模板追问`,
    guideDescription: `进入工作台后会先按模板字段补齐 ${fieldLabels.join(' / ')}，再接结果动作继续往下走。`,
    basePrompt: template.content.trim(),
    promptText,
    summary: buildTemplateFollowUpSummary(steps),
    questionOrder: guidedFields.map((field) => field.id),
    totalQuestionCount: guidedFields.length,
    completedQuestionCount: steps.length,
    steps,
    sourceType: 'template',
    templateId: template.id,
    templateTitle: presentation.title,
    entryMode: 'consumer',
    entryIntent: 'task',
    followUpMode: 'template-guided',
    followUpLabel: `模板追问 ${steps.length}/${guidedFields.length} 步`,
    actionPriority: presentation.resultBridge.actions.map((action) => action.id),
    defaultActionId: presentation.resultBridge.actions[0]?.id,
    updatedAt,
  }
}
