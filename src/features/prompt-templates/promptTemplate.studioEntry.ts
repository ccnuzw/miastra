import type {
  PromptTemplateListItem,
  PromptTemplateWorkbenchEntryIntent,
  PromptTemplateWorkbenchEntryMode,
} from './promptTemplate.types'
import type {
  StudioFlowActionId,
  StudioFlowSceneId,
  StudioFlowSourceType,
} from './studioFlowSemantic'
import {
  isStudioFlowActionId,
  isStudioFlowSceneId,
  isStudioFlowSourceType,
} from './studioFlowSemantic'
import { buildPromptTemplateRuntimeContext } from './promptTemplate.runtime'

export type PromptTemplateStudioLaunch = {
  templateId: string
  mode: PromptTemplateWorkbenchEntryMode
  intent: PromptTemplateWorkbenchEntryIntent
  sceneId?: StudioFlowSceneId
  sourceType?: StudioFlowSourceType
  nextAction?: StudioFlowActionId
}

export type PromptTemplateStudioLaunchInput = {
  templateId: string
  sceneId?: StudioFlowSceneId
  sourceType?: StudioFlowSourceType
  mode: PromptTemplateWorkbenchEntryMode
  intent: PromptTemplateWorkbenchEntryIntent
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

function inferIntentFromMode(
  value?: PromptTemplateWorkbenchEntryMode | null,
): PromptTemplateWorkbenchEntryIntent | null {
  if (!value) return null
  return value === 'consumer' ? 'task' : 'panel'
}

function inferModeFromIntent(
  value?: PromptTemplateWorkbenchEntryIntent | null,
): PromptTemplateWorkbenchEntryMode | null {
  if (!value) return null
  return value === 'task' ? 'consumer' : 'pro'
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

export function buildPromptTemplateStudioLaunch(
  input: PromptTemplateStudioLaunchInput,
): PromptTemplateStudioLaunch {
  return {
    templateId: input.templateId,
    mode: input.mode,
    intent: input.intent,
    sceneId: input.sceneId,
    sourceType: input.sourceType ?? 'template',
    nextAction: input.nextAction,
  }
}

export function readPromptTemplateStudioLaunch(
  searchParams: URLSearchParams,
): PromptTemplateStudioLaunch | null {
  const templateId = searchParams.get(promptTemplateIdParam)?.trim()
  const modeValue = searchParams.get(studioModeParam) ?? searchParams.get(promptTemplateModeParam)
  const intentValue =
    searchParams.get(studioIntentParam) ?? searchParams.get(promptTemplateIntentParam)
  const sceneIdValue = searchParams.get(studioSceneParam)
  const sourceTypeValue = searchParams.get(studioSourceTypeParam)
  const nextActionValue = searchParams.get(studioNextActionParam)

  if (!templateId) return null
  const mode = isPromptTemplateWorkbenchEntryMode(modeValue)
    ? modeValue
    : inferModeFromIntent(isPromptTemplateWorkbenchEntryIntent(intentValue) ? intentValue : null)
  const intent = isPromptTemplateWorkbenchEntryIntent(intentValue)
    ? intentValue
    : inferIntentFromMode(mode)
  if (!mode) return null
  if (!intent) return null

  return {
    templateId,
    mode,
    intent,
    sceneId: isStudioFlowSceneId(sceneIdValue) ? sceneIdValue : undefined,
    sourceType: isStudioFlowSourceType(sourceTypeValue) ? sourceTypeValue : 'template',
    nextAction: isStudioFlowActionId(nextActionValue) ? nextActionValue : undefined,
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

export function resolvePromptTemplateStudioLaunch(
  template: PromptTemplateListItem,
  launch: PromptTemplateStudioLaunch,
): PromptTemplateStudioLaunch {
  const runtimeContext = buildPromptTemplateRuntimeContext(template, launch.mode, {
    sceneId: launch.sceneId,
    sourceType: launch.sourceType,
    nextActionId: launch.nextAction,
  })

  return {
    templateId: launch.templateId,
    mode: runtimeContext.mode,
    intent: runtimeContext.intent,
    sceneId: runtimeContext.sceneId,
    sourceType: runtimeContext.sourceType,
    nextAction: runtimeContext.nextActionId,
  }
}
