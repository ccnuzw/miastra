import type { ReferenceImage } from '@/features/references/reference.types'
import type { GalleryImage } from './works.types'

export const workReplayStorageKey = 'new-pic:work-replay:v1'

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
