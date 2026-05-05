import { getStudioFlowScene } from '@/features/prompt-templates/studioFlowSemantic'
import type { ConsumerGuidedFlowSnapshot } from '@/features/studio-consumer/consumerGuidedFlow'
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

function resolveContractScene(
  scene: StudioFlowScene | undefined,
  guidedFlow: ConsumerGuidedFlowSnapshot | null | undefined,
  hasReferences = false,
) {
  if (scene) return scene
  if (guidedFlow?.scene) return guidedFlow.scene
  return hasReferences ? getStudioFlowScene('image-edit') : getStudioFlowScene()
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
  snapshot?: GenerationSnapshot | null,
  fallback: ResolveGenerationContractSnapshotFallback = {},
): GenerationContractSnapshot {
  const contract = snapshot?.contract
  const guidedFlow = contract?.guidedFlow ?? snapshot?.guidedFlow ?? fallback.guidedFlow ?? null
  const references = contract?.references ?? snapshot?.references ?? fallback.references
  return buildGenerationContractSnapshot({
    scene:
      contract?.scene ??
      snapshot?.scene ??
      fallback.scene,
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
