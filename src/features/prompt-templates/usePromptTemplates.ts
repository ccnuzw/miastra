import { useCallback, useEffect, useState } from 'react'
import { useAuthSession } from '@/features/auth/useAuthSession'
import { apiRequest } from '@/shared/http/client'
import { deleteBrowserValue, readBrowserValue } from '@/shared/storage/browserDatabase'
import type { PromptTemplateListItem } from './PromptTemplateLibrary'

export const promptTemplatesStorageKey = 'new-pic:prompt-templates:v1'

type SavePromptTemplateInput = {
  id?: string
  title: string
  content: string
}

type ImportLocalTemplatesResult = {
  imported: number
  total: number
}

let importLegacyTemplatesInFlight: Promise<ImportLocalTemplatesResult> | null = null

export function normalizeTemplate(template: PromptTemplateListItem): PromptTemplateListItem {
  const now = Date.now()
  const title = template.title?.trim() || template.name?.trim() || '未命名模板'
  return {
    id: template.id || crypto.randomUUID(),
    title,
    name: title,
    content: template.content ?? '',
    createdAt: template.createdAt ?? now,
    updatedAt: template.updatedAt ?? template.createdAt ?? now,
  }
}

export function normalizeTemplates(templates: PromptTemplateListItem[]) {
  if (!Array.isArray(templates)) return []
  return templates.map(normalizeTemplate).sort((a, b) => Number(new Date(b.updatedAt ?? b.createdAt)) - Number(new Date(a.updatedAt ?? a.createdAt)))
}

async function listPromptTemplates() {
  return normalizeTemplates(await apiRequest<PromptTemplateListItem[]>('/api/prompt-templates'))
}

async function savePromptTemplate(input: SavePromptTemplateInput) {
  return normalizeTemplate(await apiRequest<PromptTemplateListItem>('/api/prompt-templates', {
    method: 'POST',
    body: input,
  }))
}

async function deletePromptTemplate(templateId: string) {
  return await apiRequest<{ success: true }>(`/api/prompt-templates/${templateId}`, {
    method: 'DELETE',
  })
}

async function runImportLegacyPromptTemplates() {
  const legacyTemplates = normalizeTemplates(await readBrowserValue<PromptTemplateListItem[]>(promptTemplatesStorageKey, []))
  if (!legacyTemplates.length) return { imported: 0, total: 0 }

  const result = await apiRequest<ImportLocalTemplatesResult>('/api/migrations/import-local-templates', {
    method: 'POST',
    body: { templates: legacyTemplates },
  })

  await deleteBrowserValue(promptTemplatesStorageKey)
  return result
}

export async function importLegacyPromptTemplates() {
  if (!importLegacyTemplatesInFlight) {
    importLegacyTemplatesInFlight = runImportLegacyPromptTemplates().finally(() => {
      importLegacyTemplatesInFlight = null
    })
  }

  return importLegacyTemplatesInFlight
}

export function usePromptTemplates() {
  const { isAuthenticated, loading: authLoading } = useAuthSession()
  const [templates, setTemplates] = useState<PromptTemplateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setTemplates([])
      setError(null)
      setLoading(false)
      return []
    }

    setLoading(true)
    setError(null)
    try {
      const normalized = await listPromptTemplates()
      setTemplates(normalized)
      return normalized
    } catch (nextError) {
      setError(nextError)
      throw nextError
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const hydrate = useCallback(async () => {
    if (!isAuthenticated) {
      setTemplates([])
      setError(null)
      setLoading(false)
      return []
    }

    await importLegacyPromptTemplates()
    return await refresh()
  }, [isAuthenticated, refresh])

  useEffect(() => {
    if (authLoading) return
    void hydrate().catch(() => undefined)
  }, [authLoading, hydrate])

  const saveTemplate = useCallback(async ({ id, title, content }: SavePromptTemplateInput) => {
    if (!content.trim()) throw new Error('Prompt 模板内容不能为空')
    const saved = await savePromptTemplate({
      id,
      title: title.trim() || '未命名模板',
      content,
    })
    setTemplates((current) => normalizeTemplates([
      saved,
      ...current.filter((template) => template.id !== saved.id),
    ]))
    return saved
  }, [])

  const removeTemplate = useCallback(async (templateId: string) => {
    await deletePromptTemplate(templateId)
    setTemplates((current) => current.filter((template) => template.id !== templateId))
  }, [])

  return {
    templates,
    loading: authLoading || loading,
    error,
    refresh,
    saveTemplate,
    deleteTemplate: removeTemplate,
  }
}
