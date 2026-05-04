type AdminPaginationProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function AdminPagination({ page, totalPages, total, onPageChange }: AdminPaginationProps) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] px-4 py-3 text-sm text-porcelain-100/65">
      <p>
        第 {page} / {totalPages} 页，共 {total} 条
      </p>
      <div className="flex items-center gap-2">
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
      </div>
    </div>
  )
}
