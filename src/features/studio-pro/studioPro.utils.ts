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

export type StudioProPromptFieldAlignmentItem = StudioProPromptFieldMapping & {
  status: StudioProComparisonStatus
  statusLabel: string
  hint: string
  recommendedAction: string
}

export type StudioProDecisionState = 'restore' | 'rerun' | 'calibrate' | 'branch'

export type StudioProDecisionCard = {
  state: StudioProDecisionState
  stateLabel: string
  title: string
  summary: string
  recommendation: string
  primaryAction: string
  secondaryAction?: string
  focusItems: string[]
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
  deltaHeadline: string
  parentDeltaLabel: string
  sourceDeltaLabel: string
  quickDeltaLabels: string[]
  deltaItems: Array<import('@/features/works/workReplay').WorkVersionDeltaItem>
  decisionSummary: string
  recommendedActionId: import('@/features/works/workReplay').WorkReplayIntent
  recommendedActionLabel: string
  actionDecisionReason: string
  actionDecisions: Array<import('@/features/works/workReplay').WorkVersionActionDecision>
  directLinks: Array<import('@/features/works/workReplay').WorkVersionDirectLink>
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
  expectedReferenceCount: number
  restoredReferenceCount: number
  hasCompleteReferenceRestore: boolean
  canAutoRerun: boolean
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

const studioProQualityLabelMap: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  auto: '自动',
}

const studioProDrawStrategyLabelMap: Record<'linear' | 'smart' | 'turbo', string> = {
  linear: '线性',
  smart: '智能',
  turbo: '极速',
}

