import { useEffect, useMemo, useState } from 'react'

type AdminPaginationProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function AdminPagination({ page, totalPages, total, onPageChange }: AdminPaginationProps) {
  const [jumpInput, setJumpInput] = useState(String(page))

  useEffect(() => {
    setJumpInput(String(page))
  }, [page])

  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [1]

    const pages = new Set<number>([1, totalPages, page - 1, page, page + 1])
    return Array.from(pages).filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b)
  }, [page, totalPages])

  function handleJump() {
    const nextPage = Number(jumpInput)
    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage > totalPages || nextPage === page) {
      setJumpInput(String(page))
      return
    }

    onPageChange(nextPage)
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] px-4 py-3 text-sm text-porcelain-100/65">
      <p>
        第 {page} / {totalPages} 页，共 {total} 条
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.7] px-3 py-2 text-xs font-semibold text-porcelain-50 disabled:opacity-35"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          上一页
        </button>
        <button
          type="button"
          className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.7] px-3 py-2 text-xs font-semibold text-porcelain-50 disabled:opacity-35"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          下一页
        </button>
        {pageItems.map((item, index) => {
          const previous = pageItems[index - 1]
          return (
            <span key={item} className="contents">
              {previous && item - previous > 1 ? (
                <span className="px-1 text-xs text-porcelain-100/35">…</span>
              ) : null}
              <button
                type="button"
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  item === page
                    ? 'border-signal-cyan/45 bg-signal-cyan/[0.12] text-signal-cyan'
                    : 'border-porcelain-50/10 bg-ink-950/[0.7] text-porcelain-50'
                }`}
                onClick={() => onPageChange(item)}
                disabled={item === page}
              >
                {item}
              </button>
            </span>
          )
        })}
        {totalPages > 1 ? (
          <div className="ml-1 flex items-center gap-2">
            <span className="text-xs text-porcelain-100/45">跳至</span>
            <input
              value={jumpInput}
              onChange={(event) => setJumpInput(event.target.value.replace(/[^\d]/g, ''))}
              className="h-9 w-16 rounded-full border border-porcelain-50/10 bg-ink-950/[0.7] px-3 text-center text-xs font-semibold text-porcelain-50 outline-none transition focus:border-signal-cyan/50"
            />
            <button
              type="button"
              className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.7] px-3 py-2 text-xs font-semibold text-porcelain-50"
              onClick={handleJump}
            >
              前往
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
