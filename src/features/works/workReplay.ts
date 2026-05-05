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
      return `${subject}会带回工作台恢复 Prompt、参数和已保存参考图，但还缺 ${summary.missingReferenceCount} 张参考图。`
    }
    return `${subject}会带回工作台并按当前参数准备下一次生成。`
  }
  if (summary.missingReferenceCount > 0) {
    return `${subject}会带回工作台恢复 Prompt、参数和已保存参考图，缺失参考图需要你手动补齐。`
  }
  return `${subject}会带回工作台恢复 Prompt、参数和参考图，方便继续调整。`
}

export function getWorkReplayActionLabels(origin: WorkReplayOrigin) {
  if (origin === 'task') {
    return {
      restore: '恢复到工作台',
      regenerate: '按任务参数重跑',
    }
  }

  return {
    restore: '继续做',
    regenerate: '再做一版',
  }
}

export function getWorkReplayGuide(origin: WorkReplayOrigin) {
  const labels = getWorkReplayActionLabels(origin)
  return `${labels.restore} 会把 Prompt、参数和已保存参考图带回工作台；${labels.regenerate} 会在可恢复时按当前参数准备下一次生成。`
}
