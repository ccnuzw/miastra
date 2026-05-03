export function createPromptTemplateTitle(content: string) {
  const firstLine = content.split('\n').find((line) => line.trim())?.trim() ?? 'Prompt 模板'
  return firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine
}

export function createDuplicatedPromptTemplateTitle(title: string) {
  const baseTitle = title.trim() || '未命名模板'
  const suffix = '副本'
  const maxLength = 28 - suffix.length - 1
  const clippedTitle = baseTitle.length > maxLength ? `${baseTitle.slice(0, maxLength)}…` : baseTitle
  return `${clippedTitle} ${suffix}`
}

export function normalizePromptTemplateTags(tags: string[] | string | undefined) {
  const values = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(/[,，\n]/) : []
  return Array.from(new Set(values.map((tag) => tag.trim()).filter(Boolean)))
}
