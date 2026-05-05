export type PromptTemplateWorkbenchEntryMode = 'consumer' | 'pro'
export type PromptTemplateWorkbenchEntryIntent = 'task' | 'panel'

export type PromptTemplateStudioLaunch = {
  templateId: string
  mode: PromptTemplateWorkbenchEntryMode
  intent: PromptTemplateWorkbenchEntryIntent
}

const promptTemplateIdParam = 'template'
const promptTemplateModeParam = 'templateMode'
const promptTemplateIntentParam = 'templateEntry'

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
}: PromptTemplateStudioLaunch) {
  const params = new URLSearchParams()
  params.set(promptTemplateIdParam, templateId)
  params.set(promptTemplateModeParam, mode)
  params.set(promptTemplateIntentParam, intent)
  return `/app/studio?${params.toString()}`
}

export function readPromptTemplateStudioLaunch(
  searchParams: URLSearchParams,
): PromptTemplateStudioLaunch | null {
  const templateId = searchParams.get(promptTemplateIdParam)?.trim()
  const mode = searchParams.get(promptTemplateModeParam)
  const intent = searchParams.get(promptTemplateIntentParam)

  if (!templateId) return null
  if (!isPromptTemplateWorkbenchEntryMode(mode)) return null
  if (!isPromptTemplateWorkbenchEntryIntent(intent)) return null

  return {
    templateId,
    mode,
    intent,
  }
}

export function clearPromptTemplateStudioLaunch(searchParams: URLSearchParams) {
  const next = new URLSearchParams(searchParams)
  next.delete(promptTemplateIdParam)
  next.delete(promptTemplateModeParam)
  next.delete(promptTemplateIntentParam)
  return next
}

export function getPromptTemplateStudioLaunchKey(launch: PromptTemplateStudioLaunch) {
  return `${launch.templateId}:${launch.mode}:${launch.intent}`
}
