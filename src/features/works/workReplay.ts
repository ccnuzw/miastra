import type { GenerationTaskRecord } from '@/features/generation/generation.api'
import type {
  GenerationDrawSnapshot,
  GenerationMode,
  GenerationReferenceSnapshot,
  GenerationSnapshot,
} from '@/features/generation/generation.types'
import {
  getStudioFlowActionLabel,
  getStudioFlowScene,
} from '@/features/prompt-templates/studioFlowSemantic'
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
}

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
  const references = work.generationSnapshot?.references?.sources ?? []
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
  const guidedSummary = work.generationSnapshot?.guidedFlow?.summary
  if (guidedSummary && guidedSummary !== '还没选细节') return `追问结果：${guidedSummary}`
  if (work.variation) return `这一版重点：${work.variation}`
  if (work.mode?.includes('draw') && work.drawIndex !== undefined)
    return `当前是这一组里的第 ${work.drawIndex + 1} 张变体`
  const promptSnippet = buildPromptSnippet(work.promptText || work.promptSnippet || '', '')
  if (promptSnippet) return `当前描述：${promptSnippet}`
  return '可以直接接着这一版继续改'
}

function buildCurrentVersionLabel(
  work: Pick<
    GalleryImage,
    'variation' | 'drawIndex' | 'promptText' | 'promptSnippet' | 'mode' | 'generationSnapshot'
  >,
) {
  const guidedSummary = work.generationSnapshot?.guidedFlow?.summary
  if (guidedSummary && guidedSummary !== '还没选细节') return `当前版追问：${guidedSummary}`
  if (work.variation) return `当前版重点：${work.variation}`
  if (work.mode?.includes('draw') && work.drawIndex !== undefined)
    return `当前版位于这组里的第 ${work.drawIndex + 1} 张变体`
  const promptSnippet = buildPromptSnippet(work.promptText || work.promptSnippet || '', '')
  if (promptSnippet) return `当前版描述：${promptSnippet}`
  return '当前版可以直接继续调整'
}

