import type { StyleToken } from '@/features/studio/studio.types'
import { styleTokens } from '@/features/studio/studio.constants'
import { buildPromptTemplatePresentation } from '@/features/prompt-templates/promptTemplate.presentation'
import {
  buildPromptTemplateStructure,
  getPromptTemplateStructureFieldDigest,
  getPromptTemplateStructureStatusLabel,
} from '@/features/prompt-templates/promptTemplate.schema'
import { mapPromptScenarioToFlowSceneId } from '@/features/prompt-templates/studioFlowSemantic'
import type { PromptTemplateListItem } from '@/features/prompt-templates/promptTemplate.types'

export type StudioProPromptSection = {
  id: 'workspace' | 'styles' | 'detail' | 'negative'
  label: string
  hint: string
  value: string
  emptyText?: string
}

type BuildStudioProPromptPreviewInput = {
  prompt: string
  negativePrompt: string
  detailStrength: number
  detailTone: string
  selectedStyleTokens: StyleToken[]
}

export type StudioProTemplateContext = {
  id: string
  title: string
  category: string
  familyLabel: string
  familyDescription: string
  sceneLabel: string
  sceneId: string
  sceneDescription: string
  structureStatusLabel: string
  recommendedLabel: string
  recommendedReason: string
  structureFields: string[]
  structureSummary: Array<{
    id: string
    label: string
    value: string
  }>
  defaultSettingsLabel: string
  metadataHint: string
  useCases: string[]
  sourceLabel: string
}

export type StudioProReplayContext = {
  sourceLabel: string
  actionLabel: string
  statusText: string
  hint: string
  originLabel: string
  detailLabel: string
  snapshotId: string
  sourceProviderId: string
  sourceModelLabel: string
  sourceRequestKindLabel: string
  requestPrompt: string
  referenceSummaryLabel: string
}

export type StudioProControlStep = {
  id: string
  label: string
  value: string
  detail: string
}

export function resolveSelectedStudioStyleTokens(selectedIds: string[]) {
  return styleTokens.filter((token) => selectedIds.includes(token.id))
}

export function buildStudioProTemplateContext(
  template: PromptTemplateListItem,
  sourceLabel: string,
): StudioProTemplateContext {
  const presentation = buildPromptTemplatePresentation(template)
  const structure = template.structure ?? buildPromptTemplateStructure(template)
  const defaultSettingsLabel = [
    structure.defaults.aspectLabel ? `${structure.defaults.aspectLabel} 画幅` : '',
    structure.defaults.resolutionTier ? structure.defaults.resolutionTier.toUpperCase() : '',
    structure.defaults.quality ? `质量 ${structure.defaults.quality}` : '',
  ].filter(Boolean).join(' / ') || '未设置默认参数'

  return {
    id: template.id,
    title: presentation.title,
    category: presentation.category,
    familyLabel: presentation.family.label,
    familyDescription: presentation.family.description,
    sceneId: mapPromptScenarioToFlowSceneId(structure.scenarioId),
    sceneLabel: presentation.structureMeta.sceneLabel,
    sceneDescription: presentation.structureMeta.sceneDescription,
    structureStatusLabel: getPromptTemplateStructureStatusLabel(structure.status),
    recommendedLabel: presentation.recommendedEntry.label,
    recommendedReason: presentation.recommendedEntry.reason,
    structureFields: getPromptTemplateStructureFieldDigest(structure.fields, 4),
    structureSummary: structure.summary,
    defaultSettingsLabel,
    metadataHint: presentation.structureMeta.metadataHint,
    useCases: presentation.useCases,
    sourceLabel,
  }
}

export function getStudioProRequestKindLabel(mode?: string) {
  return mode?.includes('image2image') ? '图生图' : '文生图'
}

export function truncateStudioProText(value: string, maxLength = 96) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized
}

export function buildStudioProPromptArtifacts({
  prompt,
  negativePrompt,
  detailStrength,
  detailTone,
  selectedStyleTokens,
}: BuildStudioProPromptPreviewInput) {
  const workspacePrompt = prompt.trim()
  const selectedStylePrompt = selectedStyleTokens.length
    ? selectedStyleTokens.map((token) => `${token.label}: ${token.prompt}`).join('\n')
    : ''
  const detailPrompt = `细节强度：${detailStrength}/100，${detailTone}细节，保持真实皮肤纹理和自然锐度。`
  const cleanedNegativePrompt = negativePrompt.trim()
  const sections: StudioProPromptSection[] = [
    {
      id: 'workspace',
      label: '工作区 Prompt',
      hint: '这一段来自你正在编辑的主描述，是后续所有附加控制的起点。',
      value: workspacePrompt,
      emptyText: '先输入主体需求，这里会记录你的原始创作意图。',
    },
    {
      id: 'styles',
      label: '风格补充',
      hint: '已选风格 token 会在请求前追加到最终 Prompt，便于稳定复用。',
      value: selectedStylePrompt,
      emptyText: '当前没有附加风格 token，会按原始描述直接执行。',
    },
    {
      id: 'detail',
      label: '细节控制',
      hint: '细节强度滑杆会转换成自然语言控制语句，进入最终请求。',
      value: detailPrompt,
    },
    {
      id: 'negative',
      label: 'Negative Prompt',
      hint: '不想出现的元素会单独记录，方便复制或按结果继续微调。',
      value: cleanedNegativePrompt,
      emptyText: '当前未设置 Negative Prompt。',
    },
  ]

  const finalPrompt = [
    workspacePrompt,
    selectedStylePrompt ? `常用风格参数：\n${selectedStylePrompt}` : '',
    detailPrompt,
    cleanedNegativePrompt ? `避免：${cleanedNegativePrompt}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    finalPrompt,
    sections,
    workspacePrompt,
    finalPromptLength: finalPrompt.length,
    workspacePromptLength: workspacePrompt.length,
    enabledSectionCount: sections.filter((section) => section.value.trim()).length,
  }
}
