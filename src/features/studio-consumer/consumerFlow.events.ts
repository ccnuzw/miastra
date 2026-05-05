import type {
  StudioFlowActionId,
  StudioFlowSceneId,
  StudioFlowSourceType,
} from '@/features/prompt-templates/studioFlowSemantic'

export const studioConsumerIntentEvent = 'studio-consumer:intent'

export type StudioConsumerIntent = {
  type: 'prompt'
  text?: string
  mode?: 'replace' | 'append' | 'followup'
  sceneId?: StudioFlowSceneId
  sourceType?: StudioFlowSourceType
  actionId?: StudioFlowActionId
  submit?: boolean
  focus?: boolean
  openUpload?: boolean
  attachPreview?: {
    src: string
    title?: string
  }
}

export function dispatchStudioConsumerIntent(detail: StudioConsumerIntent) {
  window.dispatchEvent(new CustomEvent<StudioConsumerIntent>(studioConsumerIntentEvent, { detail }))
}