function buildGuidedSummary(snapshot?: GenerationSnapshot | null) {
  const guidedFlow = snapshot?.guidedFlow
  if (!guidedFlow) return '追问：当前没有挂接正式追问结果'
  if (guidedFlow.summary && guidedFlow.summary !== '还没选细节') {
    return `追问：${guidedFlow.summary}（已完成 ${guidedFlow.completedQuestionCount}/${guidedFlow.totalQuestionCount} 步）`
  }
  return `追问：已挂接 ${guidedFlow.guideTitle}，但还没有形成明确摘要`
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

function readParentSummaryFromReferenceNote(note?: string) {
  if (!note) return ''
  const marker = '父节点：'
  const start = note.indexOf(marker)
  if (start < 0) return ''
  const remainder = note.slice(start + marker.length).trim()
  const endIndex = remainder.indexOf('。')
  return endIndex >= 0 ? remainder.slice(0, endIndex).trim() : remainder
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
  const expectedReferenceCount = work.generationSnapshot?.references?.count ?? 0
  const restorableReferenceCount = (work.generationSnapshot?.references?.sources ?? []).filter(
    (item) => Boolean(item.src),
  ).length
  const originCounts = countReferenceOrigins(work.generationSnapshot?.references)
  const parentSummary =
    readParentSummaryFromReferenceNote(work.generationSnapshot?.references?.note) ||
    buildParentSummary({
      mode: work.mode ?? work.generationSnapshot?.mode,
      drawIndex: work.generationSnapshot?.draw?.drawIndex ?? work.drawIndex,
      workReferenceCount: originCounts.workCount,
      uploadReferenceCount: originCounts.uploadCount,
    })

  return {
    expectedReferenceCount,
    restorableReferenceCount,
    originCounts,
    parentSummary,
    currentLabel: buildCurrentVersionLabel({
      variation: work.generationSnapshot?.draw?.variation ?? work.variation,
      drawIndex: work.generationSnapshot?.draw?.drawIndex ?? work.drawIndex,
      promptText: work.generationSnapshot?.workspacePrompt || work.promptText,
      promptSnippet: work.promptSnippet,
      mode: work.mode ?? work.generationSnapshot?.mode,
      generationSnapshot: work.generationSnapshot,
    }),
    detailLabel: buildWorkDetailLabel({
      variation: work.generationSnapshot?.draw?.variation ?? work.variation,
      drawIndex: work.generationSnapshot?.draw?.drawIndex ?? work.drawIndex,
      promptText: work.generationSnapshot?.workspacePrompt || work.promptText,
      promptSnippet: work.promptSnippet,
      mode: work.mode ?? work.generationSnapshot?.mode,
      generationSnapshot: work.generationSnapshot,
    }),
    ancestorSummary: buildAncestorSummary({
      mode: work.mode ?? work.generationSnapshot?.mode,
      drawIndex: work.generationSnapshot?.draw?.drawIndex ?? work.drawIndex,
      workReferenceCount: originCounts.workCount,
      uploadReferenceCount: originCounts.uploadCount,
    }),
    guidedSummary: buildGuidedSummary(work.generationSnapshot),
    parameterSummary: buildParameterSummary({
      mode: work.mode ?? work.generationSnapshot?.mode,
      size: work.generationSnapshot?.size ?? work.size,
      quality: work.generationSnapshot?.quality ?? work.quality,
      model: work.generationSnapshot?.model ?? work.providerModel,
      draw: work.generationSnapshot?.draw,
    }),
    promptLabel: buildPromptContextLabel({
      requestPrompt: work.generationSnapshot?.requestPrompt,
      workspacePrompt: work.generationSnapshot?.workspacePrompt || work.promptText,
      fallback: work.promptSnippet,
    }),
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
  if (snapshot?.scene) return snapshot.scene
  if (snapshot?.guidedFlow?.scene) return snapshot.guidedFlow.scene
  return hasReferences ? getStudioFlowScene('image-edit') : getStudioFlowScene()
}

export function buildTaskReplayWork(
  task: GenerationTaskRecord,
  resultWork?: GalleryImage,
): GalleryImage {
  const existingSnapshot = readTaskGenerationSnapshot(task, resultWork)
  const requestPrompt =
    task.payload.requestPrompt ||
    task.payload.promptText ||
    resultWork?.promptText ||
    resultWork?.title ||
    task.payload.title
  const workspacePrompt = task.payload.workspacePrompt || requestPrompt
  const fallbackSnapshot: GenerationSnapshot = {
    id:
      task.result?.snapshotId ??
      resultWork?.snapshotId ??
      task.payload.snapshotId ??
      crypto.randomUUID(),
    createdAt: toTimestamp(task.updatedAt || task.createdAt),
    scene: resolveReplayScene(resultWork?.generationSnapshot, Boolean(task.payload.referenceImages?.length)),
    mode: task.result?.mode ?? resultWork?.mode ?? task.payload.mode,
    prompt: requestPrompt,
    requestPrompt,
    workspacePrompt,
    size: task.result?.size ?? resultWork?.size ?? task.payload.size,
    quality: task.result?.quality ?? resultWork?.quality ?? task.payload.quality,
    model: task.result?.providerModel ?? resultWork?.providerModel ?? task.payload.model,
    providerId: task.payload.providerId,
    apiUrl: '',
    requestUrl: '',
    stream: task.payload.stream,
    references: buildTaskReferenceSnapshot(task),
    draw: task.payload.draw as GenerationDrawSnapshot | undefined,
  }

  const generationSnapshot: GenerationSnapshot = existingSnapshot
    ? {
        ...existingSnapshot,
        id: existingSnapshot.id || fallbackSnapshot.id,
        createdAt: existingSnapshot.createdAt || fallbackSnapshot.createdAt,
        scene:
          existingSnapshot.scene ??
          resolveReplayScene(existingSnapshot, Boolean(task.payload.referenceImages?.length)),
        mode: (existingSnapshot.mode || fallbackSnapshot.mode) as GenerationMode,
        prompt: existingSnapshot.prompt || fallbackSnapshot.prompt,
        requestPrompt: existingSnapshot.requestPrompt || fallbackSnapshot.requestPrompt,
        workspacePrompt: existingSnapshot.workspacePrompt || fallbackSnapshot.workspacePrompt,
        size: existingSnapshot.size || fallbackSnapshot.size,
        quality: existingSnapshot.quality || fallbackSnapshot.quality,
        model: existingSnapshot.model || fallbackSnapshot.model,
        providerId: existingSnapshot.providerId || fallbackSnapshot.providerId,
        apiUrl: existingSnapshot.apiUrl || fallbackSnapshot.apiUrl,
        requestUrl: existingSnapshot.requestUrl || fallbackSnapshot.requestUrl,
        stream: existingSnapshot.stream ?? fallbackSnapshot.stream,
        references: existingSnapshot.references ?? fallbackSnapshot.references,
        draw: existingSnapshot.draw ?? fallbackSnapshot.draw,
      }
    : fallbackSnapshot

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
    mode: resultWork?.mode ?? task.result?.mode ?? task.payload.mode,
    providerModel: resultWork?.providerModel ?? task.result?.providerModel ?? task.payload.model,
    size: resultWork?.size ?? task.result?.size ?? task.payload.size,
    quality: resultWork?.quality ?? task.result?.quality ?? task.payload.quality,
    snapshotId:
      resultWork?.snapshotId ??
      task.result?.snapshotId ??
      task.payload.snapshotId ??
      generationSnapshot.id,
    generationTaskId: task.id,
    generationSnapshot,
    promptText: resultWork?.promptText ?? task.result?.promptText ?? requestPrompt,
    promptSnippet:
      resultWork?.promptSnippet ??
      task.result?.promptSnippet ??
      buildPromptSnippet(requestPrompt, task.payload.title),
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
  return {
    originLabel: buildOriginLabel({
      mode: work.mode ?? work.generationSnapshot?.mode,
      drawIndex: work.generationSnapshot?.draw?.drawIndex ?? work.drawIndex,
      workReferenceCount: context.originCounts.workCount,
      uploadReferenceCount: context.originCounts.uploadCount,
    }),
    detailLabel: context.detailLabel,
    parentLabel: withParentLabel(context.parentSummary),
    currentLabel: context.currentLabel,
    ancestorLabel: context.ancestorSummary,
    guidedFlowLabel: context.guidedSummary,
    parameterLabel: context.parameterSummary,
    referenceLabel: buildReferenceContextLabel({
      expectedReferenceCount: context.expectedReferenceCount,
      restorableReferenceCount: context.restorableReferenceCount,
      workReferenceCount: context.originCounts.workCount,
      uploadReferenceCount: context.originCounts.uploadCount,
    }),
    promptLabel: context.promptLabel,
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
  const originLabel = task.parentTaskId
    ? task.retryAttempt > 0
      ? '来自上一轮结果的同版重试'
      : '来自上一轮结果继续这一版'
    : buildOriginLabel({
        mode: task.payload.mode,
        drawIndex: task.payload.draw?.drawIndex ?? task.drawIndex,
        workReferenceCount: originCounts.workCount,
        uploadReferenceCount: originCounts.uploadCount,
      })

  const parentSummary = task.parentTaskId
    ? task.retryAttempt > 0
      ? `任务 ${trimTaskId(task.parentTaskId)} 的同一版失败结果`
      : `任务 ${trimTaskId(task.parentTaskId)} 的上一轮结果`
    : withParentLabel(
        buildParentSummary({
          mode: task.payload.mode,
          drawIndex: task.payload.draw?.drawIndex ?? task.drawIndex,
          workReferenceCount: originCounts.workCount,
          uploadReferenceCount: originCounts.uploadCount,
        }),
      )

  const detailLabel =
    task.retryAttempt > 0
      ? `当前是第 ${task.retryAttempt + 1} 次尝试`
      : task.payload.draw?.variation || task.variation
        ? `这一轮重点：${task.payload.draw?.variation ?? task.variation}`
        : task.payload.draw?.drawIndex !== undefined
          ? `当前是这一组里的第 ${task.payload.draw.drawIndex + 1} 张`
          : task.payload.requestPrompt
            ? `当前描述：${buildPromptSnippet(task.payload.requestPrompt, task.payload.title)}`
            : '可以恢复到工作台继续改'

  const currentLabel =
    task.retryAttempt > 0
      ? `当前任务：第 ${task.retryAttempt + 1} 次同版尝试`
      : task.payload.draw?.variation || task.variation
        ? `当前任务重点：${task.payload.draw?.variation ?? task.variation}`
        : task.payload.draw?.drawIndex !== undefined
          ? `当前任务位于这一组里的第 ${task.payload.draw.drawIndex + 1} 张`
          : task.payload.requestPrompt
            ? `当前任务描述：${buildPromptSnippet(task.payload.requestPrompt, task.payload.title)}`
            : '当前任务可恢复到工作台继续改'

  const ancestorLabel = task.parentTaskId
    ? task.rootTaskId && task.rootTaskId !== task.parentTaskId
      ? `更早来源：根任务 ${trimTaskId(task.rootTaskId)} 已形成多轮继续链`
      : `更早来源：当前仍沿着根任务 ${trimTaskId(task.rootTaskId || task.parentTaskId)} 的主线推进`
    : buildAncestorSummary({
        mode: task.payload.mode,
        drawIndex: task.payload.draw?.drawIndex ?? task.drawIndex,
        workReferenceCount: originCounts.workCount,
        uploadReferenceCount: originCounts.uploadCount,
      })

  return {
    originLabel,
    detailLabel,
    parentLabel: task.parentTaskId ? withParentLabel(parentSummary) : parentSummary,
    currentLabel,
    ancestorLabel,
    guidedFlowLabel: replayWork
      ? buildGuidedSummary(replayWork.generationSnapshot)
      : '追问：当前任务快照里没有正式追问结果',
    parameterLabel: buildParameterSummary({
      mode: task.payload.mode,
      size: replayWork?.generationSnapshot?.size ?? replayWork?.size ?? task.payload.size,
      quality:
        replayWork?.generationSnapshot?.quality ?? replayWork?.quality ?? task.payload.quality,
      model:
        replayWork?.generationSnapshot?.model ??
        replayWork?.providerModel ??
        task.payload.model,
      draw: replayWork?.generationSnapshot?.draw ?? (task.payload.draw as GenerationDrawSnapshot | undefined),
    }),
    referenceLabel: buildReferenceContextLabel({
      expectedReferenceCount:
        replayWork?.generationSnapshot?.references?.count ?? task.payload.referenceImages?.length ?? 0,
      restorableReferenceCount:
        replayWork?.generationSnapshot?.references?.sources?.filter((item) => Boolean(item.src))
          .length ?? task.payload.referenceImages?.filter((item) => Boolean(item.src)).length ?? 0,
      workReferenceCount: originCounts.workCount,
      uploadReferenceCount: originCounts.uploadCount,
    }),
    promptLabel: buildPromptContextLabel({
      requestPrompt: task.payload.requestPrompt,
      workspacePrompt:
        replayWork?.generationSnapshot?.workspacePrompt ?? task.payload.workspacePrompt,
      fallback: task.payload.title,
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
    return `缺少 ${summary.missingReferenceCount} 张参考图，回到工作台后需补齐。${summary.currentSummary}。${summary.parentSummary}`
  }
  if (summary.expectedReferenceCount > 0) {
    return `已保存 ${summary.restorableReferenceCount} 张参考图，可直接恢复。${summary.currentSummary}。${summary.parentSummary}`
  }
  return `当前参数可直接带回工作台。${summary.currentSummary}。${summary.parentSummary}`
}

export function getWorkReplayHint(
  origin: WorkReplayOrigin,
  autoGenerate: boolean,
  summary: WorkReplayReferenceSummary,
) {
  const subject = origin === 'work' ? '这张作品' : '这次任务'
  if (autoGenerate) {
    if (summary.missingReferenceCount > 0) {
      const actionLabel = origin === 'work' ? '从这一版分叉' : '重试这一版'
      return `${subject}会带回工作台恢复这一版的描述、参数和已保存参考图，但还缺 ${summary.missingReferenceCount} 张参考图；补齐后再${actionLabel}。${summary.currentSummary}。${summary.guidedSummary}。${summary.parameterSummary}。${summary.referenceSummary}。${summary.parentSummary}。${summary.ancestorSummary}`
    }
    if (origin === 'work') {
      return `${subject}会带回工作台，并按这一版的参数直接分叉出下一版。${summary.currentSummary}。${summary.guidedSummary}。${summary.parameterSummary}。${summary.referenceSummary}。${summary.parentSummary}。${summary.ancestorSummary}`
    }
    return `${subject}会带回工作台，并按这一版的参数准备立即重试。${summary.currentSummary}。${summary.guidedSummary}。${summary.parameterSummary}。${summary.referenceSummary}。${summary.parentSummary}。${summary.ancestorSummary}`
  }
  if (summary.missingReferenceCount > 0) {
    return `${subject}会带回工作台恢复这一版的描述、参数和已保存参考图，缺失参考图需要你手动补齐。${summary.currentSummary}。${summary.guidedSummary}。${summary.parameterSummary}。${summary.referenceSummary}。${summary.parentSummary}。${summary.ancestorSummary}`
  }
  return `${subject}会带回工作台恢复这一版的描述、参数和参考图，方便继续调整。${summary.currentSummary}。${summary.guidedSummary}。${summary.parameterSummary}。${summary.referenceSummary}。${summary.parentSummary}。${summary.ancestorSummary}`
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
    return `${labels.restore} 会把这次任务的描述、参数和已保存参考图带回工作台；${labels.regenerate} 会在可恢复时带回工作台并按同一版参数直接再跑一次。失败任务仍可单独点“直接重试失败项”。`
  }
  return `${labels.restore} 会把这一版的描述、参数和已保存参考图带回工作台；${labels.regenerate} 会保留父版语义，并按当前参数直接起一个新分支。`
}
