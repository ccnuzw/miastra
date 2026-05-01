import { useEffect, useState } from 'react'
import { AlertTriangle, BookOpen, Check, Loader2, RefreshCw, Search, Sparkles, Trash2, X } from 'lucide-react'

export type PromptTemplateListItem = {
  id: string
  title?: string
  name?: string
  content: string
  createdAt: string | number | Date
  updatedAt?: string | number | Date
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
  return `${template.title ?? ''} ${template.name ?? ''} ${template.content ?? ''}`.toLowerCase()
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
  onDelete,
  onRefresh,
  onClose,
}: PromptTemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!open) setSearchQuery('')
  }, [open])

  if (!open) return null

  const canSaveCurrent = currentPrompt.trim().length > 0
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const isSearching = normalizedSearchQuery.length > 0
  const filteredTemplates = isSearching
    ? templates.filter((template) => getTemplateSearchText(template).includes(normalizedSearchQuery))
    : templates

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Prompt 模板库">
      <div className="modal-card prompt-template-modal-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Prompt Library</p>
            <h2 className="mt-2 font-display text-4xl leading-none">模板库</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-porcelain-100/[0.6]">
              只保存当前 Prompt 文本，不会保存尺寸、风格、负面提示词或抽卡参数。模板会持久化在浏览器本地 IndexedDB。
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
                  placeholder="按标题、名称或内容搜索"
                  className="prompt-template-search-input"
                />
                {searchQuery.length > 0 && (
                  <button type="button" onClick={() => setSearchQuery('')} className="prompt-template-search-clear">
                    清空
                  </button>
                )}
              </div>
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

        {error && (
          <div className="prompt-template-error" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="prompt-template-list" aria-busy={loading}>
          {loading && templates.length === 0 ? (
            <div className="prompt-template-empty">
              <Loader2 className="h-6 w-6 animate-spin text-signal-cyan" />
              <p>正在读取模板库…</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="prompt-template-empty">
              {isSearching ? <Search className="h-8 w-8 text-signal-cyan" /> : <BookOpen className="h-8 w-8 text-signal-cyan" />}
              <p className="text-base font-bold text-porcelain-50">{isSearching ? '没有匹配的模板' : '还没有 Prompt 模板'}</p>
              <span>{isSearching ? '换个关键词试试，或清空搜索恢复全部模板。' : '输入 Prompt 后点击“保存为模板”，它会出现在这里。'}</span>
              {isSearching && (
                <button type="button" className="settings-button" onClick={() => setSearchQuery('')}>
                  清空关键词
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
                      {formatTemplateDate(template.updatedAt ?? template.createdAt)}
                    </span>
                  </div>
                  <p className="prompt-template-preview">{getPromptPreview(template.content)}</p>
                </div>
                <div className="prompt-template-actions">
                  <button type="button" className="settings-button" onClick={() => onApply(template)}>
                    <Search className="h-4 w-4" />
                    应用
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
