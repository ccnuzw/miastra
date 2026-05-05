export const studioConsumerIntentEvent = 'studio-consumer:intent'

export type StudioConsumerIntent = {
  type: 'prompt'
  text?: string
  mode?: 'replace' | 'append' | 'followup'
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
