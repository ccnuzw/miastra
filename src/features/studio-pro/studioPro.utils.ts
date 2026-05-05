import type { StyleToken } from '@/features/studio/studio.types'
import { styleTokens } from '@/features/studio/studio.constants'
import { buildPromptTemplatePresentation } from '@/features/prompt-templates/promptTemplate.presentation'
import {
  getPromptTemplateStructure,
  getPromptTemplateStructureFieldDigest,
  getPromptTemplateStructureStatusLabel,
} from '@/features/prompt-templates/promptTemplate.schema'
import type { StudioFlowScene } from '@/features/prompt-templates/studioFlowSemantic'
import type {
  PromptTemplateFieldGroup,
  PromptTemplateListItem,
} from '@/features/prompt-templates/promptTemplate.types'

export type StudioProPromptSection = {
  id: 'workspace' | 'styles' | 'detail' | 'negative'
  label: string
  hint: string
  value: string
  emptyText?: string
}

export type StudioProPromptAnchor = 'workspace' | 'styles' | 'detail' | 'negative' | 'parameters'

export type StudioProComparisonStatus = 'aligned' | 'shifted' | 'missing'

export type StudioProPromptFieldMapping = {
  id: string
  label: string
  value: string
  group: PromptTemplateFieldGroup
  groupLabel: string
  promptAnchor: StudioProPromptAnchor
  promptAnchorLabel: string
  promptAnchorHint: string
}

export type StudioProComparisonItem = {
  id: string
  label: string
  currentValue: string
  baselineValue: string
  status: StudioProComparisonStatus
  statusLabel: string
  hint: string
}

export type StudioProComparisonSummary = {
  status: StudioProComparisonStatus
  statusLabel: string
  alignedCount: number
  shiftedCount: number
  missingCount: number
  summary: string
  suggestion: string
}

export type StudioProTextComparison = {
  status: StudioProComparisonStatus
  statusLabel: string
  summary: string
  deltaLabel: string
  suggestion: string
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
  scene: StudioFlowScene
  sceneId?: string
  sceneLabel: string
  sceneDescription: string
  structureStatusLabel: string
  recommendedLabel: string
  recommendedReason: string
  recommendedBestFor: string
  recommendedNextStep: string
  structureFields: string[]
  structureFieldMappings: StudioProPromptFieldMapping[]
  structureSummary: Array<{
    id: string
    label: string
    value: string
  }>
  defaultSettingsLabel: string
  defaultSettings: {
    aspectLabel?: string
    resolutionTier?: '1k' | '2k'
    quality?: 'low' | 'medium' | 'high'
  }
  metadataHint: string
  useCases: string[]
  executionIntentLabel: string
  executionIntentSummary: string
  resultBridgeSummary: string
  primaryNextActionLabel: string
  primaryNextActionDescription: string
  followUpSummary: string
  versionSummary: string
  sourceLabel: string
}

export type StudioProReplayContext = {
  sourceLabel: string
  actionLabel: string
  scene?: StudioFlowScene
  sceneLabel?: string
  statusText: string
  hint: string
  originLabel: string
  sourceKind: import('@/features/works/workReplay').WorkVersionSourceKind
  sourceKindLabel: string
  sourceDecisionLabel: string
  structureLabel: string
  nodePathLabel: string
  detailLabel: string
  currentLabel?: string
  parentLabel?: string
  ancestorLabel?: string
  guidedFlowLabel?: string
  parameterLabel?: string
  promptLabel?: string
  snapshotId: string
  sourceProviderId: string
  sourceModelLabel: string
  sourceRequestKindLabel: string
  sourceSize?: string
  sourceQuality?: string
  sourceStream?: boolean | null
  sourceAspectLabel?: string | null
  sourceResolutionLabel?: string | null
  sourceResolutionTier?: '1k' | '2k' | '4k' | null
  sourceStudioMode?: 'create' | 'draw'
  sourceDrawCount?: number | null
  sourceDrawStrategy?: 'linear' | 'smart' | 'turbo' | null
  sourceDrawConcurrency?: number | null
  sourceDrawDelayMs?: number | null
  sourceDrawRetries?: number | null
  sourceDrawTimeoutSec?: number | null
  sourceVariationStrength?: 'low' | 'medium' | 'high' | null
  sourceVariationDimensionCount?: number
  sourceReferenceCount?: number | null
  sourceWorkspacePrompt?: string
  requestPrompt: string
  referenceSummaryLabel: string
}

