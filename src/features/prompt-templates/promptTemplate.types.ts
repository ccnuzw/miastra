export type PromptTemplateListItem = {
  id: string
  title?: string
  content: string
  category?: string
  tags?: string[]
  createdAt: string | number | Date
  updatedAt?: string | number | Date
  lastUsedAt?: string | number | Date
}
