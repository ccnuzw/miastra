import { getStudioFlowScene } from '@/features/prompt-templates/studioFlowSemantic'
import type { ConsumerGuidedFlowSnapshot } from '@/features/studio-consumer/consumerGuidedFlow'
import type { ReferenceImage } from '@/features/references/reference.types'
import type { GalleryImage } from '@/features/works/works.types'
import type {
  GenerationContractSnapshot,
  GenerationDrawSnapshot,
  GenerationMode,
  GenerationReferenceSnapshot,
  GenerationSnapshot,
} from './generation.types'
import type { StudioFlowScene } from '@/features/prompt-templates/studioFlowSemantic'

type BuildGenerationContractSnapshotInput = {
  scene?: StudioFlowScene
  requestPrompt: string
  workspacePrompt?: string
  mode: GenerationMode
  size: string
  quality: string
  model: string
  providerId: string
  stream: boolean
  references?: GenerationReferenceSnapshot
  draw?: GenerationDrawSnapshot
  guidedFlow?: ConsumerGuidedFlowSnapshot | null
}

type ResolveGenerationContractSnapshotFallback = {
  scene?: StudioFlowScene
  requestPrompt?: string
  workspacePrompt?: string
  mode?: GenerationMode
  size?: string
  quality?: string
  model?: string
  providerId?: string
  stream?: boolean
  references?: GenerationReferenceSnapshot
  draw?: GenerationDrawSnapshot
  guidedFlow?: ConsumerGuidedFlowSnapshot | null
  hasReferences?: boolean
}

type GenerationTaskContractSource = {
  payload: {
    mode: GenerationMode
    title: string
    promptText: string
    workspacePrompt: string
    requestPrompt: string
    size: string
    quality: string
    model: string
    providerId: string
    stream: boolean
    referenceImages?: Array<{
      source: 'upload' | 'work'
      name: string
      assetId?: string
      assetRemoteKey?: string
      src?: string
    }>
    draw?: GenerationDrawSnapshot
  }
  result?: {
    title?: string
    promptText?: string
    size?: string
    quality?: string
    providerModel?: string
    mode?: GenerationMode
    generationSnapshot?: unknown
  }
}

function resolveContractScene(
  scene: StudioFlowScene | undefined,
  guidedFlow: ConsumerGuidedFlowSnapshot | null | undefined,
  hasReferences = false,
) {
  if (scene) return scene
  if (guidedFlow?.scene) return guidedFlow.scene
  return hasReferences ? getStudioFlowScene('image-edit') : getStudioFlowScene()
}

export function getGenerationSnapshotReferenceCount(
  snapshot?: Partial<GenerationSnapshot> | null,
) {
  return snapshot?.contract?.references?.count ?? snapshot?.references?.count ?? 0
}

export function buildGenerationReferenceSnapshot(
  referenceImages: ReferenceImage[],
): GenerationReferenceSnapshot | undefined {
  if (!referenceImages.length) return undefined
  return {
    count: referenceImages.length,
    sources: referenceImages.map((reference, index) => ({
      source: reference.source,
      name:
        reference.name ||
        `${reference.source === 'work' ? '作品区参考图' : '上传参考图'} #${index + 1}`,
      assetId: reference.assetId,
      assetRemoteKey: reference.assetRemoteKey,
      src: reference.src,
      workId: reference.workId,
      workTitle: reference.workTitle,
    })),
    note: '图生图参考图仅保存数量与来源提示，不保存图片二进制；复用参数时需重新提供参考图。',
  }
}

export function buildGenerationContractSnapshot(
  input: BuildGenerationContractSnapshotInput,
): GenerationContractSnapshot {
  const guidedFlow = input.guidedFlow ?? null
  const references = input.references
  return {
    version: 1,
    scene: resolveContractScene(input.scene, guidedFlow, Boolean(references?.count)),
    prompt: {
      request: input.requestPrompt,
      workspace: input.workspacePrompt ?? input.requestPrompt,
    },
    parameters: {
      mode: input.mode,
      size: input.size,
      quality: input.quality,
      model: input.model,
      providerId: input.providerId,
      stream: input.stream,
    },
    guidedFlow,
    references,
    draw: input.draw,
  }
}

