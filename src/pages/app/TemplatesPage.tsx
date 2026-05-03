import { useEffect, useState } from 'react'
import { ClipboardCopy, Clock3, Copy, Filter, RefreshCw, Search, Trash2 } from 'lucide-react'
import { usePromptTemplates } from '@/features/prompt-templates/usePromptTemplates'
import { createDuplicatedPromptTemplateTitle, normalizePromptTemplateTags } from '@/features/prompt-templates/promptTemplate.utils'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

export function TemplatesPage() {
  const { templates, loading, error, refresh, saveTemplate, deleteTemplate } = usePromptTemplates()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [editingId, setEditingId] = useState('')
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('全部分类')
  const [sortMode, setSortMode] = useState<'updated' | 'used'>('updated')

  useEffect(() => {
    if (!editingId) return
    const current = templates.find((item) => item.id === editingId)
    if (current) {
      setTitle(current.title || current.name || '')
      setContent(current.content || '')
      setCategory(current.category || '')
      setTagsText((current.tags ?? []).join(', '))
    }
  }, [editingId, templates])

  const categories = Array.from(new Set(templates.map((template) => template.category?.trim() || '未分类'))).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
  const filteredTemplates = [...templates]
    .sort((a, b) => {
      const left = sortMode === 'used' ? (b.lastUsedAt ?? b.updatedAt ?? b.createdAt) : (b.updatedAt ?? b.createdAt)
      const right = sortMode === 'used' ? (a.lastUsedAt ?? a.updatedAt ?? a.createdAt) : (a.updatedAt ?? a.createdAt)
      return Number(new Date(left)) - Number(new Date(right))
    })
    .filter((template) => {
      if (categoryFilter !== '全部分类' && (template.category?.trim() || '未分类') !== categoryFilter) return false
      const haystack = `${template.title ?? ''} ${template.name ?? ''} ${template.content ?? ''} ${template.category ?? ''} ${(template.tags ?? []).join(' ')}`.toLowerCase()
      return haystack.includes(searchQuery.trim().toLowerCase())
    })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyId('save')
    setMessage('')
    try {
      await saveTemplate({
        id: editingId || undefined,
        title,
        content,
        category: category.trim() || undefined,
        tags: normalizePromptTemplateTags(tagsText),
      })
      setTitle('')
      setContent('')
      setCategory('')
      setTagsText('')
      setEditingId('')
      setMessage('模板已保存。')
      await refresh()
    } finally {
      setBusyId('')
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id)
    setMessage('')
    try {
      await deleteTemplate(id)
      setMessage('模板已删除。')
      await refresh()
    } finally {
      setBusyId('')
    }
  }

  async function handleDuplicate(template: (typeof templates)[number]) {
    setBusyId(template.id)
    setMessage('')
    try {
      await saveTemplate({
        title: createDuplicatedPromptTemplateTitle(template.title || template.name || '未命名模板'),
        content: template.content,
        category: template.category?.trim() || undefined,
        tags: template.tags,
      })
      setMessage('已复制为新模板。')
      await refresh()
    } finally {
      setBusyId('')
    }
  }

  async function handleCopyContent(contentToCopy: string, id: string) {
    setBusyId(id)
    try {
      await navigator.clipboard.writeText(contentToCopy)
      setMessage('模板内容已复制。')
    } catch {
      setMessage('复制失败。')
    } finally {
      setBusyId('')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-screen-xl px-4 pb-10 pt-32 md:px-8">
      <section className="panel-shell w-full">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Assets</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">模板资产</h1>
            <p className="mt-2 text-sm text-porcelain-100/60">支持分类、标签、复制为新模板和按最近使用/更新时间排序。</p>
          </div>
          <button className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan" type="button" onClick={() => void refresh()}>
            <RefreshCw className="mr-2 inline h-4 w-4" />
            刷新
          </button>
        </div>

        {error ? <ErrorNotice error={error} className="mt-6" /> : null}
        {loading ? <p className="mt-6 text-sm text-porcelain-100/60">正在加载模板…</p> : null}
        {message ? <p className="mt-6 text-sm text-signal-cyan">{message}</p> : null}

        <form className="mt-8 grid gap-4 rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field-block">
              <span className="field-label">标题</span>
              <input className="input-shell" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="field-block">
              <span className="field-label">分类</span>
              <input className="input-shell" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="如：海报 / 角色 / 电商" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field-block md:col-span-2">
              <span className="field-label">内容</span>
              <textarea className="prompt-area min-h-40" value={content} onChange={(e) => setContent(e.target.value)} required />
            </label>
            <label className="field-block md:col-span-2">
              <span className="field-label">标签</span>
              <input className="input-shell" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="用逗号分隔，例如：产品, 营销, 轻奢" />
            </label>
          </div>
          <div className="flex gap-3">
            <button className="rounded-2xl bg-signal-cyan px-4 py-3 text-sm font-bold text-ink-950" type="submit" disabled={busyId === 'save'}>
              {busyId === 'save' ? '保存中…' : editingId ? '更新模板' : '新增模板'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="rounded-2xl border border-porcelain-50/10 px-4 py-3 text-sm"
                onClick={() => {
                  setEditingId('')
                  setTitle('')
                  setContent('')
                  setCategory('')
                  setTagsText('')
                }}
              >
                取消编辑
              </button>
            ) : null}
          </div>
        </form>

        <div className="mt-8 grid gap-4 rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <label className="field-block">
            <span className="field-label">
              <Search className="h-3.5 w-3.5" />
              搜索
            </span>
            <input className="input-shell" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="按标题、标签或内容搜索" />
          </label>
          <label className="field-block">
            <span className="field-label">
              <Filter className="h-3.5 w-3.5" />
              分类筛选
            </span>
            <select className="input-shell" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="全部分类">全部分类</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="field-block">
            <span className="field-label">
              <Clock3 className="h-3.5 w-3.5" />
              排序
            </span>
            <select className="input-shell" value={sortMode} onChange={(e) => setSortMode(e.target.value as 'updated' | 'used')}>
              <option value="updated">按更新时间</option>
              <option value="used">按最近使用</option>
            </select>
          </label>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <article key={template.id} className="progress-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-porcelain-50">{template.title || template.name || '未命名模板'}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="prompt-template-chip">{template.category?.trim() || '未分类'}</span>
                    {(template.tags ?? []).map((tag) => <span key={tag} className="prompt-template-chip prompt-template-chip-tag">{tag}</span>)}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-porcelain-50/10 bg-ink-950/55 px-2.5 py-1 text-[10px] font-bold text-porcelain-100/45">
                  {new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(sortMode === 'used' ? (template.lastUsedAt ?? template.updatedAt ?? template.createdAt) : (template.updatedAt ?? template.createdAt)))}
                </span>
              </div>
              <p className="mt-3 line-clamp-5 text-sm leading-6 text-porcelain-100/60">{template.content}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs" onClick={() => setEditingId(template.id)} disabled={busyId === template.id}>
                  编辑
                </button>
                <button type="button" className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs" onClick={() => void handleDuplicate(template)} disabled={busyId === template.id}>
                  <Copy className="mr-1 inline h-3.5 w-3.5" />
                  复制为新模板
                </button>
                <button type="button" className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs" onClick={() => void handleCopyContent(template.content, template.id)} disabled={busyId === template.id}>
                  <ClipboardCopy className="mr-1 inline h-3.5 w-3.5" />
                  复制内容
                </button>
                <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral" onClick={() => void handleDelete(template.id)} disabled={busyId === template.id}>
                  <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                  {busyId === template.id ? '处理中…' : '删除'}
                </button>
              </div>
            </article>
          ))}
          {!loading && filteredTemplates.length === 0 ? <div className="progress-card text-sm text-porcelain-100/60">当前没有匹配的模板。</div> : null}
        </div>
      </section>
    </main>
  )
}
