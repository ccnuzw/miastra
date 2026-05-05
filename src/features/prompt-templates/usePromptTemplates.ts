import { useCallback, useEffect, useState } from 'react'
import { useAuthSession } from '@/features/auth/useAuthSession'
import { apiRequest } from '@/shared/http/client'
import type { PromptTemplateListItem } from './promptTemplate.types'
import { normalizePromptTemplateTags } from './promptTemplate.utils'

type SavePromptTemplateInput = {
  id?: string
  title: string
  content: string
  category?: string
  tags?: string[]
}

export function normalizeTemplate(template: PromptTemplateListItem): PromptTemplateListItem {
  const now = Date.now()
  const title = template.title?.trim() || '未命名模板'
  return {
    id: template.id || crypto.randomUUID(),
    title,
    content: template.content ?? '',
    category: template.category?.trim() || undefined,
    tags: normalizePromptTemplateTags(template.tags),
    createdAt: template.createdAt ?? now,
    updatedAt: template.updatedAt ?? template.createdAt ?? now,
    lastUsedAt: template.lastUsedAt ?? undefined,
  }
}

export function normalizeTemplates(templates: PromptTemplateListItem[]) {
  if (!Array.isArray(templates)) return []
  return templates.map(normalizeTemplate).sort((a, b) => Number(new Date(b.updatedAt ?? b.createdAt)) - Number(new Date(a.updatedAt ?? a.createdAt)))
}

export function sortPromptTemplates(templates: PromptTemplateListItem[], sortMode: 'updated' | 'used') {
  const normalized = normalizeTemplates(templates)
  return normalized.sort((a, b) => {
    const left = sortMode === 'used' ? (b.lastUsedAt ?? b.updatedAt ?? b.createdAt) : (b.updatedAt ?? b.createdAt)
    const right = sortMode === 'used' ? (a.lastUsedAt ?? a.updatedAt ?? a.createdAt) : (a.updatedAt ?? a.createdAt)
    return Number(new Date(left)) - Number(new Date(right))
  })
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

async function markPromptTemplateUsed(templateId: string) {
  return normalizeTemplate(await apiRequest<PromptTemplateListItem>(`/api/prompt-templates/${templateId}/use`, {
    method: 'POST',
  }))
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

    return await refresh()
  }, [isAuthenticated, refresh])

  useEffect(() => {
    if (authLoading) return
    void hydrate().catch(() => undefined)
  }, [authLoading, hydrate])

  const saveTemplate = useCallback(async ({ id, title, content, category, tags }: SavePromptTemplateInput) => {
    if (!content.trim()) throw new Error('Prompt 模板内容不能为空')
    const saved = await savePromptTemplate({
      id,
      title: title.trim() || '未命名模板',
      content,
      category,
      tags,
    })
    setTemplates((current) => normalizeTemplates([
      saved,
      ...current.filter((template) => template.id !== saved.id),
    ]))
    return saved
  }, [])

  const updateTemplateUsage = useCallback(async (templateId: string) => {
    const updated = await markPromptTemplateUsed(templateId)
    setTemplates((current) => normalizeTemplates([
      updated,
      ...current.filter((template) => template.id !== updated.id),
    ]))
    return updated
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
    markTemplateUsed: updateTemplateUsage,
    deleteTemplate: removeTemplate,
  }
}
