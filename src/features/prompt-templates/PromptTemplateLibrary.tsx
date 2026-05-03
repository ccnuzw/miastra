import { useEffect, useState } from 'react'
import { BookOpen, Check, ClipboardCopy, Clock3, Copy, Filter, Loader2, RefreshCw, Search, Sparkles, Tag, Trash2, X } from 'lucide-react'
import { createDuplicatedPromptTemplateTitle, normalizePromptTemplateTags } from './promptTemplate.utils'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

export type PromptTemplateListItem = {
  id: string
  title?: string
  name?: string
  content: string
  category?: string
  tags?: string[]
  createdAt: string | number | Date
  updatedAt?: string | number | Date
  lastUsedAt?: string | number | Date
}

type PromptTemplateLibraryProps = {
  open: boolean
  templates: PromptTemplateListItem[]
  loading?: boolean
  error?: string | null
  currentPrompt: string
  saveFeedback?: string
  onSaveCurrent: () => void | Promise<void>
  onApply: (template: PromptTemplateListItem) => void
  onDuplicate: (template: PromptTemplateListItem) => void | Promise<void>
  onDelete: (templateId: string) => void | Promise<void>
  onRefresh?: () => void | Promise<void>
  onClose: () => void
}

function formatTemplateDate(value: string | number | Date) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getPromptPreview(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  return normalized || '空模板'
}

function getTemplateTitle(template: PromptTemplateListItem) {
  return template.title || template.name || '未命名模板'
}

function getTemplateSearchText(template: PromptTemplateListItem) {
  return `${template.title ?? ''} ${template.name ?? ''} ${template.content ?? ''} ${template.category ?? ''} ${template.tags?.join(' ') ?? ''}`.toLowerCase()
}

function getTemplateCategory(template: PromptTemplateListItem) {
  return template.category?.trim() || '未分类'
}

function getTemplateTags(template: PromptTemplateListItem) {
  return normalizePromptTemplateTags(template.tags)
}

function getTemplateSortTime(template: PromptTemplateListItem, sortMode: 'updated' | 'used') {
  const value = sortMode === 'used' ? (template.lastUsedAt ?? template.updatedAt ?? template.createdAt) : (template.updatedAt ?? template.createdAt)
  return Number(new Date(value))
}

function getTemplateSortDate(template: PromptTemplateListItem, sortMode: 'updated' | 'used') {
  return sortMode === 'used' ? (template.lastUsedAt ?? template.updatedAt ?? template.createdAt) : (template.updatedAt ?? template.createdAt)
}

