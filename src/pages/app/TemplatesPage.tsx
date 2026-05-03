import { useEffect, useState } from 'react'
import { usePromptTemplates } from '@/features/prompt-templates/usePromptTemplates'

export function TemplatesPage() {
  const { templates, loading, error, refresh, saveTemplate, deleteTemplate } = usePromptTemplates()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState('')
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!editingId) return
    const current = templates.find((item) => item.id === editingId)
    if (current) {
      setTitle(current.title || current.name || '')
      setContent(current.content || '')
    }
  }, [editingId, templates])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyId('save')
    setMessage('')
    try {
      await saveTemplate({ id: editingId || undefined, title, content })
      setTitle('')
      setContent('')
      setEditingId('')
      setMessage('模板已保存。')
      await refresh()
    } finally {
      setBusyId('')
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id)
    await deleteTemplate(id)
    await refresh()
    setBusyId('')
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-screen-xl px-4 pb-10 pt-32 md:px-8">
      <section className="panel-shell w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Assets</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">模板资产</h1>
            <p className="mt-2 text-sm text-porcelain-100/60">统一新增、编辑、删除与当前 Prompt 保存体验。</p>
          </div>
          <button className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan" type="button" onClick={() => void refresh()}>刷新</button>
        </div>

        {error ? <p className="mt-6 text-sm text-signal-coral">{error instanceof Error ? error.message : String(error)}</p> : null}
        {loading ? <p className="mt-6 text-sm text-porcelain-100/60">正在加载模板…</p> : null}
        {message ? <p className="mt-6 text-sm text-signal-cyan">{message}</p> : null}

        <form className="mt-8 grid gap-4 rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field-block"><span className="field-label">标题</span><input className="input-shell" value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
            <label className="field-block"><span className="field-label">内容</span><input className="input-shell" value={content} onChange={(e) => setContent(e.target.value)} required /></label>
          </div>
          <div className="flex gap-3">
            <button className="rounded-2xl bg-signal-cyan px-4 py-3 text-sm font-bold text-ink-950" type="submit" disabled={busyId === 'save'}>{busyId === 'save' ? '保存中…' : editingId ? '更新模板' : '新增模板'}</button>
            {editingId ? <button type="button" className="rounded-2xl border border-porcelain-50/10 px-4 py-3 text-sm" onClick={() => { setEditingId(''); setTitle(''); setContent('') }}>取消编辑</button> : null}
          </div>
        </form>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} className="progress-card">
              <h2 className="text-lg font-semibold text-porcelain-50">{template.title || template.name || '未命名模板'}</h2>
              <p className="mt-3 line-clamp-5 text-sm leading-6 text-porcelain-100/60">{template.content}</p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs" onClick={() => setEditingId(template.id)}>编辑</button>
                <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral" onClick={() => void handleDelete(template.id)} disabled={busyId === template.id}>{busyId === template.id ? '删除中…' : '删除'}</button>
              </div>
            </article>
          ))}
          {!loading && templates.length === 0 ? <div className="progress-card text-sm text-porcelain-100/60">当前还没有模板。</div> : null}
        </div>
      </section>
    </main>
  )
}
