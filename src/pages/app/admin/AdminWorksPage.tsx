import { Eye, ImageOff, RotateCcw, Trash2 } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { AdminDetailDrawer } from '@/features/admin/AdminDetailDrawer'
import { AdminPageHeader } from '@/features/admin/AdminPageHeader'
import { AdminPagination } from '@/features/admin/AdminPagination'
import { AdminSelectionBar } from '@/features/admin/AdminSelectionBar'
import {
  type AdminWorkRecord,
  deleteAdminWork,
  deleteAdminWorksBulk,
  fetchAdminWorkById,
  fetchAdminWorks,
} from '@/features/admin/admin.api'
import {
  formatAdminDateTime,
  formatAuditPayload,
  parsePositivePage,
} from '@/features/admin/admin.utils'
import { useAdminSearchParams } from '@/features/admin/useAdminSearchParams'
import { useAdminSelection } from '@/features/admin/useAdminSelection'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

export function AdminWorksPage() {
  const { searchParams, updateSearchParams } = useAdminSearchParams()
  const page = parsePositivePage(searchParams.get('page'))
  const appliedQuery = searchParams.get('query') ?? ''
  const selectedWorkId = searchParams.get('selected') ?? ''

  const [works, setWorks] = useState<AdminWorkRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchInput, setSearchInput] = useState(appliedQuery)
  const [selectedWork, setSelectedWork] = useState<AdminWorkRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  const selection = useAdminSelection()

  useEffect(() => {
    setSearchInput(appliedQuery)
  }, [appliedQuery])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminWorks({
        page,
        limit: 12,
        query: appliedQuery || undefined,
      })
      setWorks(result.items)
      setTotal(result.total)
      setTotalPages(result.totalPages)

      if (selectedWorkId) {
        setSelectedWork(await fetchAdminWorkById(selectedWorkId))
      }
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [appliedQuery, page, selectedWorkId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!selectedWorkId) {
      setSelectedWork(null)
      return
    }

    setDetailLoading(true)
    void fetchAdminWorkById(selectedWorkId)
      .then((detail) => setSelectedWork(detail))
      .catch((nextError) => setError(nextError))
      .finally(() => setDetailLoading(false))
  }, [selectedWorkId])

  const pageIds = useMemo(() => works.map((item) => item.id), [works])
  const selectedOnPageCount = useMemo(
    () => pageIds.filter((id) => selection.selectedIdSet.has(id)).length,
    [pageIds, selection.selectedIdSet],
  )
  const allSelectedOnPage = pageIds.length > 0 && selectedOnPageCount === pageIds.length

  async function handleDeleteWork(workId: string) {
    if (!window.confirm('确定要删除这个作品吗？此操作不可撤销。')) return

    setBusyId(workId)
    setError(null)
    setMessage('')
    try {
      await deleteAdminWork(workId)
      setMessage('作品已删除。')
      if (selectedWorkId === workId) {
        updateSearchParams({ selected: undefined })
      }
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  async function handleBulkDelete() {
    if (!selection.selectedIds.length) return
    if (!window.confirm(`确定要批量删除 ${selection.selectedIds.length} 个作品吗？`)) return

    setBulkBusy(true)
    setError(null)
    setMessage('')
    try {
      const result = await deleteAdminWorksBulk(selection.selectedIds)
      selection.clearSelection()
      if (selectedWorkId && result.succeeded.some((item) => item.id === selectedWorkId)) {
        updateSearchParams({ selected: undefined })
      }
      setMessage(`已处理 ${result.processedCount} 个作品，成功删除 ${result.deletedCount} 个。`)
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBulkBusy(false)
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateSearchParams({
      page: '1',
      query: searchInput.trim() || undefined,
      selected: undefined,
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Works"
        title="作品管理"
        description="作品页改成内容巡检台，支持表格化检索、批量删除和图片详情侧栏，方便做审查与追溯。"
        meta={<span className="status-pill">当前结果：{total} 个作品</span>}
        actions={
          <button
            type="button"
            className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan"
            onClick={() => void refresh()}
          >
            刷新作品
          </button>
        }
      />

      <AdminSelectionBar
        count={selection.selectedCount}
        label="可批量删除选中的作品"
        actions={
          <>
            <button
              type="button"
              className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral disabled:opacity-35"
              onClick={() => void handleBulkDelete()}
              disabled={bulkBusy}
            >
              {bulkBusy ? '处理中…' : '批量删除'}
            </button>
            <button
              type="button"
              className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-4 py-2 text-sm font-semibold text-porcelain-50"
              onClick={() => selection.clearSelection()}
            >
              清空选择
            </button>
          </>
        }
      />

      <article className="progress-card">
        <form
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]"
          onSubmit={handleSearchSubmit}
        >
          <label className="field-block">
            <span className="field-label">搜索作品</span>
            <input
              className="input-shell"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="标题、meta、提示词、所属用户"
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-12 rounded-2xl bg-signal-cyan px-4 text-sm font-bold text-ink-950"
            >
              应用筛选
            </button>
            <button
              type="button"
              className="grid h-12 w-12 place-items-center rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.72] text-porcelain-50"
              onClick={() =>
                updateSearchParams({
                  page: '1',
                  query: undefined,
                  selected: undefined,
                })
              }
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </form>
      </article>

      {loading ? <p className="text-sm text-porcelain-100/60">正在加载作品列表…</p> : null}
      {error ? <ErrorNotice error={error} /> : null}
      {message ? (
        <p className="rounded-2xl border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">
          {message}
        </p>
      ) : null}

      <section className="admin-table-shell">
        <div className="flex items-center justify-between border-b border-porcelain-50/10 px-4 py-3 text-xs text-porcelain-100/45">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelectedOnPage}
              onChange={(event) => selection.toggleMany(pageIds, event.target.checked)}
            />
            选中当前页
          </label>
          <p>点击作品标题可打开图片和生成信息详情</p>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-12" />
                <th className="w-[100px]">预览</th>
                <th>作品</th>
                <th>作者</th>
                <th>模型</th>
                <th>创建时间</th>
                <th className="w-[170px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {works.map((work) => (
                <tr
                  key={work.id}
                  className={selectedWorkId === work.id ? 'admin-table-row-active' : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selection.isSelected(work.id)}
                      onChange={() => selection.toggleSelection(work.id)}
                    />
                  </td>
                  <td>
                    <div className="h-16 w-16 overflow-hidden rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.82]">
                      {work.src ? (
                        <img
                          src={work.src}
                          alt={work.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-porcelain-100/35">
                          <ImageOff className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => updateSearchParams({ selected: work.id })}
                    >
                      <p className="font-semibold text-porcelain-50">{work.title}</p>
                      <p className="mt-1 max-w-[28rem] break-words text-xs text-porcelain-100/45">
                        {work.promptSnippet || work.meta || '无描述'}
                      </p>
                    </button>
                  </td>
                  <td>{work.userNickname ?? work.userEmail ?? '—'}</td>
                  <td>{work.providerModel || '—'}</td>
                  <td>{formatAdminDateTime(work.createdAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-3 py-2 text-xs font-semibold text-porcelain-50"
                        onClick={() => updateSearchParams({ selected: work.id })}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Eye className="h-3.5 w-3.5" />
                          查看
                        </span>
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs font-semibold text-signal-coral disabled:opacity-35"
                        onClick={() => void handleDeleteWork(work.id)}
                        disabled={busyId === work.id}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Trash2 className="h-3.5 w-3.5" />
                          {busyId === work.id ? '处理中…' : '删除'}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!loading && !works.length ? (
        <p className="text-sm text-porcelain-100/60">没有匹配的作品。</p>
      ) : null}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(nextPage) => updateSearchParams({ page: String(nextPage) })}
      />

      <AdminDetailDrawer
        open={Boolean(selectedWorkId)}
        title={selectedWork?.title || '作品详情'}
        subtitle={
          selectedWork ? `${selectedWork.userNickname ?? selectedWork.userEmail ?? '—'}` : ''
        }
        onClose={() => updateSearchParams({ selected: undefined })}
        actions={
          <button
            type="button"
            className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral disabled:opacity-35"
            onClick={() => selectedWorkId && void handleDeleteWork(selectedWorkId)}
            disabled={busyId === selectedWorkId}
          >
            {busyId === selectedWorkId ? '处理中…' : '删除作品'}
          </button>
        }
      >
        {detailLoading && !selectedWork ? (
          <p className="text-sm text-porcelain-100/60">正在加载作品详情…</p>
        ) : null}

        {selectedWork ? (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42]">
              {selectedWork.src ? (
                <img
                  src={selectedWork.src}
                  alt={selectedWork.title}
                  className="max-h-[520px] w-full object-contain"
                />
              ) : (
                <div className="grid h-64 place-items-center text-sm text-porcelain-100/35">
                  无预览图
                </div>
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  基础信息
                </p>
                <div className="mt-3 space-y-2 text-sm text-porcelain-100/70">
                  <p>作品 ID：{selectedWork.id}</p>
                  <p>快照 ID：{selectedWork.snapshotId || '—'}</p>
                  <p>模型：{selectedWork.providerModel || '—'}</p>
                  <p>模式：{selectedWork.mode || '—'}</p>
                  <p>尺寸：{selectedWork.size || '—'}</p>
                  <p>质量：{selectedWork.quality || '—'}</p>
                  <p>创建时间：{formatAdminDateTime(selectedWork.createdAt)}</p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  Prompt / Meta
                </p>
                <div className="mt-3 space-y-4 text-sm leading-7 text-porcelain-100/70">
                  <p>{selectedWork.promptText || '无完整 prompt 记录'}</p>
                  <div className="rounded-[1.2rem] border border-porcelain-50/10 bg-ink-950/[0.72] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                      Meta
                    </p>
                    <p className="mt-2 break-words text-sm leading-7 text-porcelain-100/65">
                      {selectedWork.meta || '无附加信息'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {selectedWork.generationSnapshot ? (
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  生成快照
                </p>
                <pre className="mt-3 overflow-x-auto rounded-[1.2rem] border border-porcelain-50/10 bg-ink-950/[0.72] p-3 text-xs leading-6 text-porcelain-100/60">
                  {formatAuditPayload(selectedWork.generationSnapshot)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminDetailDrawer>
    </div>
  )
}
