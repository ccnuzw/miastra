import type {
  PromptTemplateWorkbenchEntryIntent,
  PromptTemplateWorkbenchEntryMode,
} from './promptTemplate.types'
import type {
  StudioFlowActionId,
  StudioFlowSceneId,
  StudioFlowSourceType,
} from './studioFlowSemantic'

export type PromptTemplateStudioLaunch = {
  templateId: string
  mode: PromptTemplateWorkbenchEntryMode
  intent: PromptTemplateWorkbenchEntryIntent
  sceneId?: StudioFlowSceneId
  sourceType?: StudioFlowSourceType
  nextAction?: StudioFlowActionId
}

const promptTemplateIdParam = 'template'
const promptTemplateModeParam = 'templateMode'
const promptTemplateIntentParam = 'templateEntry'
const studioSceneParam = 'scene'
const studioSourceTypeParam = 'source'
const studioModeParam = 'entryMode'
const studioIntentParam = 'entryIntent'
const studioNextActionParam = 'nextAction'

function isPromptTemplateWorkbenchEntryMode(
  value: string | null,
): value is PromptTemplateWorkbenchEntryMode {
  return value === 'consumer' || value === 'pro'
}

function isPromptTemplateWorkbenchEntryIntent(
  value: string | null,
): value is PromptTemplateWorkbenchEntryIntent {
  return value === 'task' || value === 'panel'
}

export function buildPromptTemplateStudioPath({
  templateId,
  mode,
  intent,
  sceneId,
  sourceType = 'template',
  nextAction,
}: PromptTemplateStudioLaunch) {
  const params = new URLSearchParams()
  params.set(promptTemplateIdParam, templateId)
  params.set(promptTemplateModeParam, mode)
  params.set(promptTemplateIntentParam, intent)
  params.set(studioModeParam, mode)
  params.set(studioIntentParam, intent)
  params.set(studioSourceTypeParam, sourceType)
  if (sceneId) params.set(studioSceneParam, sceneId)
  if (nextAction) params.set(studioNextActionParam, nextAction)
  return `/app/studio?${params.toString()}`
}

export function readPromptTemplateStudioLaunch(
  searchParams: URLSearchParams,
): PromptTemplateStudioLaunch | null {
  const templateId = searchParams.get(promptTemplateIdParam)?.trim()
  const mode = searchParams.get(studioModeParam) ?? searchParams.get(promptTemplateModeParam)
  const intent = searchParams.get(studioIntentParam) ?? searchParams.get(promptTemplateIntentParam)
  const sceneId = searchParams.get(studioSceneParam) as StudioFlowSceneId | null
  const sourceType = searchParams.get(studioSourceTypeParam) as StudioFlowSourceType | null
  const nextAction = searchParams.get(studioNextActionParam) as StudioFlowActionId | null

  if (!templateId) return null
  if (!isPromptTemplateWorkbenchEntryMode(mode)) return null
  if (!isPromptTemplateWorkbenchEntryIntent(intent)) return null

  return {
    templateId,
    mode,
    intent,
    sceneId: sceneId ?? undefined,
    sourceType: sourceType ?? 'template',
    nextAction: nextAction ?? undefined,
  }
}

export function clearPromptTemplateStudioLaunch(searchParams: URLSearchParams) {
  const next = new URLSearchParams(searchParams)
  next.delete(promptTemplateIdParam)
  next.delete(promptTemplateModeParam)
  next.delete(promptTemplateIntentParam)
  next.delete(studioSceneParam)
  next.delete(studioSourceTypeParam)
  next.delete(studioModeParam)
  next.delete(studioIntentParam)
  next.delete(studioNextActionParam)
  return next
}

export function getPromptTemplateStudioLaunchKey(launch: PromptTemplateStudioLaunch) {
  return `${launch.templateId}:${launch.mode}:${launch.intent}:${launch.sceneId ?? ''}:${launch.sourceType ?? 'template'}:${launch.nextAction ?? ''}`
}