export function resolveGenerationContractSnapshot(
  snapshot?: Partial<GenerationSnapshot> | null,
  fallback: ResolveGenerationContractSnapshotFallback = {},
): GenerationContractSnapshot {
  const contract = snapshot?.contract
  const guidedFlow = contract?.guidedFlow ?? snapshot?.guidedFlow ?? fallback.guidedFlow ?? null
  const references = contract?.references ?? snapshot?.references ?? fallback.references
  const resolvedScene =
    contract?.scene ??
    snapshot?.scene ??
    fallback.scene ??
    resolveContractScene(undefined, guidedFlow, Boolean(references?.count ?? fallback.hasReferences))
  return buildGenerationContractSnapshot({
    scene: resolvedScene,
    requestPrompt:
      contract?.prompt.request ??
      snapshot?.requestPrompt ??
      snapshot?.prompt ??
      fallback.requestPrompt ??
      '',
    workspacePrompt:
      contract?.prompt.workspace ??
      snapshot?.workspacePrompt ??
      fallback.workspacePrompt ??
      snapshot?.requestPrompt ??
      snapshot?.prompt ??
      fallback.requestPrompt ??
      '',
    mode:
      contract?.parameters.mode ??
      snapshot?.mode ??
      fallback.mode ??
      'text2image',
    size:
      contract?.parameters.size ??
      snapshot?.size ??
      fallback.size ??
      '',
    quality:
      contract?.parameters.quality ??
      snapshot?.quality ??
      fallback.quality ??
      '',
    model:
      contract?.parameters.model ??
      snapshot?.model ??
      fallback.model ??
      '',
    providerId:
      contract?.parameters.providerId ??
      snapshot?.providerId ??
      fallback.providerId ??
      '',
    stream:
      contract?.parameters.stream ??
      snapshot?.stream ??
      fallback.stream ??
      false,
    references,
    draw: contract?.draw ?? snapshot?.draw ?? fallback.draw,
    guidedFlow,
  })
}

type GenerationContractWorkSource = Pick<
  GalleryImage,
  | 'mode'
  | 'promptText'
  | 'promptSnippet'
  | 'size'
  | 'quality'
  | 'providerModel'
  | 'generationSnapshot'
>

export function resolveGenerationContractFromWork(
  work: GenerationContractWorkSource,
): GenerationContractSnapshot {
  return resolveGenerationContractSnapshot(work.generationSnapshot, {
    requestPrompt: work.promptText ?? work.promptSnippet ?? '',
    workspacePrompt: work.promptText ?? work.promptSnippet ?? '',
    mode: work.mode,
    size: work.size,
    quality: work.quality,
    model: work.providerModel,
    references: work.generationSnapshot?.contract?.references ?? work.generationSnapshot?.references,
    draw: work.generationSnapshot?.contract?.draw ?? work.generationSnapshot?.draw,
    guidedFlow: work.generationSnapshot?.contract?.guidedFlow ?? work.generationSnapshot?.guidedFlow,
    hasReferences: Boolean(getGenerationSnapshotReferenceCount(work.generationSnapshot)),
  })
}

export function resolveGenerationContractFromTask(
  task: GenerationTaskContractSource,
  input: {
    snapshot?: Partial<GenerationSnapshot> | null
    scene?: StudioFlowScene
    references?: GenerationReferenceSnapshot
    draw?: GenerationDrawSnapshot
    guidedFlow?: ConsumerGuidedFlowSnapshot | null
    mode?: GenerationMode
    size?: string
    quality?: string
    model?: string
    providerId?: string
    stream?: boolean
    requestPromptFallback?: string
    workspacePromptFallback?: string
  } = {},
): GenerationContractSnapshot {
  const requestPrompt =
    task.payload.requestPrompt ||
    task.payload.promptText ||
    task.result?.promptText ||
    input.requestPromptFallback ||
    task.result?.title ||
    task.payload.title
  const workspacePrompt =
    task.payload.workspacePrompt ||
    input.workspacePromptFallback ||
    requestPrompt

  return resolveGenerationContractSnapshot(input.snapshot, {
    scene: input.scene,
    requestPrompt,
    workspacePrompt,
    mode: input.mode ?? task.result?.mode ?? task.payload.mode,
    size: input.size ?? task.result?.size ?? task.payload.size,
    quality: input.quality ?? task.result?.quality ?? task.payload.quality,
    model: input.model ?? task.result?.providerModel ?? task.payload.model,
    providerId: input.providerId ?? task.payload.providerId,
    stream: input.stream ?? task.payload.stream,
    references: input.references,
    draw: input.draw ?? task.payload.draw,
    guidedFlow: input.guidedFlow,
    hasReferences: Boolean(input.references?.count ?? task.payload.referenceImages?.length),
  })
}

export function buildGenerationSnapshotFromContract(
  contract: GenerationContractSnapshot,
  input: {
    id?: string
    createdAt: number
    apiUrl: string
    requestUrl: string
  },
): GenerationSnapshot {
  return {
    id: input.id ?? crypto.randomUUID(),
    createdAt: input.createdAt,
    scene: contract.scene,
    mode: contract.parameters.mode,
    prompt: contract.prompt.request,
    requestPrompt: contract.prompt.request,
    workspacePrompt: contract.prompt.workspace,
    size: contract.parameters.size,
    quality: contract.parameters.quality,
    model: contract.parameters.model,
    providerId: contract.parameters.providerId,
    apiUrl: input.apiUrl,
    requestUrl: input.requestUrl,
    stream: contract.parameters.stream,
    references: contract.references,
    draw: contract.draw,
    guidedFlow: contract.guidedFlow,
    contract,
  }
}
