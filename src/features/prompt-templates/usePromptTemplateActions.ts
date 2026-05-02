import { useState } from 'react'
import type { PromptTemplateListItem } from './PromptTemplateLibrary'
import { createPromptTemplateTitle } from './promptTemplate.utils'

export type SavePromptTemplateInput = {
  title: string
  content: string
}

type UsePromptTemplateActionsOptions = {
  prompt: string
  setPrompt: (value: string) => void
  setStatus: (value: 'success' | 'error' | 'loading' | 'idle') => void
  setStatusText: (value: string) => void
  saveTemplate: (template: SavePromptTemplateInput) => Promise<unknown> | unknown
  deleteTemplate: (templateId: string) => Promise<unknown> | unknown
  refreshPromptTemplates: () => Promise<unknown> | unknown
}

export function usePromptTemplateActions({
  prompt,
  setPrompt,
  setStatus,
  setStatusText,
  saveTemplate,
  deleteTemplate,
  refreshPromptTemplates,
}: UsePromptTemplateActionsOptions) {
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false)
  const [templateFeedback, setTemplateFeedback] = useState('')

  function handleOpenTemplateLibrary() {
    setTemplateLibraryOpen(true)
    setTemplateFeedback('')
    void Promise.resolve(refreshPromptTemplates()).catch(() => undefined)
  }

  async function handleSaveCurrentPromptTemplate() {
    const content = prompt.trim()
    if (!content) {
      const message = 'Prompt 为空，无法保存为模板'
      setTemplateFeedback(message)
      setStatus('error')
      setStatusText(message)
      return
    }

    try {
      await saveTemplate({
        title: createPromptTemplateTitle(content),
        content,
      })
      const message = '已保存当前 Prompt 为模板'
      setTemplateFeedback(message)
      setStatus('success')
      setStatusText(message)
      void Promise.resolve(refreshPromptTemplates()).catch(() => undefined)
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存 Prompt 模板失败'
      setTemplateFeedback(message)
      setStatus('error')
      setStatusText(message)
    }
  }

  function handleApplyPromptTemplate(template: PromptTemplateListItem) {
    setPrompt(template.content)
    setTemplateLibraryOpen(false)
    setTemplateFeedback('')
    setStatus('success')
    setStatusText(`已应用 Prompt 模板：${template.title || template.name || '未命名模板'}`)
    window.setTimeout(() => document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  async function handleDeletePromptTemplate(templateId: string) {
    try {
      await deleteTemplate(templateId)
      const message = '已删除 Prompt 模板'
      setTemplateFeedback(message)
      setStatus('success')
      setStatusText(message)
      void Promise.resolve(refreshPromptTemplates()).catch(() => undefined)
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除 Prompt 模板失败'
      setTemplateFeedback(message)
      setStatus('error')
      setStatusText(message)
    }
  }

  return {
    templateLibraryOpen,
    templateFeedback,
    setTemplateLibraryOpen,
    handleOpenTemplateLibrary,
    handleSaveCurrentPromptTemplate,
    handleApplyPromptTemplate,
    handleDeletePromptTemplate,
  }
}