export type StudioProControlStep = {
  id: string
  label: string
  value: string
  detail: string
}

const promptFieldGroupConfig: Record<
  PromptTemplateFieldGroup,
  Pick<StudioProPromptFieldMapping, 'groupLabel' | 'promptAnchor' | 'promptAnchorLabel' | 'promptAnchorHint'>
> = {
  subject: {
    groupLabel: '主体字段',
    promptAnchor: 'workspace',
    promptAnchorLabel: '工作区 Prompt',
    promptAnchorHint: '主体、对象和主要内容优先落在工作区主描述里，决定本轮 Prompt 主干。',
  },
  context: {
    groupLabel: '上下文字段',
    promptAnchor: 'workspace',
    promptAnchorLabel: '工作区 Prompt',
    promptAnchorHint: '用途、场景和补充上下文会先进入工作区描述，再参与最终组装。',
  },
  style: {
    groupLabel: '风格字段',
    promptAnchor: 'styles',
    promptAnchorLabel: '风格补充 / 工作区 Prompt',
    promptAnchorHint: '风格字段既可以直接写进主描述，也适合通过风格 token 稳定补到最终 Prompt。',
  },
  output: {
    groupLabel: '输出字段',
    promptAnchor: 'parameters',
    promptAnchorLabel: '参数快照 / 细节控制',
    promptAnchorHint: '输出方向通常会同时影响 Prompt、尺寸、质量和执行路径，适合和参数区一起校准。',
  },
}

function getStudioProComparisonStatusLabel(status: StudioProComparisonStatus) {
  switch (status) {
    case 'aligned':
      return '已对齐'
    case 'shifted':
      return '已偏移'
    default:
      return '待补齐'
  }
}

