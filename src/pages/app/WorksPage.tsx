import { useEffect, useState } from 'react'
import { readStoredGallery, writeStoredGallery } from '@/features/works/works.storage'
import type { GalleryImage } from '@/features/works/works.types'

async function fetchWorksList() {
  return await readStoredGallery()
}

async function replaceWorks(works: GalleryImage[]) {
  return await writeStoredGallery(works)
}

export function WorksPage() {
  const [works, setWorks] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const next = await fetchWorksList()
      setWorks(next)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleDelete(id: string) {
    setBusyId(id)
    try {
      const nextWorks = works.filter((work) => work.id !== id)
      await replaceWorks(nextWorks)
      setWorks(nextWorks)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusyId('')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-screen-xl px-4 pb-10 pt-32 md:px-8">
      <section className="panel-shell w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Works</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">作品</h1>
            <p className="mt-2 text-sm text-porcelain-100/60">查看当前账号的作品，并同步删除服务端作品记录。</p>
          </div>
          <button className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm" type="button" onClick={() => void refresh()}>刷新</button>
        </div>

        {error ? <p className="mt-6 text-sm text-signal-coral">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-porcelain-100/60">正在加载作品…</p> : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {works.map((work) => (
            <article key={work.id} className="progress-card">
              {work.src ? <img className="h-56 w-full rounded-2xl object-cover" src={work.src} alt={work.title} /> : null}
              <h2 className="mt-4 text-lg font-semibold text-porcelain-50">{work.title}</h2>
              <p className="mt-2 text-sm text-porcelain-100/60">{work.meta}</p>
              <p className="mt-2 text-xs text-porcelain-100/45">{[work.providerModel, work.size, work.quality].filter(Boolean).join(' · ') || '—'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral" onClick={() => void handleDelete(work.id)} disabled={busyId === work.id}>{busyId === work.id ? '删除中…' : '删除'}</button>
              </div>
            </article>
          ))}
          {works.length === 0 ? <div className="progress-card text-sm text-porcelain-100/60">当前还没有作品。</div> : null}
        </div>
      </section>
    </main>
  )
}
