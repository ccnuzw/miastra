export type PromptTemplateWorkbenchEntryMode = 'consumer' | 'pro'
export type PromptTemplateWorkbenchEntryIntent = 'task' | 'panel'

import type { StudioFlowScene } from './studioFlowSemantic'

export type PromptTemplateStructureStatus = 'derived' | 'structured'

export type PromptTemplateFamilyId =
  | 'marketing'
  | 'product'
  | 'character'
  | 'scene'
  | 'illustration'
  | 'generic'

export type PromptTemplateScenarioId =
  | 'poster-campaign'
  | 'product-shot'
  | 'portrait-look'
  | 'space-scene'
  | 'illustration-concept'
  | 'generic-starter'

export type PromptTemplateFieldGroup = 'subject' | 'context' | 'style' | 'output'
export type PromptTemplateFieldInputType = 'text' | 'textarea' | 'single-select' | 'multi-select'

export type PromptTemplateGuidedFieldOption = {
  id: string
  label: string
  prompt: string
}

export type PromptTemplateGuidedFieldConfig = {
  questionTitle?: string
  defaultOptionId?: string
  options: PromptTemplateGuidedFieldOption[]
}

export type PromptTemplateFieldDefinition = {
  id: string
  label: string
  description: string
  group: PromptTemplateFieldGroup
  input: PromptTemplateFieldInputType
  required?: boolean
  examples?: string[]
  guided?: PromptTemplateGuidedFieldConfig
}

export type PromptTemplateStructureDefaultSettings = {
  aspectLabel?: string
  resolutionTier?: '1k' | '2k'
  quality?: 'low' | 'medium' | 'high'
}

export type PromptTemplateStructureSummaryItem = {
  id: string
  label: string
  value: string
}

export type PromptTemplateStructureMeta = {
  status: PromptTemplateStructureStatus
  familyId: PromptTemplateFamilyId
  scenarioId: PromptTemplateScenarioId
  scenarioLabel: string
  sceneDescription: string
  scene: StudioFlowScene
  recommendedMode: PromptTemplateWorkbenchEntryMode
  recommendedIntent: PromptTemplateWorkbenchEntryIntent
  entryModes: PromptTemplateWorkbenchEntryMode[]
  defaults: PromptTemplateStructureDefaultSettings
  fields: PromptTemplateFieldDefinition[]
  summary: PromptTemplateStructureSummaryItem[]
}

export type PromptTemplateListItem = {
  id: string
  title?: string
  content: string
  category?: string
  tags?: string[]
  createdAt: string | number | Date
  updatedAt?: string | number | Date
  lastUsedAt?: string | number | Date
  structure?: PromptTemplateStructureMeta
}