function normalizeStudioProCompareValue(value?: string | null) {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function getPromptSectionValue(sections: StudioProPromptSection[], sectionId: StudioProPromptAnchor) {
  if (sectionId === 'parameters') return ''
  return sections.find((section) => section.id === sectionId)?.value.trim() ?? ''
}

function getStudioProLengthDeltaLabel(currentLength: number, baselineLength: number) {
  const delta = currentLength - baselineLength
  if (delta === 0) return `当前与基线都为 ${currentLength} 字`
  if (delta > 0) return `当前比基线多 ${delta} 字（${currentLength} vs ${baselineLength}）`
  return `当前比基线少 ${Math.abs(delta)} 字（${currentLength} vs ${baselineLength}）`
}

export function resolveSelectedStudioStyleTokens(selectedIds: string[]) {
  return styleTokens.filter((token) => selectedIds.includes(token.id))
}

export function buildStudioProTemplateContext(
  template: PromptTemplateListItem,
  sourceLabel: string,
): StudioProTemplateContext {
  const presentation = buildPromptTemplatePresentation(template)
  const structure = getPromptTemplateStructure(template)
  const structureSummaryById = new Map(structure.summary.map((item) => [item.id, item]))
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
    scene: structure.scene,
    sceneId: structure.scene.id,
    sceneLabel: structure.scene.label,
    sceneDescription: structure.scene.description,
    structureStatusLabel: getPromptTemplateStructureStatusLabel(structure.status),
    recommendedLabel: presentation.recommendedEntry.label,
    recommendedReason: presentation.recommendedEntry.reason,
    recommendedBestFor: presentation.recommendedEntry.bestFor,
    recommendedNextStep: presentation.recommendedEntry.nextStep,
    structureFields: getPromptTemplateStructureFieldDigest(structure.fields, 4),
    structureFieldMappings: structure.fields.map((field) => {
      const summary = structureSummaryById.get(field.id)
      const groupConfig = promptFieldGroupConfig[field.group]
      return {
        id: field.id,
        label: field.label,
        value: summary?.value ?? field.description,
        group: field.group,
        groupLabel: groupConfig.groupLabel,
        promptAnchor: groupConfig.promptAnchor,
        promptAnchorLabel: groupConfig.promptAnchorLabel,
        promptAnchorHint: groupConfig.promptAnchorHint,
      }
    }),
    structureSummary: structure.summary,
    defaultSettingsLabel,
    defaultSettings: structure.defaults,
    metadataHint: presentation.structureMeta.metadataHint,
    useCases: presentation.useCases,
    executionIntentLabel: presentation.executionIntent.label,
    executionIntentSummary: presentation.executionIntent.summary,
    resultBridgeSummary: presentation.resultBridge.summary,
    primaryNextActionLabel: presentation.resultBridge.actions[0]?.label ?? '继续处理',
    primaryNextActionDescription:
      presentation.resultBridge.actions[0]?.description ?? '当前模板会继续承接结果动作。',
    followUpSummary: presentation.chainContext.followUpSummary,
    versionSummary: presentation.chainContext.versionSummary,
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

export function buildStudioProPromptFieldAlignment(
  templateContext: StudioProTemplateContext | null | undefined,
  promptSections: StudioProPromptSection[],
) {
  if (!templateContext) return []

  return templateContext.structureFieldMappings.map((field) => {
    if (field.promptAnchor === 'parameters') {
      return {
        ...field,
        status: 'aligned' as const,
        statusLabel: getStudioProComparisonStatusLabel('aligned'),
        hint: `${field.promptAnchorHint} 这一类字段建议直接到参数快照里确认尺寸、质量和执行基线。`,
      }
    }

    const anchorValue =
      field.promptAnchor === 'styles'
        ? getPromptSectionValue(promptSections, 'styles') || getPromptSectionValue(promptSections, 'workspace')
        : getPromptSectionValue(promptSections, field.promptAnchor)
    const status = anchorValue ? 'aligned' : 'missing'
    return {
      ...field,
      status,
      statusLabel: getStudioProComparisonStatusLabel(status),
      hint: anchorValue
        ? `${field.promptAnchorHint} 当前这部分已有内容，可直接对照这一段是否承接了字段意图。`
        : `${field.promptAnchorHint} 当前这部分还是空的，建议先补这一段或恢复模板基线。`,
    }
  })
}

export function buildStudioProTextComparison(
  currentValue: string,
  baselineValue?: string | null,
): StudioProTextComparison {
  const normalizedCurrent = normalizeStudioProCompareValue(currentValue)
  const normalizedBaseline = normalizeStudioProCompareValue(baselineValue)
  const currentLength = normalizedCurrent.length
  const baselineLength = normalizedBaseline.length

  if (!normalizedBaseline) {
    return {
      status: 'missing',
      statusLabel: getStudioProComparisonStatusLabel('missing'),
      summary: '当前还没有接入来源文本基线',
      deltaLabel: currentLength ? `当前文本 ${currentLength} 字` : '当前文本为空',
      suggestion: '先从作品或任务恢复一版，再判断这一轮是在重跑还是重新起稿。',
    }
  }

  if (!normalizedCurrent) {
    return {
      status: 'missing',
      statusLabel: getStudioProComparisonStatusLabel('missing'),
      summary: '来源文本已接入，但当前工作区还是空的',
      deltaLabel: `来源文本 ${baselineLength} 字`,
      suggestion: '如果要做同基线比较，先恢复来源 Prompt 或模板基线，再开始微调。',
    }
  }

  if (normalizedCurrent === normalizedBaseline) {
    return {
      status: 'aligned',
      statusLabel: getStudioProComparisonStatusLabel('aligned'),
      summary: '当前文本仍与来源基线一致',
      deltaLabel: getStudioProLengthDeltaLabel(currentLength, baselineLength),
      suggestion: '现在更适合同基线重跑；如果继续改动，这一轮就会自然转成派生版本。',
    }
  }

  const looksLikeIncrementalEdit =
    normalizedCurrent.includes(normalizedBaseline) || normalizedBaseline.includes(normalizedCurrent)

  return {
    status: 'shifted',
    statusLabel: getStudioProComparisonStatusLabel('shifted'),
    summary: looksLikeIncrementalEdit ? '当前文本已在来源基线上做局部增删' : '当前文本已经明显偏离来源基线',
    deltaLabel: getStudioProLengthDeltaLabel(currentLength, baselineLength),
    suggestion: looksLikeIncrementalEdit
      ? '适合继续做同方向校准；如果希望严格复现上一版，先恢复来源 Prompt。'
      : '现在更接近派生版本；如果需要严谨对照，建议先恢复来源版再逐项修改。',
  }
}

export function buildStudioProComparisonItem(
  id: string,
  label: string,
  currentValue?: string | null,
  baselineValue?: string | null,
  changedHint?: string,
): StudioProComparisonItem {
  const normalizedCurrent = normalizeStudioProCompareValue(currentValue)
  const normalizedBaseline = normalizeStudioProCompareValue(baselineValue)

  if (!normalizedBaseline) {
    return {
      id,
      label,
      currentValue: normalizedCurrent || '未设置',
      baselineValue: '未记录',
      status: 'missing',
      statusLabel: getStudioProComparisonStatusLabel('missing'),
      hint: '来源基线未记录这一项，当前只能按现有控制区继续校准。',
    }
  }

  if (!normalizedCurrent) {
    return {
      id,
      label,
      currentValue: '未设置',
      baselineValue: normalizedBaseline,
      status: 'missing',
      statusLabel: getStudioProComparisonStatusLabel('missing'),
      hint: '来源基线有值，但当前控制区还没有补齐这一项。',
    }
  }

  if (normalizedCurrent === normalizedBaseline) {
    return {
      id,
      label,
      currentValue: normalizedCurrent,
      baselineValue: normalizedBaseline,
      status: 'aligned',
      statusLabel: getStudioProComparisonStatusLabel('aligned'),
      hint: '当前控制区与来源基线保持一致。',
    }
  }

  return {
    id,
    label,
    currentValue: normalizedCurrent,
    baselineValue: normalizedBaseline,
    status: 'shifted',
    statusLabel: getStudioProComparisonStatusLabel('shifted'),
    hint: changedHint ?? '当前值已偏离来源基线，下一轮会更接近派生结果。',
  }
}

export function summarizeStudioProComparisons(items: StudioProComparisonItem[]): StudioProComparisonSummary {
  const alignedCount = items.filter((item) => item.status === 'aligned').length
  const shiftedCount = items.filter((item) => item.status === 'shifted').length
  const missingCount = items.filter((item) => item.status === 'missing').length

  if (!items.length || missingCount === items.length) {
    return {
      status: 'missing',
      statusLabel: getStudioProComparisonStatusLabel('missing'),
      alignedCount,
      shiftedCount,
      missingCount,
      summary: '还没有足够的对照基线',
      suggestion: '先恢复来源快照或模板默认值，再判断当前改动是校准还是派生。',
    }
  }

  if (shiftedCount === 0 && missingCount === 0) {
    return {
      status: 'aligned',
      statusLabel: getStudioProComparisonStatusLabel('aligned'),
      alignedCount,
      shiftedCount,
      missingCount,
      summary: `共 ${alignedCount} 项保持一致`,
      suggestion: '当前控制区仍贴近原基线，更适合同配置复跑。',
    }
  }

  return {
    status: 'shifted',
    statusLabel: getStudioProComparisonStatusLabel('shifted'),
    alignedCount,
    shiftedCount,
    missingCount,
    summary: `对齐 ${alignedCount} 项，偏移 ${shiftedCount} 项${missingCount ? `，缺失 ${missingCount} 项` : ''}`,
    suggestion:
      shiftedCount > 2
        ? '当前已经偏离多项基线，更接近派生版本；如需严格对照，建议先恢复来源参数。'
        : '当前是小幅校准，可继续围绕现有基线微调 1 到 2 项。',
  }
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
