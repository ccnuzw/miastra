import type { GenerationTaskRecord } from '@/features/generation/generation.api'
import {
  getGenerationSnapshotReferenceCount,
  resolveGenerationContractFromTask,
  resolveGenerationContractFromWork,
  resolveGenerationContractSnapshot,
  resolveGenerationSnapshotRecord,
} from '@/features/generation/generation.contract'
import type {
  GenerationContractSnapshot,
  GenerationDrawSnapshot,
  GenerationMode,
  GenerationReferenceSnapshot,
  GenerationSnapshot,
} from '@/features/generation/generation.types'
import {
  getStudioFlowActionLabel,
  getStudioFlowScene,
} from '@/features/prompt-templates/studioFlowSemantic'
import {
  normalizeConsumerGuidedFlowActionPlan,
  rebaseConsumerGuidedFlowSnapshot,
} from '@/features/studio-consumer/consumerGuidedFlow'
import type { ReferenceImage } from '@/features/references/reference.types'
import type { GalleryImage } from './works.types'

export const workReplayStorageKey = 'new-pic:work-replay:v1'

export type WorkReplayOrigin = 'work' | 'task'
export type WorkReplayIntent = 'continue-version' | 'retry-version' | 'branch-version'

export type WorkReplayReferenceSummary = {
  expectedReferenceCount: number
  restorableReferenceCount: number
  missingReferenceCount: number
  canAutoGenerate: boolean
  parentSummary: string
  ancestorSummary: string
  currentSummary: string
  guidedSummary: string
  parameterSummary: string
  referenceSummary: string
}

export type WorkVersionSourceSummary = {
  originLabel: string
  detailLabel: string
  parentLabel: string
  currentLabel: string
  ancestorLabel: string
  guidedFlowLabel: string
  parameterLabel: string
  referenceLabel: string
  promptLabel: string
  deltaHeadline: string
  parentDeltaLabel: string
  sourceDeltaLabel: string
  quickDeltaLabels: string[]
  deltaItems: WorkVersionDeltaItem[]
  decisionSummary: string
  recommendedActionId: WorkReplayIntent
  recommendedActionLabel: string
  recommendedActionSummary: string
  actionDecisionReason: string
  actionDecisions: WorkVersionActionDecision[]
  directLinks: WorkVersionDirectLink[]
  recommendedDirectLinkIds: WorkVersionDirectLinkId[]
  recommendedDirectLinksLabel: string
  sourceKind: WorkVersionSourceKind
  sourceKindLabel: string
  sourceDecisionLabel: string
  sceneLabel: string
  structureLabel: string
  nodePathLabel: string
}

export type WorkVersionDeltaTone = 'carry' | 'change' | 'added' | 'retry'

export type WorkVersionDeltaItem = {
  id: string
  label: string
  tone: WorkVersionDeltaTone
  toneLabel: string
  summary: string
  detail?: string
}

export type WorkVersionActionDecision = {
  actionId: WorkReplayIntent
  workflowKind: 'continue' | 'retry' | 'branch'
  label: string
  summary: string
  reason: string
  caution?: string
  recommended: boolean
}

export type WorkVersionDirectLinkId = 'template' | 'guided' | 'parameters' | 'references' | 'prompt'

export type WorkVersionDirectLink = {
  id: WorkVersionDirectLinkId
  label: string
  summary: string
}

export type WorkVersionSourceKind =
  | 'text-root'
  | 'draw-batch'
  | 'work-chain'
  | 'upload-chain'
  | 'mixed-chain'
  | 'task-continue'
  | 'task-retry'

type SerializableWork = Pick<
  GalleryImage,
  | 'id'
  | 'title'
  | 'meta'
  | 'variation'
  | 'batchId'
  | 'drawIndex'
  | 'createdAt'
  | 'mode'
  | 'providerModel'
  | 'size'
  | 'quality'
  | 'snapshotId'
  | 'promptSnippet'
  | 'promptText'
  | 'generationSnapshot'
>

export type WorkReplayPayload = {
  work: SerializableWork
  autoGenerate: boolean
  origin?: WorkReplayOrigin
  intent?: WorkReplayIntent
}

type LegacyWorkReplayIntent = 'continue' | 'variant' | 'recover' | 'rerun'

function toReplayIntent(actionId?: string): WorkReplayIntent | undefined {
  if (actionId === 'continue-version' || actionId === 'retry-version' || actionId === 'branch-version') {
    return actionId
  }
  return undefined
}

function serializeWork(work: GalleryImage): SerializableWork {
  return {
    id: work.id,
    title: work.title,
    meta: work.meta,
    variation: work.variation,
    batchId: work.batchId,
    drawIndex: work.drawIndex,
    createdAt: work.createdAt,
    mode: work.mode,
    providerModel: work.providerModel,
    size: work.size,
    quality: work.quality,
    snapshotId: work.snapshotId,
    promptSnippet: work.promptSnippet,
    promptText: work.promptText,
    generationSnapshot: work.generationSnapshot,
  }
}

function parseWorkReplayPayload(value: string | null) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as WorkReplayPayload & {
      intent?: WorkReplayIntent | LegacyWorkReplayIntent
    }
    return {
      ...parsed,
      intent: normalizeWorkReplayIntent(parsed.intent),
    } as WorkReplayPayload
  } catch {
    return null
  }
}

function normalizeWorkReplayIntent(
  intent?: WorkReplayIntent | LegacyWorkReplayIntent,
): WorkReplayIntent | undefined {
  if (!intent) return undefined
  if (intent === 'continue-version' || intent === 'retry-version' || intent === 'branch-version')
    return intent
  if (intent === 'continue' || intent === 'recover') return 'continue-version'
  if (intent === 'variant') return 'branch-version'
  if (intent === 'rerun') return 'retry-version'
  return undefined
}

export function getWorkReplayIntentLabel(intent?: WorkReplayIntent, origin: WorkReplayOrigin = 'work') {
  if (intent === 'branch-version') return getStudioFlowActionLabel('branch-version')
  if (intent === 'retry-version') {
    return origin === 'task' ? '按这次参数重跑' : getStudioFlowActionLabel('retry-version')
  }
  return origin === 'task' ? getStudioFlowActionLabel('restore-controls') : getStudioFlowActionLabel('continue-version')
}

export function queueWorkReplayPayload(payload: WorkReplayPayload) {
  sessionStorage.setItem(
    workReplayStorageKey,
    JSON.stringify({
      work: serializeWork(payload.work as GalleryImage),
      autoGenerate: payload.autoGenerate,
      origin: payload.origin,
      intent: normalizeWorkReplayIntent(payload.intent),
    }),
  )
}

export function consumeWorkReplayPayload() {
  const payload = parseWorkReplayPayload(sessionStorage.getItem(workReplayStorageKey))
  sessionStorage.removeItem(workReplayStorageKey)
  return payload
}

export function buildReferenceImagesFromWork(work: GalleryImage): ReferenceImage[] {
  const references = resolveGenerationContractSnapshot(work.generationSnapshot).references?.sources ?? []
  return references.flatMap((reference, index) => {
    if (!reference.src) return []
    return [
      {
        id: crypto.randomUUID(),
        src: reference.src,
        name: reference.name || `${work.title || 'work'}-reference-${index + 1}`,
        source: reference.source,
        assetId: reference.assetId,
        assetRemoteKey: reference.assetRemoteKey,
        workId: reference.workId,
        workTitle: reference.workTitle,
      },
    ]
  })
}