export function PromptTemplateLibrary({
  open,
  templates,
  loading = false,
  error,
  currentPrompt,
  saveFeedback,
  onSaveCurrent,
  onApply,
  onDuplicate,
  onDelete,
  onRefresh,
  onClose,
}: PromptTemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('全部分类')
  const [tagFilter, setTagFilter] = useState('')
  const [sortMode, setSortMode] = useState<'updated' | 'used'>('updated')
  const [copiedTemplateId, setCopiedTemplateId] = useState('')

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setCategoryFilter('全部分类')
      setTagFilter('')
      setSortMode('updated')
      setCopiedTemplateId('')
    }
  }, [open])

  if (!open) return null

  const canSaveCurrent = currentPrompt.trim().length > 0
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const normalizedTagFilter = tagFilter.trim().toLowerCase()
  const hasActiveFilters = normalizedSearchQuery.length > 0 || normalizedTagFilter.length > 0 || categoryFilter !== '全部分类'
  const categories = Array.from(new Set(templates.map((template) => getTemplateCategory(template)))).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
  const filteredTemplates = templates
    .filter((template) => {
      if (categoryFilter !== '全部分类' && getTemplateCategory(template) !== categoryFilter) return false
      if (normalizedTagFilter && !getTemplateTags(template).some((tag) => tag.toLowerCase().includes(normalizedTagFilter))) return false
      if (normalizedSearchQuery && !getTemplateSearchText(template).includes(normalizedSearchQuery)) return false
      return true
    })
    .sort((a, b) => getTemplateSortTime(b, sortMode) - getTemplateSortTime(a, sortMode))

  async function handleCopyTemplate(template: PromptTemplateListItem) {
    try {
      await navigator.clipboard.writeText(template.content)
      setCopiedTemplateId(template.id)
      window.setTimeout(() => setCopiedTemplateId(''), 1400)
    } catch {
      setCopiedTemplateId(template.id)
      window.setTimeout(() => setCopiedTemplateId(''), 1400)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Prompt 模板库">
      <div className="modal-card prompt-template-modal-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Prompt Library</p>
            <h2 className="mt-2 font-display text-4xl leading-none">模板库</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-porcelain-100/[0.6]">
              只保存当前 Prompt 文本，不会保存尺寸、风格、负面提示词或抽卡参数。模板会保存到当前登录账号的服务端模板库。
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="关闭模板库">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="prompt-template-toolbar">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="prompt-template-current">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-signal-cyan/10 text-signal-cyan">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-porcelain-50">保存当前 Prompt</p>
                <p className="mt-1 truncate text-xs text-porcelain-100/45">
                  {canSaveCurrent ? getPromptPreview(currentPrompt) : '当前 Prompt 为空，无法保存为模板'}
                </p>
              </div>
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="prompt-template-search">
                <Search className="h-3.5 w-3.5" />
                关键词搜索
              </label>
              <div className="prompt-template-search-row">
                <Search className="ml-1 h-4 w-4 shrink-0 text-signal-cyan" />
                <input
                  id="prompt-template-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="按标题、名称、分类、标签或内容搜索"
                  className="prompt-template-search-input"
                />
                {searchQuery.length > 0 && (
                  <button type="button" onClick={() => setSearchQuery('')} className="prompt-template-search-clear">
                    清空
                  </button>
                )}
              </div>
            </div>

            <div className="prompt-template-filter-grid">
              <label className="field-block">
                <span className="field-label">
                  <Filter className="h-3.5 w-3.5" />
                  分类
                </span>
                <select className="input-shell" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="全部分类">全部分类</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="field-block">
                <span className="field-label">
                  <Tag className="h-3.5 w-3.5" />
                  标签筛选
                </span>
                <input
                  className="input-shell"
                  value={tagFilter}
                  onChange={(event) => setTagFilter(event.target.value)}
                  placeholder="输入标签关键词"
                />
              </label>

              <label className="field-block">
                <span className="field-label">
                  <Clock3 className="h-3.5 w-3.5" />
                  排序
                </span>
                <select className="input-shell" value={sortMode} onChange={(event) => setSortMode(event.target.value as 'updated' | 'used')}>
                  <option value="updated">按更新时间</option>
                  <option value="used">按最近使用</option>
                </select>
              </label>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {onRefresh && (
              <button type="button" onClick={onRefresh} className="settings-button" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                刷新
              </button>
            )}
            <button
              type="button"
              onClick={onSaveCurrent}
              className="generate-button"
              disabled={loading || !canSaveCurrent}
              title={canSaveCurrent ? '保存当前 Prompt 为模板' : 'Prompt 为空，无法保存'}
            >
              <Check className="h-5 w-5" />
              保存为模板
            </button>
          </div>
        </div>

        {saveFeedback && (
          <div className="prompt-template-feedback" role="status" aria-live="polite">
            {saveFeedback}
          </div>
        )}

        {error ? <ErrorNotice error={error} className="mt-4" compact /> : null}

        <div className="prompt-template-list" aria-busy={loading}>
          {loading && templates.length === 0 ? (
            <div className="prompt-template-empty">
              <Loader2 className="h-6 w-6 animate-spin text-signal-cyan" />
              <p>正在读取模板库…</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="prompt-template-empty">
              {hasActiveFilters ? <Search className="h-8 w-8 text-signal-cyan" /> : <BookOpen className="h-8 w-8 text-signal-cyan" />}
              <p className="text-base font-bold text-porcelain-50">{hasActiveFilters ? '没有匹配的模板' : '还没有 Prompt 模板'}</p>
              <span>{hasActiveFilters ? '换个关键词、分类或标签试试，或清空筛选恢复全部模板。' : '输入 Prompt 后点击“保存为模板”，它会出现在这里。'}</span>
              {hasActiveFilters && (
                  <button type="button" className="settings-button" onClick={() => { setSearchQuery(''); setCategoryFilter('全部分类'); setTagFilter('') }}>
                    清空筛选
                  </button>
                )}
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <article key={template.id} className="prompt-template-card">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-porcelain-50">{getTemplateTitle(template)}</h3>
                    <span className="rounded-full border border-porcelain-50/10 bg-ink-950/55 px-2.5 py-1 text-[10px] font-bold text-porcelain-100/45">
                      {formatTemplateDate(getTemplateSortDate(template, sortMode))}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="prompt-template-chip">{getTemplateCategory(template)}</span>
                    {getTemplateTags(template).map((tag) => <span key={tag} className="prompt-template-chip prompt-template-chip-tag">{tag}</span>)}
                  </div>
                  <p className="prompt-template-preview">{getPromptPreview(template.content)}</p>
                </div>
                <div className="prompt-template-actions">
                  <button type="button" className="settings-button" onClick={() => onApply(template)}>
                    <Search className="h-4 w-4" />
                    应用
                  </button>
                  <button type="button" className="settings-button" onClick={() => void onDuplicate(template)} aria-label={`复制为新模板 ${createDuplicatedPromptTemplateTitle(getTemplateTitle(template))}`}>
                    <Copy className="h-4 w-4" />
                    复制为新模板
                  </button>
                  <button type="button" className="settings-button" onClick={() => handleCopyTemplate(template)} aria-label={`复制模板 ${getTemplateTitle(template)}`}>
                    {copiedTemplateId === template.id ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                    {copiedTemplateId === template.id ? '已复制内容' : '复制内容'}
                  </button>
                  <button type="button" className="tile-action tile-action-danger" onClick={() => onDelete(template.id)} aria-label={`删除模板 ${getTemplateTitle(template)}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
