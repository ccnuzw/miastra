import type { ReferenceImage } from '@/features/references/reference.types'
import type { GenerationTaskRecord } from '@/features/generation/generation.api'
import type { GenerationDrawSnapshot, GenerationMode, GenerationReferenceSnapshot, GenerationSnapshot } from '@/features/generation/generation.types'
import type { GalleryImage } from './works.types'

export const workReplayStorageKey = 'new-pic:work-replay:v1'

export type WorkReplayOrigin = 'work' | 'task'
export type WorkReplayIntent = 'continue' | 'variant' | 'recover' | 'rerun'

export type WorkReplayReferenceSummary = {
  expectedReferenceCount: number
  restorableReferenceCount: number
  missingReferenceCount: number
  canAutoGenerate: boolean
}

export type WorkVersionSourceSummary = {
  originLabel: string
  detailLabel: string
}

type SerializableWork = Pick<GalleryImage,
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
    return JSON.parse(value) as WorkReplayPayload
  } catch {
    return null
  }
}

export function queueWorkReplayPayload(payload: WorkReplayPayload) {
  sessionStorage.setItem(workReplayStorageKey, JSON.stringify({
    work: serializeWork(payload.work as GalleryImage),
    autoGenerate: payload.autoGenerate,
    origin: payload.origin,
    intent: payload.intent,
  }))
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
    return [{
      id: crypto.randomUUID(),
      src: reference.src,
      name: reference.name || `${work.title || 'work'}-reference-${index + 1}`,
      source: reference.source,
      assetId: reference.assetId,
      assetRemoteKey: reference.assetRemoteKey,
      workId: reference.workId,
      workTitle: reference.workTitle,
    }]
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

function countReferenceOrigins(
  references?: GenerationSnapshot['references'] | GenerationTaskRecord['payload']['referenceImages'],
) {
  const sources = Array.isArray(references) ? references : references?.sources ?? []
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
  if (workReferenceCount > 0) return workReferenceCount > 1 ? `来自 ${workReferenceCount} 张作品参考继续改` : '来自上一版继续改'
  if (uploadReferenceCount > 0) return uploadReferenceCount > 1 ? `来自 ${uploadReferenceCount} 张上传图继续改` : '来自上传图继续改'
  if (mode?.includes('draw')) return drawIndex === undefined ? '来自抽卡批次' : `来自抽卡批次第 ${drawIndex + 1} 张`
  return '来自文字起稿首版'
}

function buildWorkDetailLabel(work: Pick<GalleryImage, 'variation' | 'drawIndex' | 'promptText' | 'promptSnippet' | 'mode'>) {
  if (work.variation) return `这一版重点：${work.variation}`
  if (work.mode?.includes('draw') && work.drawIndex !== undefined) return `当前是这一组里的第 ${work.drawIndex + 1} 张变体`
  const promptSnippet = buildPromptSnippet(work.promptText || work.promptSnippet || '', '')
  if (promptSnippet) return `当前描述：${promptSnippet}`
  return '可以直接接着这一版继续改'
}

function buildTaskReferenceSnapshot(task: GenerationTaskRecord): GenerationReferenceSnapshot | undefined {
  const references = task.payload.referenceImages ?? []
  if (!references.length) return undefined
  const savedCount = references.filter((item) => Boolean(item.src)).length
  return {
    count: references.length,
    sources: references.map((item) => ({
      source: item.source,
      name: item.name,
      assetId: item.assetId,
      assetRemoteKey: item.assetRemoteKey,
      src: item.src,
    })),
    note: savedCount === references.length
      ? '任务快照已保存全部参考图。'
      : `任务快照仅保存了 ${savedCount}/${references.length} 张参考图。`,
  }
}

function readTaskGenerationSnapshot(task: GenerationTaskRecord, resultWork?: GalleryImage): GenerationSnapshot | undefined {
  if (resultWork?.generationSnapshot) return resultWork.generationSnapshot
  if (isObject(task.result?.generationSnapshot)) return task.result.generationSnapshot as GenerationSnapshot
  return undefined
}

export function buildTaskReplayWork(task: GenerationTaskRecord, resultWork?: GalleryImage): GalleryImage {
  const existingSnapshot = readTaskGenerationSnapshot(task, resultWork)
  const requestPrompt = task.payload.requestPrompt || task.payload.promptText || resultWork?.promptText || resultWork?.title || task.payload.title
  const workspacePrompt = task.payload.workspacePrompt || requestPrompt
  const fallbackSnapshot: GenerationSnapshot = {
    id: task.result?.snapshotId ?? resultWork?.snapshotId ?? task.payload.snapshotId ?? crypto.randomUUID(),
    createdAt: toTimestamp(task.updatedAt || task.createdAt),
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
    title: resultWork?.title ?? task.result?.title ?? task.payload.title ?? `任务 ${task.id.slice(0, 8)}`,
    src: resultWork?.src ?? task.result?.imageUrl,
    meta: resultWork?.meta ?? task.result?.meta ?? task.payload.meta,
    variation: resultWork?.variation ?? task.result?.variation ?? task.variation ?? task.payload.draw?.variation,
    batchId: resultWork?.batchId ?? task.result?.batchId ?? task.batchId ?? task.payload.draw?.batchId,
    drawIndex: resultWork?.drawIndex ?? task.result?.drawIndex ?? task.drawIndex ?? task.payload.draw?.drawIndex,
    createdAt: resultWork?.createdAt ?? toTimestamp(task.createdAt),
    mode: resultWork?.mode ?? task.result?.mode ?? task.payload.mode,
    providerModel: resultWork?.providerModel ?? task.result?.providerModel ?? task.payload.model,
    size: resultWork?.size ?? task.result?.size ?? task.payload.size,
    quality: resultWork?.quality ?? task.result?.quality ?? task.payload.quality,
    snapshotId: resultWork?.snapshotId ?? task.result?.snapshotId ?? task.payload.snapshotId ?? generationSnapshot.id,
    generationTaskId: task.id,
    generationSnapshot,
    promptText: resultWork?.promptText ?? task.result?.promptText ?? requestPrompt,
    promptSnippet: resultWork?.promptSnippet ?? task.result?.promptSnippet ?? buildPromptSnippet(requestPrompt, task.payload.title),
    error: task.errorMessage,
    retryable: task.retryable,
  }
}

export function getWorkVersionSourceSummary(
  work: Pick<GalleryImage, 'mode' | 'drawIndex' | 'variation' | 'promptText' | 'promptSnippet' | 'generationSnapshot'>,
): WorkVersionSourceSummary {
  const originCounts = countReferenceOrigins(work.generationSnapshot?.references)
  return {
    originLabel: buildOriginLabel({
      mode: work.mode ?? work.generationSnapshot?.mode,
      drawIndex: work.generationSnapshot?.draw?.drawIndex ?? work.drawIndex,
      workReferenceCount: originCounts.workCount,
      uploadReferenceCount: originCounts.uploadCount,
    }),
    detailLabel: buildWorkDetailLabel({
      variation: work.generationSnapshot?.draw?.variation ?? work.variation,
      drawIndex: work.generationSnapshot?.draw?.drawIndex ?? work.drawIndex,
      promptText: work.generationSnapshot?.workspacePrompt || work.promptText,
      promptSnippet: work.promptSnippet,
      mode: work.mode ?? work.generationSnapshot?.mode,
    }),
  }
}

export function getTaskVersionSourceSummary(
  task: Pick<GenerationTaskRecord, 'parentTaskId' | 'retryAttempt' | 'drawIndex' | 'variation' | 'payload'>,
): WorkVersionSourceSummary {
  const originCounts = countReferenceOrigins(task.payload.referenceImages)
  const originLabel = task.parentTaskId
    ? task.retryAttempt > 0
      ? '接着上一轮结果继续重试'
      : '接着上一轮结果继续生成'
    : buildOriginLabel({
        mode: task.payload.mode,
        drawIndex: task.payload.draw?.drawIndex ?? task.drawIndex,
        workReferenceCount: originCounts.workCount,
        uploadReferenceCount: originCounts.uploadCount,
      })

  const detailLabel = task.retryAttempt > 0
    ? `当前是第 ${task.retryAttempt + 1} 次尝试`
    : task.payload.draw?.variation || task.variation
      ? `这一轮重点：${task.payload.draw?.variation ?? task.variation}`
      : task.payload.draw?.drawIndex !== undefined
        ? `当前是这一组里的第 ${task.payload.draw.drawIndex + 1} 张`
        : task.payload.requestPrompt
          ? `当前描述：${buildPromptSnippet(task.payload.requestPrompt, task.payload.title)}`
          : '可以恢复到工作台继续改'

  return {
    originLabel,
    detailLabel,
  }
}

export function getWorkReplayReferenceSummary(work: Pick<GalleryImage, 'generationSnapshot'>): WorkReplayReferenceSummary {
  const expectedReferenceCount = work.generationSnapshot?.references?.count ?? 0
  const restorableReferenceCount = (work.generationSnapshot?.references?.sources ?? []).filter((item) => Boolean(item.src)).length
  const missingReferenceCount = Math.max(0, expectedReferenceCount - restorableReferenceCount)
  return {
    expectedReferenceCount,
    restorableReferenceCount,
    missingReferenceCount,
    canAutoGenerate: missingReferenceCount === 0,
  }
}

export function getWorkReplayStatusText(summary: WorkReplayReferenceSummary) {
  if (summary.missingReferenceCount > 0) return `缺少 ${summary.missingReferenceCount} 张参考图，回到工作台后需补齐`
  if (summary.expectedReferenceCount > 0) return `已保存 ${summary.restorableReferenceCount} 张参考图，可直接恢复`
  return '当前参数可直接带回工作台'
}

export function getWorkReplayHint(origin: WorkReplayOrigin, autoGenerate: boolean, summary: WorkReplayReferenceSummary) {
  const subject = origin === 'work' ? '这张作品' : '这次任务'
  if (autoGenerate) {
    if (summary.missingReferenceCount > 0) {
      return `${subject}会带回工作台恢复这一版的描述、参数和已保存参考图，但还缺 ${summary.missingReferenceCount} 张参考图。`
    }
    return `${subject}会带回工作台，并按这一版的参数准备下一次生成。`
  }
  if (summary.missingReferenceCount > 0) {
    return `${subject}会带回工作台恢复这一版的描述、参数和已保存参考图，缺失参考图需要你手动补齐。`
  }
  return `${subject}会带回工作台恢复这一版的描述、参数和参考图，方便继续调整。`
}

export function getWorkReplayActionLabels(origin: WorkReplayOrigin) {
  if (origin === 'task') {
    return {
      restore: '继续这次结果',
      regenerate: '按这次参数再跑一版',
    }
  }

  return {
    restore: '继续这一版',
    regenerate: '从这一版再做一版',
  }
}

export function getWorkReplayGuide(origin: WorkReplayOrigin) {
  const labels = getWorkReplayActionLabels(origin)
  return `${labels.restore} 会把这一版的描述、参数和已保存参考图带回工作台；${labels.regenerate} 会在可恢复时按这一版的参数准备下一次生成。`
}