const studioProVariationStrengthLabelMap: Record<'low' | 'medium' | 'high', string> = {
  low: '低变体',
  medium: '中变体',
  high: '高变体',
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

function getStudioProDecisionStateLabel(state: StudioProDecisionState) {
  switch (state) {
    case 'rerun':
      return '适合重跑'
    case 'calibrate':
      return '适合校准'
    case 'branch':
      return '适合派生'
    default:
      return '先立基线'
  }
}

function createStudioProDecisionCard(input: {
  state: StudioProDecisionState
  title: string
  summary: string
  recommendation: string
  primaryAction: string
  secondaryAction?: string
  focusItems?: string[]
}): StudioProDecisionCard {
  return {
    state: input.state,
    stateLabel: getStudioProDecisionStateLabel(input.state),
    title: input.title,
    summary: input.summary,
    recommendation: input.recommendation,
    primaryAction: input.primaryAction,
    secondaryAction: input.secondaryAction,
    focusItems: input.focusItems?.filter(Boolean).slice(0, 3) ?? [],
  }
}

export function resolveSelectedStudioStyleTokens(selectedIds: string[]) {
  return styleTokens.filter((token) => selectedIds.includes(token.id))
}

export function getStudioProQualityLabel(value?: string | null) {
  if (!value) return ''
  return studioProQualityLabelMap[value] ?? value
}

export function getStudioProDrawStrategyLabel(value?: 'linear' | 'smart' | 'turbo' | null) {
  if (!value) return ''
  return studioProDrawStrategyLabelMap[value] ?? value
}

export function getStudioProVariationStrengthLabel(value?: 'low' | 'medium' | 'high' | null) {
  if (!value) return ''
  return studioProVariationStrengthLabelMap[value] ?? value
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
): StudioProPromptFieldAlignmentItem[] {
  if (!templateContext) return []

  return templateContext.structureFieldMappings.map((field) => {
    if (field.promptAnchor === 'parameters') {
      return {
        ...field,
        status: 'aligned' as const,
        statusLabel: getStudioProComparisonStatusLabel('aligned'),
        hint: `${field.promptAnchorHint} 这一类字段建议直接到参数快照里确认尺寸、质量和执行基线。`,
        recommendedAction: '先到参数面板确认默认画幅、分辨率和质量，再决定是否偏离模板起跑线。',
      }
    }

    const workspaceValue = getPromptSectionValue(promptSections, 'workspace')
    const styleValue = getPromptSectionValue(promptSections, 'styles')
    const anchorValue =
      field.promptAnchor === 'styles'
        ? styleValue || workspaceValue
        : getPromptSectionValue(promptSections, field.promptAnchor)
    const status =
      !anchorValue
        ? 'missing'
        : field.promptAnchor === 'styles' && !styleValue
          ? 'shifted'
          : 'aligned'
    return {
      ...field,
      status,
      statusLabel: getStudioProComparisonStatusLabel(status),
      hint: anchorValue
        ? status === 'shifted'
          ? `${field.promptAnchorHint} 当前主要靠工作区主描述承接，适合再补一层独立风格控制，后续复用更稳。`
          : `${field.promptAnchorHint} 当前这部分已有内容，可直接对照这一段是否承接了字段意图。`
        : `${field.promptAnchorHint} 当前这部分还是空的，建议先补这一段或恢复模板基线。`,
      recommendedAction:
        !anchorValue
          ? `先补 ${field.promptAnchorLabel}，把「${field.label}」对应的控制点立起来。`
          : status === 'shifted'
            ? `把「${field.label}」从主描述里再沉到 ${field.promptAnchorLabel}，减少下一轮漂移。`
            : `继续围绕 ${field.promptAnchorLabel} 微调「${field.label}」，当前承接路径是通的。`,
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

export function buildStudioProExecutionComparisonItems(input: {
  providerId: string
  modelLabel: string
  requestKindLabel: string
  replayContext?: StudioProReplayContext | null
}) {
  const { providerId, modelLabel, requestKindLabel, replayContext } = input
  if (!replayContext) return []

  return [
    buildStudioProComparisonItem(
      'provider',
      'Provider',
      providerId || 'custom',
      replayContext.sourceProviderId,
      '当前 Provider 已变化，说明你已经切到另一套执行服务。',
    ),
    buildStudioProComparisonItem(
      'model',
      '模型',
      modelLabel,
      replayContext.sourceModelLabel,
      '当前模型已变化，生成风格和稳定性都会和来源版不同。',
    ),
    buildStudioProComparisonItem(
      'route',
      '执行路径',
      requestKindLabel,
      replayContext.sourceRequestKindLabel,
      '当前请求路径已从文生图/图生图之间切换，下一轮更接近派生版本。',
    ),
  ]
}

export function buildStudioProParameterReplayComparisonItems(input: {
  studioMode: 'create' | 'draw'
  size: string
  resolutionLabel: string
  quality: string
  stream: boolean
  referenceCount: number
  drawCount: number
  drawStrategy: 'linear' | 'smart' | 'turbo'
  drawConcurrency: number
  replayContext?: StudioProReplayContext | null
}) {
  const {
    studioMode,
    size,
    resolutionLabel,
    quality,
    stream,
    referenceCount,
    drawCount,
    drawStrategy,
    drawConcurrency,
    replayContext,
  } = input

  if (!replayContext) return []

  const currentGenerationModeLabel = studioMode === 'draw' ? '图片抽卡' : '创作生成'
  const sourceGenerationModeLabel =
    replayContext.sourceStudioMode === 'draw'
      ? '图片抽卡'
      : replayContext.sourceStudioMode === 'create'
        ? '创作生成'
        : ''
  const currentBatchLabel =
    studioMode === 'draw'
      ? `${drawCount} 次 · ${getStudioProDrawStrategyLabel(drawStrategy)} · 并发 ${drawConcurrency}`
      : '单次生成'
  const sourceBatchLabel =
    replayContext.sourceStudioMode === 'draw'
      ? `${replayContext.sourceDrawCount ?? 0} 次 · ${
          replayContext.sourceDrawStrategy
            ? getStudioProDrawStrategyLabel(replayContext.sourceDrawStrategy)
            : '未记录策略'
        } · 并发 ${replayContext.sourceDrawConcurrency ?? 0}`
      : replayContext.sourceStudioMode === 'create'
        ? '单次生成'
        : ''

  return [
    buildStudioProComparisonItem(
      'size',
      '输出尺寸',
      `${size} · ${resolutionLabel}`,
      replayContext.sourceSize
        ? `${replayContext.sourceSize} · ${replayContext.sourceResolutionLabel ?? '未记录分辨率'}`
        : '',
      '当前尺寸或分辨率已偏离来源快照，下一轮会输出新的规格版本。',
    ),
    buildStudioProComparisonItem(
      'quality',
      '质量',
      getStudioProQualityLabel(quality),
      getStudioProQualityLabel(replayContext.sourceQuality),
      '当前质量档位已改变，会直接影响结果稳定性和清晰度。',
    ),
    buildStudioProComparisonItem(
      'stream',
      '返回方式',
      stream ? '流式开启' : '流式关闭',
      replayContext.sourceStream == null ? '' : replayContext.sourceStream ? '流式开启' : '流式关闭',
      '当前返回方式与来源不同，会影响查看节奏但不改变画面语义。',
    ),
    buildStudioProComparisonItem(
      'mode',
      '任务模式',
      currentGenerationModeLabel,
      sourceGenerationModeLabel,
      '当前任务模式与来源不同，说明你已经从单轮生成切到抽卡，或反过来切回单轮。',
    ),
    buildStudioProComparisonItem(
      'batch',
      '批量策略',
      currentBatchLabel,
      sourceBatchLabel,
      '当前抽卡或批量策略已调整，下一轮更适合当作派生版本看待。',
    ),
    buildStudioProComparisonItem(
      'references',
      '参考图',
      `${referenceCount} 张`,
      replayContext.sourceReferenceCount != null ? `${replayContext.sourceReferenceCount} 张` : '',
      '当前参考图数量与来源不同，Prompt 再一致也会走成新的控制基线。',
    ),
  ]
}

export function buildStudioProTemplateParameterComparisonItems(input: {
  aspectLabel: string
  resolutionLabel: string
  quality: string
  templateContext?: StudioProTemplateContext | null
}) {
  const { aspectLabel, resolutionLabel, quality, templateContext } = input
  if (!templateContext) return []

  return [
    buildStudioProComparisonItem(
      'template-aspect',
      '模板默认画幅',
      aspectLabel,
      templateContext.defaultSettings.aspectLabel,
      '当前画幅已经偏离模板默认值，适合确认这是不是刻意派生。',
    ),
    buildStudioProComparisonItem(
      'template-resolution',
      '模板默认分辨率',
      resolutionLabel,
      templateContext.defaultSettings.resolutionTier?.toUpperCase(),
      '当前分辨率已经偏离模板默认值，输出规格会和模板基线不同。',
    ),
    buildStudioProComparisonItem(
      'template-quality',
      '模板默认质量',
      getStudioProQualityLabel(quality),
      templateContext.defaultSettings.quality
        ? getStudioProQualityLabel(templateContext.defaultSettings.quality)
        : '',
      '当前质量已经偏离模板默认值，首轮复用稳定性会下降。',
    ),
  ]
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

export function buildStudioProPromptDecision(input: {
  templateContext?: StudioProTemplateContext | null
  replayContext?: StudioProReplayContext | null
  fieldAlignment: StudioProPromptFieldAlignmentItem[]
  workspaceBaseline: StudioProTextComparison
  finalPromptBaseline: StudioProTextComparison
  workspacePromptLength: number
}): StudioProDecisionCard {
  const { templateContext, replayContext, fieldAlignment, workspaceBaseline, finalPromptBaseline, workspacePromptLength } = input
  const missingFields = fieldAlignment.filter((item) => item.status === 'missing')
  const shiftedFields = fieldAlignment.filter((item) => item.status === 'shifted')
  const focusItems = [
    ...missingFields.map((item) => `${item.label}：${item.recommendedAction}`),
    ...shiftedFields.map((item) => `${item.label}：${item.recommendedAction}`),
  ]

  if (!workspacePromptLength && !templateContext && !replayContext) {
    return createStudioProDecisionCard({
      state: 'restore',
      title: '先建立本轮 Prompt 基线',
      summary: '当前还没有工作区描述，也没有模板或来源版可对照。',
      recommendation: '先写一句主体需求，或从模板 / 结果回流进入，再开始判断是重跑还是派生。',
      primaryAction: '先补工作区 Prompt',
      secondaryAction: '也可以先接入模板或来源版',
    })
  }

  if (replayContext && workspaceBaseline.status === 'aligned' && finalPromptBaseline.status === 'aligned' && !missingFields.length && !shiftedFields.length) {
    return createStudioProDecisionCard({
      state: 'rerun',
      title: '当前 Prompt 仍贴着来源版',
      summary: '工作区、最终 Prompt 和结构字段承接都还没有明显偏离来源基线。',
      recommendation: '现在最适合同基线重跑；如果只想验证模型随机性，不必先改文字。',
      primaryAction: '直接重跑来源版基线',
      secondaryAction: '如需派生，再改 1 到 2 个字段',
      focusItems,
    })
  }

  if (missingFields.length > 0) {
    return createStudioProDecisionCard({
      state: 'calibrate',
      title: '先把缺失字段补回 Prompt 落点',
      summary: `还有 ${missingFields.length} 个结构字段没有落到当前 Prompt 链路里。`,
      recommendation: '这时继续硬改最终 Prompt 容易漂移，先把缺的主体 / 风格 / 输出控制点补齐更稳。',
      primaryAction: '优先补齐缺失字段',
      secondaryAction: replayContext ? '必要时先恢复来源 Prompt 再补字段' : '必要时先恢复模板 Prompt 基线',
      focusItems,
    })
  }

  if (workspaceBaseline.status === 'shifted' || finalPromptBaseline.status === 'shifted' || shiftedFields.length > 0) {
    const isIncrementalEdit =
      workspaceBaseline.summary.includes('局部增删') || finalPromptBaseline.summary.includes('局部增删')
    return createStudioProDecisionCard({
      state: isIncrementalEdit && shiftedFields.length <= 1 ? 'calibrate' : 'branch',
      title: isIncrementalEdit ? '当前更适合做局部校准' : '当前 Prompt 已接近新分支',
      summary: isIncrementalEdit
        ? '你已经在来源版上做了小步文字调整，但还保留着大部分原始控制链。'
        : '工作区或最终 Prompt 已明显偏离来源基线，下一轮更像独立派生。',
      recommendation: isIncrementalEdit
        ? '继续围绕 1 到 2 个字段收紧描述即可；如果想回到严格对照，先恢复来源 Prompt。'
        : '如果目标是复现上一版，先回到来源 Prompt；如果目标是新方向，保留当前改动直接派生更高效。',
      primaryAction: isIncrementalEdit ? '继续按字段做小步校准' : '把当前改动当作派生起点',
      secondaryAction: replayContext ? '需要复现时恢复来源 Prompt' : '需要收紧时恢复模板 Prompt',
      focusItems,
    })
  }

  if (templateContext) {
    return createStudioProDecisionCard({
      state: 'rerun',
      title: '模板 Prompt 基线已经接稳',
      summary: `当前工作区已按「${templateContext.title}」的结构字段承接。`,
      recommendation: '如果只是验证模板首轮稳定性，现在可以直接跑；如需微调，优先改字段对应段落，不要一次重写整段。',
      primaryAction: '按模板基线直接生成',
      secondaryAction: '围绕字段落点做小改',
      focusItems,
    })
  }

  return createStudioProDecisionCard({
    state: 'calibrate',
    title: '当前 Prompt 已可继续收紧',
    summary: '虽然没有来源版基线，但工作区 Prompt 已经形成一条可执行主线。',
    recommendation: '现在适合继续补风格、细节或 Negative Prompt，把本轮控制点收紧成稳定快照。',
    primaryAction: '继续补强当前 Prompt',
    focusItems,
  })
}

export function buildStudioProParameterDecision(input: {
  templateContext?: StudioProTemplateContext | null
  replayContext?: StudioProReplayContext | null
  replayComparisonItems: StudioProComparisonItem[]
  replayComparisonSummary: StudioProComparisonSummary
  templateComparisonItems: StudioProComparisonItem[]
  templateComparisonSummary: StudioProComparisonSummary
  studioMode: 'create' | 'draw'
  referenceCount: number
}): StudioProDecisionCard {
  const {
    templateContext,
    replayContext,
    replayComparisonItems,
    replayComparisonSummary,
    templateComparisonItems,
    templateComparisonSummary,
    studioMode,
    referenceCount,
  } = input
  const shiftedReplayItems = replayComparisonItems.filter((item) => item.status === 'shifted')
  const shiftedTemplateItems = templateComparisonItems.filter((item) => item.status === 'shifted')
  const focusItems = [
    ...shiftedReplayItems.map((item) => `${item.label}：${item.hint}`),
    ...shiftedTemplateItems.map((item) => `${item.label}：${item.hint}`),
  ]

  if (replayContext && replayComparisonSummary.status === 'aligned') {
    return createStudioProDecisionCard({
      state: 'rerun',
      title: '参数快照仍贴着来源版',
      summary: `当前参数与来源快照保持一致，${studioMode === 'draw' ? '抽卡策略' : '单轮生成设置'}也没有偏移。`,
      recommendation: '如果只是验证 Prompt 调整带来的差异，现在直接重跑最干净。',
      primaryAction: '按来源参数直接重跑',
      secondaryAction: '如需派生，再改尺寸 / 质量 / 参考图',
      focusItems,
    })
  }

  if (templateContext && !replayContext && templateComparisonSummary.status === 'aligned') {
    return createStudioProDecisionCard({
      state: 'rerun',
      title: '模板默认参数已经接稳',
      summary: `当前尺寸、分辨率和质量都还贴着「${templateContext.title}」默认值。`,
      recommendation: '适合先验证模板首轮参数是否够用，再决定是否偏离默认起跑线。',
      primaryAction: '先按模板默认参数生成',
      secondaryAction: '结果不够稳时再微调 1 到 2 项',
      focusItems,
    })
  }

  if (replayContext && shiftedReplayItems.length > 2) {
    return createStudioProDecisionCard({
      state: 'branch',
      title: '当前参数已经形成新派生基线',
      summary: `来源快照上已经偏移 ${shiftedReplayItems.length} 项，参考图 ${referenceCount} 张也会一起影响新结果。`,
      recommendation: '这时再追求“同版重跑”意义不大，保留当前参数直接派生更高效。',
      primaryAction: '把当前参数当作新分支继续跑',
      secondaryAction: '如果要复现来源版，先恢复来源参数',
      focusItems,
    })
  }

  if (shiftedReplayItems.length > 0 || shiftedTemplateItems.length > 0) {
    return createStudioProDecisionCard({
      state: 'calibrate',
      title: '当前更适合做参数校准',
      summary: `来源快照与模板默认值之间已经出现偏移，但还没有大到必须另起分支。`,
      recommendation: '优先收紧尺寸、质量、参考图和批量策略这几项，再判断本轮是否继续派生。',
      primaryAction: '优先校准偏移参数',
      secondaryAction: replayContext ? '需要时恢复来源执行基线' : '需要时恢复模板默认参数',
      focusItems,
    })
  }

  return createStudioProDecisionCard({
    state: replayContext || templateContext ? 'calibrate' : 'restore',
    title: replayContext || templateContext ? '参数快照已经具备对照基础' : '先决定参数要跟哪条基线走',
    summary:
      replayContext || templateContext
        ? '当前参数没有明显冲突，可以继续围绕画幅、质量和参考图做小步调整。'
        : '还没有来源快照或模板默认值参与对照，当前更像自由试跑。',
    recommendation:
      replayContext || templateContext
        ? '保持每次只改少数几项，更容易判断结果差异。'
        : '如果后面要做高频复用，建议先接一条模板或来源版基线。',
    primaryAction: replayContext || templateContext ? '继续小步校准参数' : '先接入模板或来源快照',
    focusItems,
  })
}

export function buildStudioProExecutionDecision(input: {
  replayContext?: StudioProReplayContext | null
  executionComparisonItems: StudioProComparisonItem[]
  executionComparisonSummary: StudioProComparisonSummary
  keepsSameExecutionBaseline: boolean
}): StudioProDecisionCard {
  const { replayContext, executionComparisonItems, executionComparisonSummary, keepsSameExecutionBaseline } = input
  const shiftedItems = executionComparisonItems.filter((item) => item.status === 'shifted')
  const focusItems = shiftedItems.map((item) => `${item.label}：${item.hint}`)

  if (!replayContext) {
    return createStudioProDecisionCard({
      state: 'restore',
      title: '先接入来源执行链再判断重跑或派生',
      summary: '当前还没有来源版 Provider / 模型 / 路由基线。',
      recommendation: '从作品或任务恢复一版后，再判断这一轮是不是要严格复现执行环境。',
      primaryAction: '先恢复来源快照',
    })
  }

  if (keepsSameExecutionBaseline) {
    return createStudioProDecisionCard({
      state: 'rerun',
      title: '执行链仍与来源版一致',
      summary: 'Provider、模型和执行路径都还贴着来源快照。',
      recommendation: '如果当前目标是验证 Prompt 或参数微调，这一层不需要先改。',
      primaryAction: '保持执行链不动直接重跑',
      secondaryAction: '如需派生，再切模型或执行路径',
      focusItems,
    })
  }

  if (shiftedItems.length === 1) {
    return createStudioProDecisionCard({
      state: 'calibrate',
      title: '执行基线有一处偏移',
      summary: executionComparisonSummary.summary,
      recommendation: '现在更像单点校准，适合先决定这一处偏移是不是刻意的。',
      primaryAction: '确认是否保留当前执行偏移',
      secondaryAction: '如需贴近来源，先恢复来源参数基线并核对当前 Provider / 模型',
      focusItems,
    })
  }

  return createStudioProDecisionCard({
    state: 'branch',
    title: '执行链已经换到另一条派生路径',
    summary: executionComparisonSummary.summary,
    recommendation: 'Provider、模型或路由已改动多项，这一轮更适合明确当作新分支处理。',
    primaryAction: '按当前执行链继续派生',
    secondaryAction: '如需贴近旧链，先恢复来源参数基线并核对当前 Provider / 模型',
    focusItems,
  })
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