function toTimestamp(value?: string | number) {
  if (!value) return Date.now()
  return new Date(value).getTime()
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function buildPromptSnippet(promptText: string, fallback: string) {
  const text = promptText.trim() || fallback.trim()
  if (!text) return ''
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

function trimTaskId(taskId?: string) {
  return taskId ? taskId.slice(0, 8) : '未记录'
}

function withParentLabel(summary: string) {
  return `父节点：${summary}`
}

function buildRequestKindLabel(mode?: GenerationMode) {
  return mode?.includes('image2image') ? '图生图' : '文生图'
}

function buildQualityLabel(quality?: string) {
  if (quality === 'low') return '低'
  if (quality === 'medium') return '中'
  if (quality === 'high') return '高'
  if (quality === 'auto') return '自动'
  return quality || '未记录'
}

function countReferenceOrigins(
  references?:
    | GenerationSnapshot['references']
    | GenerationTaskRecord['payload']['referenceImages'],
) {
  const sources = Array.isArray(references) ? references : (references?.sources ?? [])
  const workCount = sources.filter((item) => item.source === 'work').length
  const uploadCount = sources.filter((item) => item.source === 'upload').length
  return { workCount, uploadCount }
}

function buildGuidedSummaryFromContract(contract: GenerationContractSnapshot) {
  const guidedFlow = contract.guidedFlow
  if (!guidedFlow) return '追问：当前没有挂接正式追问结果'
  if (guidedFlow.summary && guidedFlow.summary !== '还没选细节') {
    return `追问：${guidedFlow.summary}（已完成 ${guidedFlow.completedQuestionCount}/${guidedFlow.totalQuestionCount} 步）`
  }
  return `追问：已挂接 ${guidedFlow.guideTitle}，但还没有形成明确摘要`
}

function buildSceneLabelFromContract(contract: GenerationContractSnapshot) {
  return contract.scene.label
}

function buildStructureLabelFromContract(
  contract: GenerationContractSnapshot,
  sourceKind: WorkVersionSourceKind,
) {
  const guideLabel = contract.guidedFlow?.guideTitle?.trim() || '未挂接追问'
  const stageLabel = contract.guidedFlow?.loopState?.stageLabel
  const versionLane =
    sourceKind === 'task-retry'
      ? '同版重试链'
      : sourceKind === 'task-continue'
        ? '继续链'
        : '版本链'
  return `结构：${contract.scene.label} · ${guideLabel}${stageLabel ? ` · ${stageLabel}` : ''} · ${versionLane}`
}

function resolveWorkGenerationContract(
  work: Pick<
    GalleryImage,
    | 'mode'
    | 'promptText'
    | 'promptSnippet'
    | 'size'
    | 'quality'
    | 'providerModel'
    | 'generationSnapshot'
  >,
) {
  return resolveGenerationContractFromWork(work)
}

function buildOriginLabel(params: {
  mode?: GenerationMode
  drawIndex?: number
  workReferenceCount: number
  uploadReferenceCount: number
}) {
  const { drawIndex, mode, uploadReferenceCount, workReferenceCount } = params
  if (workReferenceCount > 0 && uploadReferenceCount > 0) return '来自上一版 + 上传图继续改'
  if (workReferenceCount > 0)
    return workReferenceCount > 1
      ? `来自 ${workReferenceCount} 张作品参考继续改`
      : '来自上一版继续改'
  if (uploadReferenceCount > 0)
    return uploadReferenceCount > 1
      ? `来自 ${uploadReferenceCount} 张上传图继续改`
      : '来自上传图继续改'
  if (mode?.includes('draw'))
    return drawIndex === undefined ? '来自抽卡批次' : `来自抽卡批次第 ${drawIndex + 1} 张`
  return '来自文字起稿首版'
}

function resolveSourceKind(params: {
  mode?: GenerationMode
  workReferenceCount: number
  uploadReferenceCount: number
  hasTaskParent?: boolean
  retryAttempt?: number
}): WorkVersionSourceKind {
  const { hasTaskParent = false, mode, retryAttempt = 0, uploadReferenceCount, workReferenceCount } = params
  if (hasTaskParent) {
    return retryAttempt > 0 ? 'task-retry' : 'task-continue'
  }
  if (workReferenceCount > 0 && uploadReferenceCount > 0) return 'mixed-chain'
  if (workReferenceCount > 0) return 'work-chain'
  if (uploadReferenceCount > 0) return 'upload-chain'
  if (mode?.includes('draw')) return 'draw-batch'
  return 'text-root'
}

function getSourceKindLabel(kind: WorkVersionSourceKind) {
  switch (kind) {
    case 'task-retry':
      return '同版重试'
    case 'task-continue':
      return '接续上一轮'
    case 'mixed-chain':
      return '混合参考派生'
    case 'work-chain':
      return '沿作品主线'
    case 'upload-chain':
      return '上传参考派生'
    case 'draw-batch':
      return '抽卡批次变体'
    case 'text-root':
    default:
      return '文字首版'
  }
}

function buildSourceDecisionLabel(kind: WorkVersionSourceKind) {
  switch (kind) {
    case 'task-retry':
      return '来源判断：当前节点属于同一版本的重试链'
    case 'task-continue':
      return '来源判断：当前节点沿上一轮结果继续推进'
    case 'mixed-chain':
      return '来源判断：当前节点同时承接历史作品和上传参考图'
    case 'work-chain':
      return '来源判断：当前节点沿上一版作品主线继续'
    case 'upload-chain':
      return '来源判断：当前节点主要由上传参考图驱动'
    case 'draw-batch':
      return '来源判断：当前节点仍属于同一抽卡批次变体链'
    case 'text-root':
    default:
      return '来源判断：当前节点仍是文字起稿主线'
  }
}

function buildParentSummary(params: {
  mode?: GenerationMode
  drawIndex?: number
  workReferenceCount: number
  uploadReferenceCount: number
}) {
  const { drawIndex, mode, uploadReferenceCount, workReferenceCount } = params
  if (workReferenceCount > 0 && uploadReferenceCount > 0) {
    return `父节点保留了 ${workReferenceCount} 张历史作品参考，并叠加 ${uploadReferenceCount} 张上传参考图`
  }
  if (workReferenceCount > 1) return `父节点来自 ${workReferenceCount} 张历史作品参考`
  if (workReferenceCount === 1) return '父节点来自上一版作品'
  if (uploadReferenceCount > 1) return `父节点来自 ${uploadReferenceCount} 张上传参考图`
  if (uploadReferenceCount === 1) return '父节点来自 1 张上传参考图'
  if (mode?.includes('draw'))
    return drawIndex === undefined
      ? '父节点来自同一抽卡批次'
      : `父节点来自抽卡批次第 ${drawIndex + 1} 张`
  return '父节点是当前主题的文字起稿首版'
}

function buildWorkDetailLabel(
  work: Pick<
    GalleryImage,
    'variation' | 'drawIndex' | 'promptText' | 'promptSnippet' | 'mode' | 'generationSnapshot'
  >,
) {
  const contract = resolveWorkGenerationContract(work)
  const guidedSummary = contract.guidedFlow?.summary
  if (guidedSummary && guidedSummary !== '还没选细节') return `追问结果：${guidedSummary}`
  if (contract.draw?.variation || work.variation) return `这一版重点：${contract.draw?.variation ?? work.variation}`
  const drawIndex = contract.draw?.drawIndex ?? work.drawIndex
  if (contract.parameters.mode?.includes('draw')) {
    if (typeof drawIndex === 'number') return `当前是这一组里的第 ${drawIndex + 1} 张变体`
  }
  const promptSnippet = buildPromptSnippet(
    contract.prompt.workspace || work.promptText || work.promptSnippet || '',
    '',
  )
  if (promptSnippet) return `当前描述：${promptSnippet}`
  return '可以直接接着这一版继续改'
}

function buildCurrentVersionLabel(
  work: Pick<
    GalleryImage,
    'variation' | 'drawIndex' | 'promptText' | 'promptSnippet' | 'mode' | 'generationSnapshot'
  >,
) {
  const contract = resolveWorkGenerationContract(work)
  const guidedSummary = contract.guidedFlow?.summary
  if (guidedSummary && guidedSummary !== '还没选细节') return `当前版追问：${guidedSummary}`
  if (contract.draw?.variation || work.variation)
    return `当前版重点：${contract.draw?.variation ?? work.variation}`
  const drawIndex = contract.draw?.drawIndex ?? work.drawIndex
  if (contract.parameters.mode?.includes('draw')) {
    if (typeof drawIndex === 'number') return `当前版位于这组里的第 ${drawIndex + 1} 张变体`
  }
  const promptSnippet = buildPromptSnippet(
    contract.prompt.workspace || work.promptText || work.promptSnippet || '',
    '',
  )
  if (promptSnippet) return `当前版描述：${promptSnippet}`
  return '当前版可以直接继续调整'
}

function buildGuidedSummary(snapshot?: GenerationSnapshot | null, fallback?: { hasReferences?: boolean }) {
  const canonicalSnapshot = resolveGenerationSnapshotRecord(snapshot, {
    hasReferences: fallback?.hasReferences,
  })
  const contract = canonicalSnapshot.contract
  if (contract.guidedFlow?.loopState?.runLabel) {
    return `追问：${contract.guidedFlow.loopState.runLabel}；${contract.guidedFlow.summary || '当前还没有形成明确摘要'}`
  }
  return buildGuidedSummaryFromContract(contract)
}

function buildParameterSummary(params: {
  mode?: GenerationMode
  size?: string
  quality?: string
  model?: string
  draw?: GenerationDrawSnapshot
}) {
  const tokens = [
    buildRequestKindLabel(params.mode),
    params.size || '未记录尺寸',
    `质量 ${buildQualityLabel(params.quality)}`,
    params.model ? `模型 ${params.model}` : '',
    params.draw?.count ? `${params.draw.count} 次抽卡` : '',
  ].filter(Boolean)
  return `参数：${tokens.join(' · ')}`
}

function buildPromptContextLabel(params: {
  requestPrompt?: string
  workspacePrompt?: string
  fallback?: string
}) {
  const requestSummary = buildPromptSnippet(params.requestPrompt || '', params.fallback || '')
  const workspaceSummary = buildPromptSnippet(params.workspacePrompt || '', params.fallback || '')
  if (requestSummary && workspaceSummary && requestSummary !== workspaceSummary) {
    return `请求：${requestSummary}；工作区：${workspaceSummary}`
  }
  if (requestSummary) return `请求：${requestSummary}`
  if (workspaceSummary) return `工作区：${workspaceSummary}`
  return '请求：未记录 Prompt 摘要'
}

function buildReferenceContextLabel(params: {
  expectedReferenceCount: number
  restorableReferenceCount: number
  workReferenceCount: number
  uploadReferenceCount: number
}) {
  const sourceTokens = [
    params.workReferenceCount ? `历史作品 ${params.workReferenceCount} 张` : '',
    params.uploadReferenceCount ? `上传图 ${params.uploadReferenceCount} 张` : '',
  ].filter(Boolean)

  if (params.expectedReferenceCount > 0) {
    return `参考：恢复 ${params.restorableReferenceCount}/${params.expectedReferenceCount}${
      sourceTokens.length ? ` · ${sourceTokens.join(' + ')}` : ''
    }`
  }
  if (sourceTokens.length) return `参考：当前无文件快照，但链路来自 ${sourceTokens.join(' + ')}`
  return '参考：当前版本没有参考图依赖'
}

function getDeltaToneLabel(tone: WorkVersionDeltaTone) {
  switch (tone) {
    case 'added':
      return '新增'
    case 'retry':
      return '重试'
    case 'carry':
      return '沿用'
    case 'change':
    default:
      return '变化'
  }
}

function normalizeCompareText(value?: string) {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function summarizePromptDelta(requestPrompt: string, workspacePrompt: string) {
  const request = normalizeCompareText(requestPrompt)
  const workspace = normalizeCompareText(workspacePrompt)
  if (!request && !workspace) {
    return {
      tone: 'carry' as const,
      summary: 'Prompt 未记录新增变化',
      detail: '当前快照没有可对照的请求或工作区 Prompt 摘要。',
    }
  }
  if (request && workspace && request !== workspace) {
    return {
      tone: 'change' as const,
      summary: 'Prompt 已从工作区再整理后发出',
      detail: `请求 ${request.length} 字，工作区 ${workspace.length} 字，说明这一版在执行前又做了一次整理。`,
    }
  }
  const text = request || workspace
  return {
    tone: 'carry' as const,
    summary: `Prompt 主干沿用当前描述（${text.length} 字）`,
    detail: '请求 Prompt 与工作区主描述保持同一主干，适合继续围绕这一版微调。',
  }
}

function summarizeGuidedDelta(snapshot?: GenerationSnapshot | null) {
  const guidedFlow = resolveGenerationContractSnapshot(snapshot).guidedFlow
  if (!guidedFlow) {
    return {
      tone: 'carry' as const,
      summary: '本轮没有挂接正式追问链',
      detail: '当前版本主要靠 Prompt 和参数推进，没有额外追问结构承接。',
    }
  }
  const completed = guidedFlow.completedQuestionCount
  const total = guidedFlow.totalQuestionCount
  const sourceLabel =
    guidedFlow.sourceType === 'template'
      ? `模板「${guidedFlow.templateTitle || guidedFlow.guideTitle}」`
      : guidedFlow.sourceType === 'result-action'
        ? '结果动作追问'
        : '追问链'
  const stepSummary =
    guidedFlow.steps.length > 0
      ? guidedFlow.steps
          .slice(0, 2)
          .map((step) => `${step.questionTitle}=${step.optionLabel}`)
          .join('；')
      : guidedFlow.summary
  return {
    tone: completed > 0 ? ('change' as const) : ('added' as const),
    summary: `${sourceLabel}承接 ${completed}/${total} 步`,
    detail: stepSummary || '当前追问已挂接，但还没有形成更细的选项摘要。',
  }
}

function summarizeParameterDelta(params: {
  mode?: GenerationMode
  size?: string
  quality?: string
  model?: string
  draw?: GenerationDrawSnapshot
}) {
  const modeLabel = buildRequestKindLabel(params.mode)
  const drawSummary = params.draw?.count
    ? `${params.draw.count} 次抽卡 · ${params.draw.strategy}`
    : '单次生成'
  return {
    tone: params.draw?.count ? ('change' as const) : ('carry' as const),
    summary: `${modeLabel} · ${params.size || '未记录尺寸'} · 质量 ${buildQualityLabel(params.quality)}`,
    detail: `${drawSummary}${params.model ? ` · 模型 ${params.model}` : ''}`,
  }
}

function summarizeReferenceDelta(params: {
  expectedReferenceCount: number
  restorableReferenceCount: number
  workReferenceCount: number
  uploadReferenceCount: number
}) {
  if (params.expectedReferenceCount <= 0) {
    return {
      tone: 'carry' as const,
      summary: '当前链路不依赖参考图',
      detail: '这一版主要靠文字和参数继续推进。',
    }
  }
  const sourceParts = [
    params.workReferenceCount ? `作品 ${params.workReferenceCount} 张` : '',
    params.uploadReferenceCount ? `上传 ${params.uploadReferenceCount} 张` : '',
  ].filter(Boolean)
  const missing = Math.max(0, params.expectedReferenceCount - params.restorableReferenceCount)
  return {
    tone: missing > 0 ? ('change' as const) : ('carry' as const),
    summary: `参考图恢复 ${params.restorableReferenceCount}/${params.expectedReferenceCount}`,
    detail: `${sourceParts.join(' + ') || '参考图来源未细分'}${missing > 0 ? `，仍缺 ${missing} 张` : '，可以直接沿用'}`,
  }
}

function summarizeStructureDelta(params: {
  sceneLabel: string
  sourceKind: WorkVersionSourceKind
  guideLabel: string
}) {
  const laneLabel =
    params.sourceKind === 'task-retry'
      ? '同版重试链'
      : params.sourceKind === 'task-continue'
        ? '继续链'
        : params.sourceKind === 'mixed-chain'
          ? '混合派生链'
          : params.sourceKind === 'work-chain'
            ? '作品主线'
            : params.sourceKind === 'upload-chain'
              ? '上传参考链'
              : params.sourceKind === 'draw-batch'
                ? '抽卡变体链'
                : '文字首版链'
  return {
    tone:
      params.sourceKind === 'task-retry'
        ? ('retry' as const)
        : params.guideLabel === '未挂接追问'
          ? ('carry' as const)
          : ('change' as const),
    summary: `${params.sceneLabel} · ${params.guideLabel}`,
    detail: `当前节点位于${laneLabel}。`,
  }
}

function buildVersionDeltaItems(params: {
  sourceKind: WorkVersionSourceKind
  sceneLabel: string
  snapshot?: GenerationSnapshot | null
  requestPrompt?: string
  workspacePrompt?: string
  expectedReferenceCount: number
  restorableReferenceCount: number
  workReferenceCount: number
  uploadReferenceCount: number
  mode?: GenerationMode
  size?: string
  quality?: string
  model?: string
  draw?: GenerationDrawSnapshot
  retryAttempt?: number
}) {
  const canonicalSnapshot = resolveGenerationSnapshotRecord(params.snapshot, {
    requestPrompt: params.requestPrompt,
    workspacePrompt: params.workspacePrompt,
    mode: params.mode,
    size: params.size,
    quality: params.quality,
    model: params.model,
    draw: params.draw,
    hasReferences: params.expectedReferenceCount > 0,
  })
  const contract = canonicalSnapshot.contract
  const guideLabel = contract.guidedFlow?.guideTitle?.trim() || '未挂接追问'
  const promptDelta = summarizePromptDelta(contract.prompt.request, contract.prompt.workspace)
  const guidedDelta = summarizeGuidedDelta(canonicalSnapshot)
  const parameterDelta = summarizeParameterDelta({
    mode: contract.parameters.mode,
    size: contract.parameters.size,
    quality: contract.parameters.quality,
    model: contract.parameters.model,
    draw: contract.draw,
  })
  const referenceDelta = summarizeReferenceDelta({
    expectedReferenceCount: params.expectedReferenceCount,
    restorableReferenceCount: params.restorableReferenceCount,
    workReferenceCount: params.workReferenceCount,
    uploadReferenceCount: params.uploadReferenceCount,
  })
  const structureDelta = summarizeStructureDelta({
    sceneLabel: params.sceneLabel,
    sourceKind: params.sourceKind,
    guideLabel,
  })

  const items: WorkVersionDeltaItem[] = [
    {
      id: 'structure',
      label: '结构',
      tone: structureDelta.tone,
      toneLabel: getDeltaToneLabel(structureDelta.tone),
      summary: structureDelta.summary,
      detail: structureDelta.detail,
    },
    {
      id: 'guided',
      label: '追问',
      tone: guidedDelta.tone,
      toneLabel: getDeltaToneLabel(guidedDelta.tone),
      summary: guidedDelta.summary,
      detail: guidedDelta.detail,
    },
    {
      id: 'parameters',
      label: '参数',
      tone: parameterDelta.tone,
      toneLabel: getDeltaToneLabel(parameterDelta.tone),
      summary: parameterDelta.summary,
      detail: parameterDelta.detail,
    },
    {
      id: 'references',
      label: '参考',
      tone: referenceDelta.tone,
      toneLabel: getDeltaToneLabel(referenceDelta.tone),
      summary: referenceDelta.summary,
      detail: referenceDelta.detail,
    },
    {
      id: 'prompt',
      label: 'Prompt',
      tone: promptDelta.tone,
      toneLabel: getDeltaToneLabel(promptDelta.tone),
      summary: promptDelta.summary,
      detail: promptDelta.detail,
    },
  ]

  if ((params.retryAttempt ?? 0) > 0) {
    items.unshift({
      id: 'retry',
      label: '重试链',
      tone: 'retry',
      toneLabel: getDeltaToneLabel('retry'),
      summary: `当前是第 ${(params.retryAttempt ?? 0) + 1} 次同版尝试`,
      detail: '会沿用同一来源语义，但执行稳定性和结果噪声可能与上一轮不同。',
    })
  }

  return items
}

function buildDeltaHeadline(sourceKind: WorkVersionSourceKind, items: WorkVersionDeltaItem[]) {
  const changedItems = items.filter((item) => item.tone !== 'carry')
  if (sourceKind === 'task-retry') {
    return changedItems[0]?.summary || '当前版主要体现为同版重试'
  }
  if (!changedItems.length) return '当前版主要沿用父节点结构，可直接继续细调'
  return `这一版主要变化：${changedItems
    .slice(0, 2)
    .map((item) => `${item.label}${item.tone === 'added' ? '新增' : item.tone === 'retry' ? '重试' : '变化'}`)
    .join(' + ')}`
}

function buildParentDeltaLabel(sourceKind: WorkVersionSourceKind, parentSummary: string, currentLabel: string) {
  if (sourceKind === 'task-retry') {
    return `和父节点比：保留同一版目标，但改成 ${currentLabel.replace(/^当前任务：/, '')}`
  }
  if (sourceKind === 'task-continue') {
    return `和父节点比：沿上一轮结果继续推进，当前重点是 ${currentLabel.replace(/^当前(?:版|任务)(?:追问|重点|描述)：?/, '')}`
  }
  return `和父节点比：从「${parentSummary}」推进到「${currentLabel}」`
}

function buildSourceDeltaLabel(sourceKind: WorkVersionSourceKind, ancestorLabel: string) {
  if (sourceKind === 'task-retry') return '和来源版比：当前仍在同一来源快照上做执行重试'
  if (sourceKind === 'task-continue') return '和来源版比：当前已经在上一轮结果上继续延长版本链'
  return `和来源版比：${ancestorLabel.replace(/^更早来源：/, '')}`
}

function buildQuickDeltaLabels(items: WorkVersionDeltaItem[]) {
  return items
    .filter((item) => item.tone !== 'carry')
    .slice(0, 4)
    .map((item) => `${item.label}${item.tone === 'retry' ? '重试' : item.tone === 'added' ? '新增' : '变化'}`)
}

function getRecommendedReplayAction(sourceKind: WorkVersionSourceKind, items: WorkVersionDeltaItem[]) {
  if (sourceKind === 'task-retry') return 'retry-version' as const
  const shiftedCount = items.filter((item) => item.tone !== 'carry').length
  const referenceItem = items.find((item) => item.id === 'references')
  const promptItem = items.find((item) => item.id === 'prompt')
  if (referenceItem?.tone === 'change' && shiftedCount <= 2) return 'continue-version' as const
  if (promptItem?.tone === 'change' && shiftedCount >= 3) return 'branch-version' as const
  if (sourceKind === 'mixed-chain' || sourceKind === 'upload-chain' || sourceKind === 'draw-batch') {
    return 'branch-version' as const
  }
  if (sourceKind === 'task-continue') return 'continue-version' as const
  return shiftedCount >= 3 ? 'branch-version' : 'continue-version'
}

function buildActionDecisionReason(
  actionId: WorkReplayIntent,
  sourceKind: WorkVersionSourceKind,
  items: WorkVersionDeltaItem[],
) {
  const changedItems = items.filter((item) => item.tone !== 'carry').map((item) => item.label)
  const changedSummary = changedItems.length ? changedItems.join(' / ') : '当前主干'
  if (actionId === 'retry-version') {
    return `当前仍属于同版重试链，优先保留同一目标再试一次；这轮主要判断点仍是 ${changedSummary}。`
  }
  if (actionId === 'branch-version') {
    return `当前链路已经带出新的变化面，继续硬贴原链效率不高；更适合把 ${changedSummary} 当成新分支起点。`
  }
  if (sourceKind === 'task-continue') {
    return `当前节点沿上一轮结果继续推进，优先接着现有主线细调；先围绕 ${changedSummary} 继续更顺手。`
  }
  return `当前节点还贴着已有版本主线，优先继续这一版最快；主要先盯住 ${changedSummary}。`
}

function buildActionDecisions(params: {
  origin: WorkReplayOrigin
  sourceKind: WorkVersionSourceKind
  items: WorkVersionDeltaItem[]
  currentLabel: string
  guidedFlowLabel: string
  parameterLabel: string
  referenceLabel: string
}): WorkVersionActionDecision[] {
  const recommendedActionId = getRecommendedReplayAction(params.sourceKind, params.items)
  const baseByAction: Array<Pick<WorkVersionActionDecision, 'actionId' | 'workflowKind' | 'summary' | 'caution'>> = [
    {
      actionId: 'continue-version',
      workflowKind: 'continue',
      summary: `继续当前主线：先沿用 ${params.currentLabel.replace(/^当前(?:版|任务)/, '')}`,
      caution: params.referenceLabel.includes('恢复') ? undefined : '回流前先确认参考链是否完整。',
    },
    {
      actionId: 'retry-version',
      workflowKind: 'retry',
      summary: `保留当前目标重试：优先按 ${params.parameterLabel.replace(/^参数：/, '')} 再跑一轮`,
      caution: '更适合处理结果不稳、执行波动或失败恢复，不适合承接大改动。',
    },
    {
      actionId: 'branch-version',
      workflowKind: 'branch',
      summary: `从这一版分叉：把 ${params.guidedFlowLabel.replace(/^追问：/, '')} 和当前参数当作父版基线`,
      caution: '一旦继续改 Prompt、参数或参考图，这轮会自然成为新分支。',
    },
  ]

  return baseByAction.map((entry) => ({
    actionId: entry.actionId,
    workflowKind: entry.workflowKind,
    label: getWorkReplayIntentLabel(entry.actionId, params.origin),
    summary: entry.summary,
    reason: buildActionDecisionReason(entry.actionId, params.sourceKind, params.items),
    caution: entry.caution,
    recommended: entry.actionId === recommendedActionId,
  }))
}

function buildDecisionSummary(actionId: WorkReplayIntent, currentLabel: string, sourceKindLabel: string) {
  if (actionId === 'retry-version') {
    return `当前更适合重试这一版，先保留 ${sourceKindLabel} 的目标不变。`
  }
  if (actionId === 'branch-version') {
    return `当前更适合从这一版分叉，把这轮变化直接沉成新的版本支线。`
  }
  return `当前更适合继续这一版，沿 ${currentLabel.replace(/^当前(?:版|任务)/, '')} 直接往下细调。`
}

function buildDirectLinks(params: {
  contract: GenerationContractSnapshot
  guidedFlowLabel: string
  parameterLabel: string
  referenceLabel: string
  promptLabel: string
  sceneLabel: string
}): WorkVersionDirectLink[] {
  const guidedFlow = params.contract.guidedFlow
  const templateSummary =
    guidedFlow?.templateTitle || guidedFlow?.templateId
      ? `模板：${guidedFlow?.templateTitle || guidedFlow?.guideTitle || guidedFlow?.templateId}`
      : `模板：当前未挂模板，直接按「${params.sceneLabel}」场景链继续`
  const guidedSummary =
    guidedFlow?.steps.length
      ? `追问：${guidedFlow.steps
          .slice(0, 2)
          .map((step) => `${step.questionTitle}=${step.optionLabel}`)
          .join('；')}`
      : params.guidedFlowLabel
  return [
    {
      id: 'template',
      label: '模板直达',
      summary: templateSummary,
    },
    {
      id: 'guided',
      label: '追问直达',
      summary: guidedSummary,
    },
    {
      id: 'parameters',
      label: '参数直达',
      summary: params.parameterLabel,
    },
    {
      id: 'references',
      label: '参考直达',
      summary: params.referenceLabel,
    },
    {
      id: 'prompt',
      label: 'Prompt 直达',
      summary: params.promptLabel,
    },
  ]
}

function buildRecommendedDirectLinkIds(
  actionId: WorkReplayIntent,
  contract: GenerationContractSnapshot,
): WorkVersionDirectLinkId[] {
  const hasGuidedFlow = Boolean(contract.guidedFlow)
  if (actionId === 'retry-version') {
    return ['parameters', 'references', 'prompt']
  }
  if (actionId === 'branch-version') {
    return hasGuidedFlow ? ['guided', 'prompt', 'parameters'] : ['prompt', 'parameters', 'references']
  }
  return hasGuidedFlow ? ['guided', 'parameters', 'references'] : ['parameters', 'prompt', 'references']
}

function buildRecommendedDirectLinksLabel(
  directLinks: WorkVersionDirectLink[],
  recommendedIds: WorkVersionDirectLinkId[],
) {
  const labels = recommendedIds
    .map((id) => directLinks.find((item) => item.id === id)?.label.replace(/\s*直达$/, ''))
    .filter(Boolean)
  return labels.length ? `先看：${labels.join(' / ')}` : '先看：参数 / 参考'
}

function buildSceneLabel(snapshot?: GenerationSnapshot | null, hasReferences = false) {
  return buildSceneLabelFromContract(
    resolveGenerationSnapshotRecord(snapshot, { hasReferences }).contract,
  )
}

function buildStructureLabel(params: {
  snapshot?: GenerationSnapshot | null
  hasReferences: boolean
  sourceKind: WorkVersionSourceKind
}) {
  return buildStructureLabelFromContract(
    resolveGenerationSnapshotRecord(params.snapshot, {
      hasReferences: params.hasReferences,
    }).contract,
    params.sourceKind,
  )
}

function buildAncestorSummary(params: {
  mode?: GenerationMode
  drawIndex?: number
  workReferenceCount: number
  uploadReferenceCount: number
}) {
  const { drawIndex, mode, uploadReferenceCount, workReferenceCount } = params
  if (workReferenceCount > 0 && uploadReferenceCount > 0)
    return '更早来源：这条链同时承接历史作品参考和上传参考图基线'
  if (workReferenceCount > 1) return `更早来源：这条链仍挂在 ${workReferenceCount} 张历史作品参考上`
  if (workReferenceCount === 1) return '更早来源：这条链仍挂在上一版作品主线上'
  if (uploadReferenceCount > 1) return `更早来源：这条链仍依赖 ${uploadReferenceCount} 张上传参考图`
  if (uploadReferenceCount === 1) return '更早来源：这条链仍依赖 1 张上传参考图基线'
  if (mode?.includes('draw'))
    return drawIndex === undefined
      ? '更早来源：当前仍沿用同一抽卡批次语义'
      : `更早来源：当前仍属于抽卡批次第 ${drawIndex + 1} 张的延续链`
  return '更早来源：当前仍在这个主题的首版主线上继续推进'
}

function buildNodePathLabel(params: {
  sourceKind: WorkVersionSourceKind
  parentSummary: string
  currentLabel: string
  ancestorLabel: string
}) {
  const parent = params.parentSummary.replace(/^父节点：?/, '').trim()
  const current = params.currentLabel.replace(/^当前(?:版|任务)(?:追问|重点|位于这一组里的|描述)?：?/, '').trim()
  const ancestor = params.ancestorLabel.replace(/^更早来源：/, '').trim()
  const sourceHead =
    params.sourceKind === 'task-retry'
      ? '同版重试'
      : params.sourceKind === 'task-continue'
        ? '上一轮结果'
        : params.sourceKind === 'mixed-chain'
          ? '历史作品 + 上传图'
          : params.sourceKind === 'work-chain'
            ? '上一版作品'
            : params.sourceKind === 'upload-chain'
              ? '上传参考图'
              : params.sourceKind === 'draw-batch'
                ? '抽卡批次'
                : '文字起稿'
  return `节点链：${sourceHead} → ${parent || ancestor} → ${current || '当前节点'}`
}

function readParentSummaryFromReferenceNote(note?: string) {
  if (!note) return ''
  const marker = '父节点：'
  const start = note.indexOf(marker)
  if (start < 0) return ''
  const remainder = note.slice(start + marker.length).trim()
  const endIndex = remainder.indexOf('。')
  return endIndex >= 0 ? remainder.slice(0, endIndex).trim() : remainder
}

function decorateReplayGuidedFlow(params: {
  guidedFlow?: GenerationSnapshot['guidedFlow'] | null
  sourceType: 'work-replay' | 'task-replay'
  actionId?: WorkReplayIntent
}) {
  const { guidedFlow } = params
  if (!guidedFlow) return null
  const actionPlan = normalizeConsumerGuidedFlowActionPlan({
    defaultActionId: guidedFlow.defaultActionId,
    actionPriority:
      guidedFlow.actionPriority ?? guidedFlow.runtimeDecision?.result.actionPriority ?? [],
  })
  return rebaseConsumerGuidedFlowSnapshot(guidedFlow, {
    sourceType: params.sourceType,
    stage: 'version-replay',
    actionId: params.actionId,
    defaultActionId: actionPlan.defaultActionId,
    actionPriority: actionPlan.actionPriority,
  })
}

function buildCanonicalGenerationSnapshot(input: {
  contract: GenerationContractSnapshot
  snapshot?: Partial<GenerationSnapshot> | null
  id?: string
  createdAt?: number
  apiUrl?: string
  requestUrl?: string
}) {
  return resolveGenerationSnapshotRecord(input.snapshot, {
    sourceContract: input.contract,
    id: input.id,
    createdAt: input.createdAt,
    apiUrl: input.apiUrl ?? '',
    requestUrl: input.requestUrl ?? '',
  })
}

function buildWorkContext(
  work: Pick<
    GalleryImage,
    | 'mode'
    | 'drawIndex'
    | 'variation'
    | 'promptText'
    | 'promptSnippet'
    | 'size'
    | 'quality'
    | 'providerModel'
    | 'generationSnapshot'
  >,
) {
  const contract = resolveWorkGenerationContract(work)
  const expectedReferenceCount = contract.references?.count ?? 0
  const restorableReferenceCount = (contract.references?.sources ?? []).filter(
    (item) => Boolean(item.src),
  ).length
  const originCounts = countReferenceOrigins(contract.references)
  const parentSummary =
    readParentSummaryFromReferenceNote(contract.references?.note) ||
    buildParentSummary({
      mode: contract.parameters.mode,
      drawIndex: contract.draw?.drawIndex ?? work.drawIndex,
      workReferenceCount: originCounts.workCount,
      uploadReferenceCount: originCounts.uploadCount,
    })

  const sourceKind = resolveSourceKind({
    mode: contract.parameters.mode,
    workReferenceCount: originCounts.workCount,
    uploadReferenceCount: originCounts.uploadCount,
  })
  const ancestorSummary = buildAncestorSummary({
    mode: contract.parameters.mode,
    drawIndex: contract.draw?.drawIndex ?? work.drawIndex,
    workReferenceCount: originCounts.workCount,
    uploadReferenceCount: originCounts.uploadCount,
  })
  const currentLabel = buildCurrentVersionLabel({
    variation: contract.draw?.variation ?? work.variation,
    drawIndex: contract.draw?.drawIndex ?? work.drawIndex,
    promptText: contract.prompt.workspace,
    promptSnippet: work.promptSnippet,
    mode: contract.parameters.mode,
    generationSnapshot: work.generationSnapshot,
  })
  const sceneLabel = buildSceneLabel(work.generationSnapshot, expectedReferenceCount > 0)
  const deltaItems = buildVersionDeltaItems({
    sourceKind,
    sceneLabel,
    snapshot: work.generationSnapshot,
    requestPrompt: contract.prompt.request,
    workspacePrompt: contract.prompt.workspace,
    expectedReferenceCount,
    restorableReferenceCount,
    workReferenceCount: originCounts.workCount,
    uploadReferenceCount: originCounts.uploadCount,
    mode: contract.parameters.mode,
    size: contract.parameters.size,
    quality: contract.parameters.quality,
    model: contract.parameters.model,
    draw: contract.draw,
  })

  return {
    contract,
    expectedReferenceCount,
    restorableReferenceCount,
    originCounts,
    sourceKind,
    parentSummary,
    currentLabel,
    detailLabel: buildWorkDetailLabel({
      variation: contract.draw?.variation ?? work.variation,
      drawIndex: contract.draw?.drawIndex ?? work.drawIndex,
      promptText: contract.prompt.workspace,
      promptSnippet: work.promptSnippet,
      mode: contract.parameters.mode,
      generationSnapshot: work.generationSnapshot,
    }),
    ancestorSummary,
    guidedSummary: buildGuidedSummary(work.generationSnapshot, {
      hasReferences: expectedReferenceCount > 0,
    }),
    parameterSummary: buildParameterSummary({
      mode: contract.parameters.mode,
      size: contract.parameters.size,
      quality: contract.parameters.quality,
      model: contract.parameters.model,
      draw: contract.draw,
    }),
    promptLabel: buildPromptContextLabel({
      requestPrompt: contract.prompt.request,
      workspacePrompt: contract.prompt.workspace,
      fallback: work.promptSnippet,
    }),
    sceneLabel,
    structureLabel: buildStructureLabel({
      snapshot: work.generationSnapshot,
      hasReferences: expectedReferenceCount > 0,
      sourceKind,
    }),
    nodePathLabel: buildNodePathLabel({
      sourceKind,
      parentSummary,
      currentLabel,
      ancestorLabel: ancestorSummary,
    }),
    deltaItems,
    deltaHeadline: buildDeltaHeadline(sourceKind, deltaItems),
    parentDeltaLabel: buildParentDeltaLabel(sourceKind, parentSummary, currentLabel),
    sourceDeltaLabel: buildSourceDeltaLabel(sourceKind, ancestorSummary),
    quickDeltaLabels: buildQuickDeltaLabels(deltaItems),
  }
}

function buildTaskReferenceSnapshot(
  task: GenerationTaskRecord,
): GenerationReferenceSnapshot | undefined {
  const references = task.payload.referenceImages ?? []
  const savedCount = references.filter((item) => Boolean(item.src)).length
  const parentSummary = task.parentTaskId
    ? task.retryAttempt > 0
      ? `任务 ${trimTaskId(task.parentTaskId)} 的同一版结果`
      : `任务 ${trimTaskId(task.parentTaskId)} 的上一轮结果`
    : buildParentSummary({
        mode: task.payload.mode,
        drawIndex: task.payload.draw?.drawIndex ?? task.drawIndex,
        workReferenceCount: references.filter((item) => item.source === 'work').length,
        uploadReferenceCount: references.filter((item) => item.source === 'upload').length,
      })

  if (!references.length) {
    return {
      count: 0,
      sources: [],
      note: `当前没有保存参考图。${withParentLabel(parentSummary)}。`,
    }
  }

  return {
    count: references.length,
    sources: references.map((item) => ({
      source: item.source,
      name: item.name,
      assetId: item.assetId,
      assetRemoteKey: item.assetRemoteKey,
      src: item.src,
    })),
    note:
      savedCount === references.length
        ? `任务快照已保存全部参考图。${withParentLabel(parentSummary)}。`
        : `任务快照仅保存了 ${savedCount}/${references.length} 张参考图。${withParentLabel(parentSummary)}。`,
  }
}

function readTaskGenerationSnapshot(
  task: GenerationTaskRecord,
  resultWork?: GalleryImage,
): GenerationSnapshot | undefined {
  if (resultWork?.generationSnapshot) return resultWork.generationSnapshot
  if (isObject(task.result?.generationSnapshot))
    return task.result.generationSnapshot as GenerationSnapshot
  return undefined
}

function resolveReplayScene(snapshot?: GenerationSnapshot, hasReferences = false) {
  return resolveGenerationContractSnapshot(snapshot, { hasReferences }).scene
}

export function buildTaskReplayWork(
  task: GenerationTaskRecord,
  resultWork?: GalleryImage,
): GalleryImage {
  const existingSnapshot = readTaskGenerationSnapshot(task, resultWork)
  const hasReferences = Boolean(task.payload.referenceImages?.length)
  const existingContract = existingSnapshot
    ? resolveGenerationSnapshotRecord(existingSnapshot, { hasReferences }).contract
    : null
  const taskReferenceSnapshot = buildTaskReferenceSnapshot(task)
  const fallbackSnapshotId =
    task.result?.snapshotId ?? resultWork?.snapshotId ?? task.payload.snapshotId ?? crypto.randomUUID()
  const fallbackCreatedAt = toTimestamp(task.updatedAt || task.createdAt)

  const generationContract = resolveGenerationContractFromTask(task, {
    snapshot: existingSnapshot,
    scene: resolveReplayScene(resultWork?.generationSnapshot, hasReferences),
    references: taskReferenceSnapshot,
    draw: task.payload.draw as GenerationDrawSnapshot | undefined,
    guidedFlow: existingContract?.guidedFlow ?? null,
    mode: task.result?.mode ?? resultWork?.mode ?? task.payload.mode,
    size: task.result?.size ?? resultWork?.size ?? task.payload.size,
    quality: task.result?.quality ?? resultWork?.quality ?? task.payload.quality,
    model: task.result?.providerModel ?? resultWork?.providerModel ?? task.payload.model,
  })

  const replayGuidedFlow = decorateReplayGuidedFlow({
    guidedFlow: generationContract.guidedFlow,
    sourceType: task.parentTaskId ? 'task-replay' : 'work-replay',
    actionId: toReplayIntent(generationContract.guidedFlow?.actionId),
  })

  const generationSnapshot = buildCanonicalGenerationSnapshot({
    contract: {
      ...generationContract,
      guidedFlow: replayGuidedFlow,
    },
    snapshot: existingSnapshot,
    id: fallbackSnapshotId,
    createdAt: fallbackCreatedAt,
    apiUrl: existingSnapshot?.apiUrl ?? '',
    requestUrl: existingSnapshot?.requestUrl ?? '',
  })
  const snapshotContract = generationSnapshot.contract

  return {
    id: resultWork?.id ?? task.result?.workId ?? task.id,
    title:
      resultWork?.title ??
      task.result?.title ??
      task.payload.title ??
      `任务 ${task.id.slice(0, 8)}`,
    src: resultWork?.src ?? task.result?.imageUrl,
    meta: resultWork?.meta ?? task.result?.meta ?? task.payload.meta,
    variation:
      resultWork?.variation ??
      task.result?.variation ??
      task.variation ??
      task.payload.draw?.variation,
    batchId:
      resultWork?.batchId ?? task.result?.batchId ?? task.batchId ?? task.payload.draw?.batchId,
    drawIndex:
      resultWork?.drawIndex ??
      task.result?.drawIndex ??
      task.drawIndex ??
      task.payload.draw?.drawIndex,
    createdAt: resultWork?.createdAt ?? toTimestamp(task.createdAt),
    mode:
      snapshotContract.parameters.mode ??
      resultWork?.mode ??
      task.result?.mode ??
      task.payload.mode,
    providerModel:
      snapshotContract.parameters.model ??
      resultWork?.providerModel ??
      task.result?.providerModel ??
      task.payload.model,
    size:
      snapshotContract.parameters.size ??
      resultWork?.size ??
      task.result?.size ??
      task.payload.size,
    quality:
      snapshotContract.parameters.quality ??
      resultWork?.quality ??
      task.result?.quality ??
      task.payload.quality,
    snapshotId:
      resultWork?.snapshotId ??
      task.result?.snapshotId ??
      task.payload.snapshotId ??
      generationSnapshot.id,
    generationTaskId: task.id,
    generationSnapshot,
    promptText:
      snapshotContract.prompt.request ??
      resultWork?.promptText ??
      task.result?.promptText ??
      task.payload.requestPrompt,
    promptSnippet:
      buildPromptSnippet(
        snapshotContract.prompt.request ||
          resultWork?.promptText ||
          task.result?.promptText ||
          task.payload.requestPrompt,
        resultWork?.promptSnippet ?? task.result?.promptSnippet ?? task.payload.title,
      ),
    error: task.errorMessage,
    retryable: task.retryable,
  }
}

export function getWorkVersionSourceSummary(
  work: Pick<
    GalleryImage,
    | 'mode'
    | 'drawIndex'
    | 'variation'
    | 'promptText'
    | 'promptSnippet'
    | 'size'
    | 'quality'
    | 'providerModel'
    | 'generationSnapshot'
  >,
): WorkVersionSourceSummary {
  const context = buildWorkContext(work)
  const guidedFlowLabel = context.guidedSummary
  const parameterLabel = context.parameterSummary
  const referenceLabel = buildReferenceContextLabel({
    expectedReferenceCount: context.expectedReferenceCount,
    restorableReferenceCount: context.restorableReferenceCount,
    workReferenceCount: context.originCounts.workCount,
    uploadReferenceCount: context.originCounts.uploadCount,
  })
  const actionDecisions = buildActionDecisions({
    origin: 'work',
    sourceKind: context.sourceKind,
    items: context.deltaItems,
    currentLabel: context.currentLabel,
    guidedFlowLabel,
    parameterLabel,
    referenceLabel,
  })
  const recommendedAction = actionDecisions.find((item) => item.recommended) ?? actionDecisions[0]
  const directLinks = buildDirectLinks({
    contract: context.contract,
    guidedFlowLabel,
    parameterLabel,
    referenceLabel,
    promptLabel: context.promptLabel,
    sceneLabel: context.sceneLabel,
  })
  const recommendedDirectLinkIds = buildRecommendedDirectLinkIds(
    recommendedAction.actionId,
    context.contract,
  )
  return {
    originLabel: buildOriginLabel({
      mode: context.contract.parameters.mode ?? work.mode ?? work.generationSnapshot?.mode,
      drawIndex: context.contract.draw?.drawIndex ?? work.drawIndex,
      workReferenceCount: context.originCounts.workCount,
      uploadReferenceCount: context.originCounts.uploadCount,
    }),
    detailLabel: context.detailLabel,
    parentLabel: withParentLabel(context.parentSummary),
    currentLabel: context.currentLabel,
    ancestorLabel: context.ancestorSummary,
    guidedFlowLabel,
    parameterLabel,
    referenceLabel,
    promptLabel: context.promptLabel,
    deltaHeadline: context.deltaHeadline,
    parentDeltaLabel: context.parentDeltaLabel,
    sourceDeltaLabel: context.sourceDeltaLabel,
    quickDeltaLabels: context.quickDeltaLabels,
    deltaItems: context.deltaItems,
    decisionSummary: buildDecisionSummary(
      recommendedAction.actionId,
      context.currentLabel,
      getSourceKindLabel(context.sourceKind),
    ),
    recommendedActionId: recommendedAction.actionId,
    recommendedActionLabel: recommendedAction.label,
    recommendedActionSummary: recommendedAction.summary,
    actionDecisionReason: recommendedAction.reason,
    actionDecisions,
    directLinks,
    recommendedDirectLinkIds,
    recommendedDirectLinksLabel: buildRecommendedDirectLinksLabel(directLinks, recommendedDirectLinkIds),
    sourceKind: context.sourceKind,
    sourceKindLabel: getSourceKindLabel(context.sourceKind),
    sourceDecisionLabel: buildSourceDecisionLabel(context.sourceKind),
    sceneLabel: context.sceneLabel,
    structureLabel: context.structureLabel,
    nodePathLabel: context.nodePathLabel,
  }
}

export function getTaskVersionSourceSummary(
  task: Pick<
    GenerationTaskRecord,
    'id' | 'parentTaskId' | 'retryAttempt' | 'rootTaskId' | 'drawIndex' | 'variation' | 'payload'
  >,
  replayWork?: Pick<
    GalleryImage,
    | 'mode'
    | 'drawIndex'
    | 'variation'
    | 'promptText'
    | 'promptSnippet'
    | 'size'
    | 'quality'
    | 'providerModel'
    | 'generationSnapshot'
  >,
): WorkVersionSourceSummary {
  const originCounts = countReferenceOrigins(task.payload.referenceImages)
  const replayWorkContract = replayWork ? resolveWorkGenerationContract(replayWork) : null
  const replayGuidedFlow = decorateReplayGuidedFlow({
    guidedFlow: replayWorkContract?.guidedFlow,
    sourceType: task.parentTaskId ? 'task-replay' : 'work-replay',
    actionId: task.retryAttempt > 0 ? 'retry-version' : 'continue-version',
  })
  const replaySnapshot = replayWork?.generationSnapshot
  const replayContract = replaySnapshot
    ? resolveGenerationContractFromTask(task as GenerationTaskRecord, {
        snapshot: replaySnapshot,
        draw: task.payload.draw as GenerationDrawSnapshot | undefined,
        mode: replayWork?.mode ?? task.payload.mode,
        size: replayWork?.size ?? task.payload.size,
        quality: replayWork?.quality ?? task.payload.quality,
        model: replayWork?.providerModel ?? task.payload.model,
        workspacePromptFallback: replayWork?.promptText ?? task.payload.workspacePrompt,
      })
    : resolveGenerationContractFromTask(task as GenerationTaskRecord, {
        references: buildTaskReferenceSnapshot(task as GenerationTaskRecord),
        draw: task.payload.draw as GenerationDrawSnapshot | undefined,
      })
  const hasReferences = (replayContract.references?.count ?? task.payload.referenceImages?.length ?? 0) > 0
  const sceneSnapshot = buildCanonicalGenerationSnapshot({
    contract: {
      ...replayContract,
      guidedFlow: replayGuidedFlow ?? replayContract.guidedFlow,
    },
    snapshot: replaySnapshot,
    id: replaySnapshot?.id ?? task.payload.snapshotId,
    createdAt: replaySnapshot?.createdAt,
    apiUrl: replaySnapshot?.apiUrl ?? '',
    requestUrl: replaySnapshot?.requestUrl ?? '',
  })
  const canonicalReplayContract = sceneSnapshot.contract
  const sourceKind = resolveSourceKind({
    mode: canonicalReplayContract.parameters.mode,
    workReferenceCount: originCounts.workCount,
    uploadReferenceCount: originCounts.uploadCount,
    hasTaskParent: Boolean(task.parentTaskId),
    retryAttempt: task.retryAttempt,
  })
  const originLabel = task.parentTaskId
    ? task.retryAttempt > 0
      ? '来自上一轮结果的同版重试'
      : '来自上一轮结果继续这一版'
    : buildOriginLabel({
        mode: canonicalReplayContract.parameters.mode,
        drawIndex: canonicalReplayContract.draw?.drawIndex ?? task.drawIndex,
        workReferenceCount: originCounts.workCount,
        uploadReferenceCount: originCounts.uploadCount,
      })

  const parentSummary = task.parentTaskId
    ? task.retryAttempt > 0
      ? `任务 ${trimTaskId(task.parentTaskId)} 的同一版失败结果`
      : `任务 ${trimTaskId(task.parentTaskId)} 的上一轮结果`
    : withParentLabel(
        buildParentSummary({
          mode: canonicalReplayContract.parameters.mode,
          drawIndex: canonicalReplayContract.draw?.drawIndex ?? task.drawIndex,
          workReferenceCount: originCounts.workCount,
          uploadReferenceCount: originCounts.uploadCount,
        }),
      )

  const detailLabel =
    task.retryAttempt > 0
      ? `当前是第 ${task.retryAttempt + 1} 次尝试`
      : canonicalReplayContract.draw?.variation || task.variation
        ? `这一轮重点：${canonicalReplayContract.draw?.variation ?? task.variation}`
        : canonicalReplayContract.draw?.drawIndex !== undefined
          ? `当前是这一组里的第 ${canonicalReplayContract.draw.drawIndex + 1} 张`
          : canonicalReplayContract.prompt.request
            ? `当前描述：${buildPromptSnippet(canonicalReplayContract.prompt.request, task.payload.title)}`
            : '可以恢复到工作台继续改'

  const currentLabel =
    task.retryAttempt > 0
      ? `当前任务：第 ${task.retryAttempt + 1} 次同版尝试`
      : canonicalReplayContract.draw?.variation || task.variation
        ? `当前任务重点：${canonicalReplayContract.draw?.variation ?? task.variation}`
        : canonicalReplayContract.draw?.drawIndex !== undefined
          ? `当前任务位于这一组里的第 ${canonicalReplayContract.draw.drawIndex + 1} 张`
          : canonicalReplayContract.prompt.request
            ? `当前任务描述：${buildPromptSnippet(canonicalReplayContract.prompt.request, task.payload.title)}`
            : '当前任务可恢复到工作台继续改'

  const ancestorLabel = task.parentTaskId
    ? task.rootTaskId && task.rootTaskId !== task.parentTaskId
      ? `更早来源：根任务 ${trimTaskId(task.rootTaskId)} 已形成多轮继续链`
      : `更早来源：当前仍沿着根任务 ${trimTaskId(task.rootTaskId || task.parentTaskId)} 的主线推进`
    : buildAncestorSummary({
        mode: canonicalReplayContract.parameters.mode,
        drawIndex: canonicalReplayContract.draw?.drawIndex ?? task.drawIndex,
        workReferenceCount: originCounts.workCount,
        uploadReferenceCount: originCounts.uploadCount,
      })

  const expectedReferenceCount =
    canonicalReplayContract.references?.count ?? task.payload.referenceImages?.length ?? 0
  const restorableReferenceCount =
    canonicalReplayContract.references?.sources?.filter((item) => Boolean(item.src)).length ??
    task.payload.referenceImages?.filter((item) => Boolean(item.src)).length ??
    0
  const sceneLabel = buildSceneLabel(sceneSnapshot, hasReferences)
  const deltaItems = buildVersionDeltaItems({
    sourceKind,
    sceneLabel,
    snapshot: sceneSnapshot,
    requestPrompt: canonicalReplayContract.prompt.request,
    workspacePrompt: canonicalReplayContract.prompt.workspace,
    expectedReferenceCount,
    restorableReferenceCount,
    workReferenceCount: originCounts.workCount,
    uploadReferenceCount: originCounts.uploadCount,
    mode: canonicalReplayContract.parameters.mode,
    size: canonicalReplayContract.parameters.size,
    quality: canonicalReplayContract.parameters.quality,
    model: canonicalReplayContract.parameters.model,
    draw: canonicalReplayContract.draw,
    retryAttempt: task.retryAttempt,
  })
  const guidedFlowLabel = buildGuidedSummary(sceneSnapshot, { hasReferences })
  const parameterLabel = buildParameterSummary({
    mode: canonicalReplayContract.parameters.mode,
    size: canonicalReplayContract.parameters.size,
    quality: canonicalReplayContract.parameters.quality,
    model: canonicalReplayContract.parameters.model,
    draw: canonicalReplayContract.draw,
  })
  const referenceLabel = buildReferenceContextLabel({
    expectedReferenceCount,
    restorableReferenceCount,
    workReferenceCount: originCounts.workCount,
    uploadReferenceCount: originCounts.uploadCount,
  })
  const actionDecisions = buildActionDecisions({
    origin: 'task',
    sourceKind,
    items: deltaItems,
    currentLabel,
    guidedFlowLabel,
    parameterLabel,
    referenceLabel,
  })
  const recommendedAction = actionDecisions.find((item) => item.recommended) ?? actionDecisions[0]
  const promptLabel = buildPromptContextLabel({
    requestPrompt: canonicalReplayContract.prompt.request,
    workspacePrompt: canonicalReplayContract.prompt.workspace,
    fallback: task.payload.title,
  })
  const directLinks = buildDirectLinks({
    contract: canonicalReplayContract,
    guidedFlowLabel,
    parameterLabel,
    referenceLabel,
    promptLabel,
    sceneLabel,
  })
  const recommendedDirectLinkIds = buildRecommendedDirectLinkIds(
    recommendedAction.actionId,
    canonicalReplayContract,
  )

  return {
    originLabel,
    detailLabel,
    parentLabel: task.parentTaskId ? withParentLabel(parentSummary) : parentSummary,
    currentLabel,
    ancestorLabel,
    guidedFlowLabel,
    parameterLabel,
    referenceLabel,
    promptLabel,
    deltaHeadline: buildDeltaHeadline(sourceKind, deltaItems),
    parentDeltaLabel: buildParentDeltaLabel(sourceKind, parentSummary, currentLabel),
    sourceDeltaLabel: buildSourceDeltaLabel(sourceKind, ancestorLabel),
    quickDeltaLabels: buildQuickDeltaLabels(deltaItems),
    deltaItems,
    decisionSummary: buildDecisionSummary(recommendedAction.actionId, currentLabel, getSourceKindLabel(sourceKind)),
    recommendedActionId: recommendedAction.actionId,
    recommendedActionLabel: recommendedAction.label,
    recommendedActionSummary: recommendedAction.summary,
    actionDecisionReason: recommendedAction.reason,
    actionDecisions,
    directLinks,
    recommendedDirectLinkIds,
    recommendedDirectLinksLabel: buildRecommendedDirectLinksLabel(directLinks, recommendedDirectLinkIds),
    sourceKind,
    sourceKindLabel: getSourceKindLabel(sourceKind),
    sourceDecisionLabel: buildSourceDecisionLabel(sourceKind),
    sceneLabel,
    structureLabel: buildStructureLabel({
      snapshot: sceneSnapshot,
      hasReferences,
      sourceKind,
    }),
    nodePathLabel: buildNodePathLabel({
      sourceKind,
      parentSummary,
      currentLabel,
      ancestorLabel,
    }),
  }
}

export function getWorkReplayReferenceSummary(
  work: Pick<
    GalleryImage,
    | 'generationSnapshot'
    | 'mode'
    | 'drawIndex'
    | 'variation'
    | 'promptText'
    | 'promptSnippet'
    | 'size'
    | 'quality'
    | 'providerModel'
  >,
): WorkReplayReferenceSummary {
  const context = buildWorkContext(work)
  const expectedReferenceCount = context.expectedReferenceCount
  const restorableReferenceCount = context.restorableReferenceCount
  const missingReferenceCount = Math.max(0, expectedReferenceCount - restorableReferenceCount)
  const referenceSummary =
    expectedReferenceCount > 0
      ? `参考图恢复 ${restorableReferenceCount}/${expectedReferenceCount}`
      : '当前版本无参考图依赖'
  return {
    expectedReferenceCount,
    restorableReferenceCount,
    missingReferenceCount,
    canAutoGenerate: missingReferenceCount === 0,
    parentSummary: context.parentSummary,
    ancestorSummary: context.ancestorSummary,
    currentSummary: context.currentLabel,
    guidedSummary: context.guidedSummary,
    parameterSummary: context.parameterSummary,
    referenceSummary,
  }
}

export function getWorkReplayStatusText(summary: WorkReplayReferenceSummary) {
  if (summary.missingReferenceCount > 0) {
    return `缺少 ${summary.missingReferenceCount} 张参考图，回流后先补齐再继续。${summary.currentSummary}`
  }
  if (summary.expectedReferenceCount > 0) {
    return `已保存 ${summary.restorableReferenceCount} 张参考图，可直接回流。${summary.currentSummary}`
  }
  return `当前描述和参数可直接回流。${summary.currentSummary}`
}

export function getWorkReplayHint(
  origin: WorkReplayOrigin,
  autoGenerate: boolean,
  summary: WorkReplayReferenceSummary,
) {
  const subject = origin === 'work' ? '这张作品' : '这次任务'
  if (autoGenerate) {
    if (summary.missingReferenceCount > 0) {
      return `${subject}会先恢复当前描述、参数和已保存参考图，但还缺 ${summary.missingReferenceCount} 张参考图；补齐后再继续高频动作。`
    }
    if (origin === 'work') {
      return `${subject}会直接带回工作台，并按这一版参数起一个新分支。`
    }
    return `${subject}会直接带回工作台，并按这一版参数准备立即重试。`
  }
  if (summary.missingReferenceCount > 0) {
    return `${subject}会先恢复当前描述、参数和已保存参考图；缺失参考图需要手动补齐后再继续。`
  }
  return `${subject}会直接恢复到工作台，方便继续这一版的小步调整。`
}

export function getWorkReplayActionLabels(origin: WorkReplayOrigin) {
  if (origin === 'task') {
    return {
      restore: getStudioFlowActionLabel('restore-controls'),
      regenerate: '按这次参数重跑',
      regenerateTone: 'retry',
    }
  }

  return {
    restore: getStudioFlowActionLabel('continue-version'),
    regenerate: getStudioFlowActionLabel('branch-version'),
    regenerateTone: 'branch',
  }
}

export function getWorkReplayGuide(origin: WorkReplayOrigin) {
  const labels = getWorkReplayActionLabels(origin)
  if (origin === 'task') {
    return `${labels.restore} 会恢复当前任务控制区；${labels.regenerate} 会按同版参数直接再跑一次，失败项仍可单独重试。`
  }
  return `${labels.restore} 会恢复这一版控制区；${labels.regenerate} 会保留父版语义并直接起新分支。`
}
