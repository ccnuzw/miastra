import { useCallback, useEffect, useState } from 'react'
import { readBrowserValue, writeBrowserValue } from '@/shared/storage/browserDatabase'
import type { PromptTemplateListItem } from './PromptTemplateLibrary'

const promptTemplatesStorageKey = 'new-pic:prompt-templates:v1'

type SavePromptTemplateInput = {
  id?: string
  title: string
  content: string
}

function normalizeTemplate(template: PromptTemplateListItem): PromptTemplateListItem {
  const now = Date.now()
  return {
    id: template.id || crypto.randomUUID(),
    title: template.title?.trim() || '未命名模板',
    content: template.content ?? '',
    createdAt: template.createdAt ?? now,
    updatedAt: template.updatedAt ?? template.createdAt ?? now,
  }
}

function normalizeTemplates(templates: PromptTemplateListItem[]) {
  if (!Array.isArray(templates)) return []
  return templates.map(normalizeTemplate).sort((a, b) => Number(new Date(b.updatedAt ?? b.createdAt)) - Number(new Date(a.updatedAt ?? a.createdAt)))
}

export function usePromptTemplates() {
  const [templates, setTemplates] = useState<PromptTemplateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const persistTemplates = useCallback(async (nextTemplates: PromptTemplateListItem[]) => {
    const normalized = normalizeTemplates(nextTemplates)
    setTemplates(normalized)
    await writeBrowserValue(promptTemplatesStorageKey, normalized)
    return normalized
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const stored = await readBrowserValue<PromptTemplateListItem[]>(promptTemplatesStorageKey, [])
      const normalized = normalizeTemplates(stored)
      setTemplates(normalized)
      return normalized
    } catch (nextError) {
      setError(nextError)
      throw nextError
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh().catch(() => undefined)
  }, [refresh])

  const saveTemplate = useCallback(async ({ id, title, content }: SavePromptTemplateInput) => {
    const now = Date.now()
    if (!content.trim()) throw new Error('Prompt 模板内容不能为空')
    const nextTemplate: PromptTemplateListItem = {
      id: id || crypto.randomUUID(),
      title: title.trim() || '未命名模板',
      content,
      createdAt: now,
      updatedAt: now,
    }
    const nextTemplates = id
      ? templates.map((template) => template.id === id ? { ...nextTemplate, createdAt: template.createdAt } : template)
      : [nextTemplate, ...templates]
    return persistTemplates(nextTemplates)
  }, [persistTemplates, templates])

  const deleteTemplate = useCallback(async (templateId: string) => {
    return persistTemplates(templates.filter((template) => template.id !== templateId))
  }, [persistTemplates, templates])

  return {
    templates,
    loading,
    error,
    refresh,
    saveTemplate,
    deleteTemplate,
  }
}
