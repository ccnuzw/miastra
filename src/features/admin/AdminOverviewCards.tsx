type AdminOverviewCardsProps = {
  counts: {
    users: number
    works: number
    generationTasks: number
    promptTemplates: number
  }
}

export function AdminOverviewCards({ counts }: AdminOverviewCardsProps) {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="progress-card"><p className="text-sm text-porcelain-100/60">用户数</p><p className="mt-2 text-3xl font-semibold">{counts.users}</p></div>
      <div className="progress-card"><p className="text-sm text-porcelain-100/60">作品数</p><p className="mt-2 text-3xl font-semibold">{counts.works}</p></div>
      <div className="progress-card"><p className="text-sm text-porcelain-100/60">任务数</p><p className="mt-2 text-3xl font-semibold">{counts.generationTasks}</p></div>
      <div className="progress-card"><p className="text-sm text-porcelain-100/60">模板数</p><p className="mt-2 text-3xl font-semibold">{counts.promptTemplates}</p></div>
    </div>
  )
}
