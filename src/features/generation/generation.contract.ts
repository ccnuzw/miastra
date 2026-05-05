import { getStudioFlowScene } from '@/features/prompt-templates/studioFlowSemantic'
import type { ConsumerGuidedFlowSnapshot } from '@/features/studio-consumer/consumerGuidedFlow'
import type { ReferenceImage } from '@/features/references/reference.types'
import type { GalleryImage } from '@/features/works/works.types'
import type {
  GenerationContractSnapshot,
  GenerationDrawSnapshot,
  GenerationMode,
  GenerationParameterSnapshot,
  GenerationPromptSnapshot,
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

type ResolveGenerationContractSnapshotDefaults = {
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

type ResolveGenerationSnapshotRecordDefaults = ResolveGenerationContractSnapshotDefaults & {
  sourceContract?: GenerationContractSnapshot
  id?: string
  createdAt?: number
  apiUrl?: string
  requestUrl?: string
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

function resolveContractPromptSnapshot(
  snapshot?: Partial<GenerationSnapshot> | null,
  defaults: ResolveGenerationContractSnapshotDefaults = {},
): GenerationPromptSnapshot {
  const contractPrompt = snapshot?.contract?.prompt
  const request =
    contractPrompt?.request ??
    snapshot?.requestPrompt ??
    snapshot?.prompt ??
    defaults.requestPrompt ??
    ''
  return {
    request,
    workspace:
      contractPrompt?.workspace ??
      snapshot?.workspacePrompt ??
      defaults.workspacePrompt ??
      snapshot?.requestPrompt ??
      snapshot?.prompt ??
      defaults.requestPrompt ??
      '',
  }
}

function resolveContractParameterSnapshot(
  snapshot?: Partial<GenerationSnapshot> | null,
  defaults: ResolveGenerationContractSnapshotDefaults = {},
): GenerationParameterSnapshot {
  return {
    mode: snapshot?.contract?.parameters.mode ?? snapshot?.mode ?? defaults.mode ?? 'text2image',
    size: snapshot?.contract?.parameters.size ?? snapshot?.size ?? defaults.size ?? '',
    quality: snapshot?.contract?.parameters.quality ?? snapshot?.quality ?? defaults.quality ?? '',
    model: snapshot?.contract?.parameters.model ?? snapshot?.model ?? defaults.model ?? '',
    providerId:
      snapshot?.contract?.parameters.providerId ??
      snapshot?.providerId ??
      defaults.providerId ??
      '',
    stream: snapshot?.contract?.parameters.stream ?? snapshot?.stream ?? defaults.stream ?? false,
  }
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
  defaults: ResolveGenerationContractSnapshotDefaults = {},
): GenerationContractSnapshot {
  const contract = snapshot?.contract
  const guidedFlow = contract?.guidedFlow ?? snapshot?.guidedFlow ?? defaults.guidedFlow ?? null
  const references = contract?.references ?? snapshot?.references ?? defaults.references
  const prompt = resolveContractPromptSnapshot(snapshot, defaults)
  const parameters = resolveContractParameterSnapshot(snapshot, defaults)
  const resolvedScene =
    contract?.scene ??
    snapshot?.scene ??
    defaults.scene ??
    resolveContractScene(undefined, guidedFlow, Boolean(references?.count ?? defaults.hasReferences))
  return buildGenerationContractSnapshot({
    scene: resolvedScene,
    requestPrompt: prompt.request,
    workspacePrompt: prompt.workspace,
    mode: parameters.mode,
    size: parameters.size,
    quality: parameters.quality,
    model: parameters.model,
    providerId: parameters.providerId,
    stream: parameters.stream,
    references,
    draw: contract?.draw ?? snapshot?.draw ?? defaults.draw,
    guidedFlow,
  })
}

export function resolveGenerationSnapshotRecord(
  snapshot?: Partial<GenerationSnapshot> | null,
  defaults: ResolveGenerationSnapshotRecordDefaults = {},
): GenerationSnapshot & { contract: GenerationContractSnapshot } {
  const contract = defaults.sourceContract ?? resolveGenerationContractSnapshot(snapshot, defaults)
  return buildGenerationSnapshotFromContract(contract, {
    id: snapshot?.id ?? defaults.id,
    createdAt: snapshot?.createdAt ?? defaults.createdAt ?? Date.now(),
    apiUrl: snapshot?.apiUrl ?? defaults.apiUrl ?? '',
    requestUrl: snapshot?.requestUrl ?? defaults.requestUrl ?? '',
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
    references: work.generationSnapshot?.references,
    draw: work.generationSnapshot?.draw,
    guidedFlow: work.generationSnapshot?.guidedFlow,
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
): GenerationSnapshot & { contract: GenerationContractSnapshot } {
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
