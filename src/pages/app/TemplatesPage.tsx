import {
  ArrowRight,
  ClipboardCopy,
  Clock3,
  Copy,
  Filter,
  LayoutPanelTop,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Wand2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildPromptTemplateCategoryOverview,
  buildPromptTemplatePresentation,
  formatPromptTemplateDate,
  getPromptTemplateSearchText,
  getPromptTemplateSortDate,
  getPromptTemplateSortTime,
  resolvePromptTemplateFamily,
} from '@/features/prompt-templates/promptTemplate.presentation'
import {
  buildPromptTemplateStudioPath,
  resolvePromptTemplateStudioLaunch,
} from '@/features/prompt-templates/promptTemplate.studioEntry'
import type { PromptTemplateWorkbenchEntryMode } from '@/features/prompt-templates/promptTemplate.types'
import type { StudioFlowSceneId } from '@/features/prompt-templates/studioFlowSemantic'
import { getStudioFlowSceneLabel } from '@/features/prompt-templates/studioFlowSemantic'
import {
  createDuplicatedPromptTemplateTitle,
  normalizePromptTemplateTags,
} from '@/features/prompt-templates/promptTemplate.utils'
import { usePromptTemplates } from '@/features/prompt-templates/usePromptTemplates'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

function getTemplateActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  if (error) return String(error)
  return fallback
}

function orderTemplateEntries(
  mode: PromptTemplateWorkbenchEntryMode,
  recommendedMode: PromptTemplateWorkbenchEntryMode,
) {
  return mode === recommendedMode ? 0 : 1
}

export function TemplatesPage() {
  const { templates, loading, error, refresh, saveTemplate, deleteTemplate } = usePromptTemplates()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [editingId, setEditingId] = useState('')
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')
  const [searchQuery, setSearchQuery] = useState('')
  const [familyFilter, setFamilyFilter] = useState('全部类型')
  const [categoryFilter, setCategoryFilter] = useState('全部分类')
  const [sortMode, setSortMode] = useState<'updated' | 'used'>('updated')

  useEffect(() => {
    if (!editingId) return
    const current = templates.find((item) => item.id === editingId)
    if (current) {
      setTitle(current.title || '')
      setContent(current.content || '')
      setCategory(current.category || '')
      setTagsText((current.tags ?? []).join(', '))
    }
  }, [editingId, templates])

  const categories = Array.from(
    new Set(templates.map((template) => template.category?.trim() || '未分类')),
  ).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
  const categoryOverview = useMemo(
    () => buildPromptTemplateCategoryOverview(templates),
    [templates],
  )
  const filteredTemplates = useMemo(
    () =>
      [...templates]
        .sort(
          (a, b) => getPromptTemplateSortTime(b, sortMode) - getPromptTemplateSortTime(a, sortMode),
        )
        .filter((template) => {
          const family = resolvePromptTemplateFamily(template)
          if (familyFilter !== '全部类型' && family.label !== familyFilter) return false
          if (
            categoryFilter !== '全部分类' &&
            (template.category?.trim() || '未分类') !== categoryFilter
          )
            return false
          return getPromptTemplateSearchText(template).includes(searchQuery.trim().toLowerCase())
        }),
    [categoryFilter, familyFilter, searchQuery, sortMode, templates],
  )
  const hasActiveFilters =
    Boolean(searchQuery.trim()) || categoryFilter !== '全部分类' || familyFilter !== '全部类型'
  const hasTemplates = templates.length > 0
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : ''
  const recommendedCount = filteredTemplates.filter((template) => {
    const presentation = buildPromptTemplatePresentation(template)
    return presentation.recommendedEntry.mode === 'consumer'
  }).length
  const proRecommendedCount = filteredTemplates.filter((template) => {
    const presentation = buildPromptTemplatePresentation(template)
    return presentation.recommendedEntry.mode === 'pro'
  }).length
  const structuredTemplateCount = filteredTemplates.filter((template) => template.structure).length
  const guidedRuntimeCount = filteredTemplates.filter((template) => {
    const presentation = buildPromptTemplatePresentation(template)
    return presentation.runtime.guidedQuestionCount > 0
  }).length
  const versionReadyCount = filteredTemplates.filter((template) => {
    const presentation = buildPromptTemplatePresentation(template)
    return presentation.resultBridge.actions.some(
      (action) => action.id === 'retry-version' || action.id === 'branch-version',
    )
  }).length
  const alignedSceneIds: StudioFlowSceneId[] = [
    'product-shot',
    'poster-campaign',
    'portrait-avatar',
  ]

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
      try {
        await refresh()
        setMessageTone('success')
        setMessage('模板已保存。')
      } catch (refreshError) {
        setMessageTone('error')
        setMessage(
          `模板已保存，但模板库恢复未完成：${getTemplateActionErrorMessage(
            refreshError,
            '请稍后刷新模板库重试',
          )}。当前保存结果已生效，切换模板入口前建议先完成一次成功刷新。`,
        )
      }
    } catch (submitError) {
      setMessageTone('error')
      setMessage(
        `模板保存失败：${getTemplateActionErrorMessage(submitError, '请检查模板内容后重试')}。`,
      )
    } finally {
      setBusyId('')
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id)
    setMessage('')
    try {
      await deleteTemplate(id)
      try {
        await refresh()
        setMessageTone('success')
        setMessage('模板已删除。')
      } catch (refreshError) {
        setMessageTone('error')
        setMessage(
          `模板已删除，但模板库恢复未完成：${getTemplateActionErrorMessage(
            refreshError,
            '请稍后刷新模板库重试',
          )}。当前删除结果已生效，继续验证模板入口前建议先完成一次成功刷新。`,
        )
      }
    } catch (deleteError) {
      setMessageTone('error')
      setMessage(
        `模板删除失败：${getTemplateActionErrorMessage(deleteError, '请刷新模板库后重试')}。`,
      )
    } finally {
      setBusyId('')
    }
  }

  async function handleDuplicate(template: (typeof templates)[number]) {
    setBusyId(template.id)
    setMessage('')
    try {
      await saveTemplate({
        title: createDuplicatedPromptTemplateTitle(template.title || '未命名模板'),
        content: template.content,
        category: template.category?.trim() || undefined,
        tags: template.tags,
      })
      try {
        await refresh()
        setMessageTone('success')
        setMessage('已复制为新模板。')
      } catch (refreshError) {
        setMessageTone('error')
        setMessage(
          `模板已复制，但模板库恢复未完成：${getTemplateActionErrorMessage(
            refreshError,
            '请稍后刷新模板库重试',
          )}。当前复制结果已生效，继续从模板入口进入前建议先完成一次成功刷新。`,
        )
      }
    } catch (duplicateError) {
      setMessageTone('error')
      setMessage(
        `复制模板失败：${getTemplateActionErrorMessage(duplicateError, '请刷新模板库后重试')}。`,
      )
    } finally {
      setBusyId('')
    }
  }

  async function handleCopyContent(contentToCopy: string, id: string) {
    setBusyId(id)
    try {
      await navigator.clipboard.writeText(contentToCopy)
      setMessageTone('success')
      setMessage('模板内容已复制。')
    } catch {
      setMessageTone('error')
      setMessage('复制失败。')
    } finally {
      setBusyId('')
    }
  }

  return (
    <main className="app-page-shell app-page-shell-wide">
      <section className="panel-shell w-full">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Skill Entry Collection</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">模板技能入口</h1>
            <p className="mt-2 max-w-3xl text-sm text-porcelain-100/60">
              这里不只是保存
              Prompt。每个模板都应该能表达它打算帮你做什么、推荐从普通版还是专业版起手，以及进入后会如何接结果动作、追问和版本复用链。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-pill">共 {templates.length} 个模板</span>
            <span className="status-pill">当前筛出 {filteredTemplates.length} 个</span>
            <span className="status-pill">推荐普通版起手 {recommendedCount} 个</span>
            <span className="status-pill">推荐专业版起手 {proRecommendedCount} 个</span>
            <span className="status-pill">已读出结构信息 {structuredTemplateCount} 个</span>
            <span className="status-pill">可直接挂模板追问 {guidedRuntimeCount} 个</span>
            <span className="status-pill">可接版本复用 {versionReadyCount} 个</span>
            <span className="status-pill">
              统一场景{' '}
              {alignedSceneIds.map((sceneId) => getStudioFlowSceneLabel(sceneId)).join(' / ')}
            </span>
            <button
              className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan"
              type="button"
              onClick={() => void refresh()}
            >
              <RefreshCw className="mr-2 inline h-4 w-4" />
              刷新模板
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-[1.5rem] border border-signal-cyan/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(15,23,42,0.65))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="field-label">模板如何作为 Skill 入口</p>
                <h2 className="mt-2 text-xl font-semibold text-porcelain-50">
                  先决定执行意图，再决定从哪里开始
                </h2>
                <p className="mt-2 text-sm leading-6 text-porcelain-100/70">
                  普通版更适合先把模板当成任务起点，带着模板默认追问路径快速出第一版，再接结果动作继续改；专业版更适合把模板当成结构底稿，先锁字段、参数和风格控制，再围绕版本链持续重跑或派生。
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="status-pill">模板起稿</span>
                  <span className="status-pill">结果动作承接</span>
                  <span className="status-pill">轻量追问回流</span>
                  <span className="status-pill">版本重跑 / 分叉</span>
                </div>
              </div>
              <div className="grid gap-2 text-sm text-porcelain-100/65">
                <div className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.38] px-4 py-3">
                  <span className="font-semibold text-porcelain-50">普通版入口</span>
                  <p className="mt-1">更适合先出图、先验证方向，再顺手接结果动作。</p>
                </div>
                <div className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.38] px-4 py-3">
                  <span className="font-semibold text-porcelain-50">专业版入口</span>
                  <p className="mt-1">更适合先锁字段和参数，再进入稳定复用与版本派生。</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-5">
            <div>
              <p className="field-label">进入策略总览</p>
              <h2 className="mt-2 text-xl font-semibold text-porcelain-50">
                模板已经开始携带场景、入口和后续动作语义
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="status-pill">字段 schema</span>
              <span className="status-pill">模板默认追问</span>
              <span className="status-pill">推荐模式</span>
              <span className="status-pill">结果动作</span>
              <span className="status-pill">版本语义</span>
            </div>
            <p className="text-sm leading-6 text-porcelain-100/65">
              这一页已经不再只是读取模板结构信息。现在每张卡片都会更明确告诉你：普通版会不会自动挂模板追问、专业版会不会直入控制链，以及首个结果动作默认优先走哪条分支。
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-porcelain-100/60">
              模板暂时没有加载成功。你可以先整理左侧内容，或刷新后重新读取工作台里已保存的模板。
            </p>
            <div className="rounded-[1.2rem] border border-signal-coral/20 bg-signal-coral/10 px-4 py-3 text-sm text-porcelain-100/78">
              当前处于“模板库恢复未完成”状态：{errorMessage || '模板库读取失败'}
              。如果是从模板入口跳转到工作台失败，建议先回到这里刷新模板库，再重新进入普通版或专业版。
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral"
                onClick={() => void refresh()}
              >
                重新加载模板库
              </button>
            </div>
            <ErrorNotice error={error} />
          </div>
        ) : null}
        {loading ? (
          <div className="mt-6 rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] px-4 py-3 text-sm text-porcelain-100/60">
            模板库正在恢复中，最近使用、分类和推荐入口会一起恢复。
          </div>
        ) : null}
        {message ? (
          <p
            className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
              messageTone === 'error'
                ? 'border-signal-coral/25 bg-signal-coral/10 text-porcelain-100/78'
                : 'border-signal-cyan/25 bg-signal-cyan/[0.08] text-signal-cyan'
            }`}
          >
            {message}
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 min-[1560px]:grid-cols-[minmax(430px,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-6 min-[1560px]:sticky min-[1560px]:top-28 min-[1560px]:self-start">
            <div className="grid gap-4 rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="field-label">模板分类概览</p>
                  <p className="mt-2 text-sm text-porcelain-100/60">
                    先看模板主要落在哪些场景，后续这些分类会继续承接结构字段、推荐入口和结果动作策略。
                  </p>
                </div>
                <Tags className="h-5 w-5 text-signal-cyan" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {categoryOverview.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`rounded-[1.2rem] border px-4 py-4 text-left transition ${
                      familyFilter === item.label
                        ? 'border-signal-cyan/55 bg-signal-cyan/[0.12]'
                        : 'border-porcelain-50/10 bg-ink-950/[0.35] hover:border-signal-cyan/30'
                    }`}
                    onClick={() =>
                      setFamilyFilter(familyFilter === item.label ? '全部类型' : item.label)
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-porcelain-50">{item.label}</span>
                      <span className="status-pill">{item.count} 个</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-porcelain-100/60">
                      {item.description}
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-signal-cyan/90">
                      推荐先从{item.recommendedMode === 'consumer' ? '普通版' : '专业版'}进入
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <form
              className="grid gap-4 rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-5"
              onSubmit={handleSubmit}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="field-label">模板编辑器</p>
                  <p className="mt-2 text-sm text-porcelain-100/60">
                    在工作台保存当前 Prompt
                    后，可以回到这里补标题、分类和标签。现在也建议顺手补充适用场景，让模板逐步从“保存文本”变成“可执行入口”。
                  </p>
                </div>
                {editingId ? (
                  <span className="status-pill">正在编辑</span>
                ) : (
                  <span className="status-pill">新建模板</span>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="field-block">
                  <span className="field-label">标题</span>
                  <input
                    className="input-shell"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </label>
                <label className="field-block">
                  <span className="field-label">分类</span>
                  <input
                    className="input-shell"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="如：海报 / 角色 / 电商"
                  />
                </label>
              </div>
              <label className="field-block">
                <span className="field-label">内容</span>
                <textarea
                  className="prompt-area min-h-52"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </label>
              <label className="field-block">
                <span className="field-label">标签</span>
                <input
                  className="input-shell"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="用逗号分隔，例如：产品, 营销, 轻奢"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-2xl bg-signal-cyan px-4 py-3 text-sm font-bold text-ink-950"
                  type="submit"
                  disabled={busyId === 'save'}
                >
                  {busyId === 'save' ? '保存中…' : editingId ? '保存修改' : '保存模板'}
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
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
              <label className="field-block">
                <span className="field-label">
                  <Search className="h-3.5 w-3.5" />
                  搜索
                </span>
                <input
                  className="input-shell"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索模板名称、标签、适用场景或说明"
                />
              </label>
              <label className="field-block">
                <span className="field-label">
                  <Filter className="h-3.5 w-3.5" />
                  类型筛选
                </span>
                <select
                  className="input-shell"
                  value={familyFilter}
                  onChange={(e) => setFamilyFilter(e.target.value)}
                >
                  <option value="全部类型">全部类型</option>
                  {categoryOverview.map((item) => (
                    <option key={item.id} value={item.label}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-block">
                <span className="field-label">
                  <Filter className="h-3.5 w-3.5" />
                  分类筛选
                </span>
                <select
                  className="input-shell"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="全部分类">全部分类</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-block">
                <span className="field-label">
                  <Clock3 className="h-3.5 w-3.5" />
                  排序
                </span>
                <select
                  className="input-shell"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as 'updated' | 'used')}
                >
                  <option value="updated">按最近整理</option>
                  <option value="used">按最近使用</option>
                </select>
              </label>
            </div>

            {!loading && !hasTemplates ? (
              <div className="rounded-[1.35rem] border border-dashed border-porcelain-50/15 bg-ink-950/[0.32] p-5 text-sm text-porcelain-100/65">
                <p className="text-base font-semibold text-porcelain-50">还没有模板</p>
                <p className="mt-2 leading-6">
                  先在工作台里把当前 Prompt
                  保存为模板，再回到这里补分类、标签和适用场景；之后你就可以把它当成普通版起稿入口或专业版结构底稿继续创作。
                </p>
                <p className="mt-2 leading-6 text-porcelain-100/55">
                  当前空态不影响工作台正常使用。没有模板时，普通版会按自由输入起手，专业版会按当前工作区内容直接建立基线。
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2 min-[1760px]:grid-cols-3">
              {filteredTemplates.map((template) => {
                const presentation = buildPromptTemplatePresentation(template)
                const consumerLaunch = resolvePromptTemplateStudioLaunch(template, {
                  templateId: template.id,
                  mode: 'consumer',
                  intent: 'task',
                  sourceType: 'template',
                })
                const proLaunch = resolvePromptTemplateStudioLaunch(template, {
                  templateId: template.id,
                  mode: 'pro',
                  intent: 'panel',
                  sourceType: 'template',
                })
                const activityDate = formatPromptTemplateDate(
                  getPromptTemplateSortDate(template, sortMode),
                )

                return (
                  <article
                    key={template.id}
                    className="rounded-[1.4rem] border border-porcelain-50/10 bg-ink-950/[0.4] p-5 shadow-[0_18px_45px_rgba(2,6,23,0.18)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-signal-cyan">
                            {presentation.family.label}
                          </span>
                          <span className="rounded-full border border-porcelain-50/10 bg-ink-950/55 px-2.5 py-1 text-[10px] font-bold text-porcelain-100/45">
                            {presentation.category}
                          </span>
                        </div>
                        <h2 className="mt-3 truncate text-lg font-semibold text-porcelain-50">
                          {presentation.title}
                        </h2>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-signal-cyan/80">
                          {presentation.executionIntent.label}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-porcelain-50/10 bg-ink-950/55 px-2.5 py-1 text-[10px] font-bold text-porcelain-100/45">
                        {activityDate}
                      </span>
                    </div>

                    <div className="mt-4 rounded-[1.15rem] border border-signal-cyan/15 bg-[linear-gradient(140deg,rgba(34,211,238,0.1),rgba(15,23,42,0.24))] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
                        <Sparkles className="h-4 w-4 text-signal-cyan" />
                        执行意图
                      </div>
                      <p className="mt-2 text-sm leading-6 text-porcelain-100/70">
                        {presentation.executionIntent.summary}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-porcelain-100/55">
                        起手建议：{presentation.executionIntent.starter}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="status-pill">{presentation.structureMeta.sceneLabel}</span>
                      <span className="status-pill">{presentation.structureMeta.statusLabel}</span>
                      <span className="status-pill">
                        {presentation.recommendedEntry.mode === 'consumer'
                          ? '普通版起手'
                          : '专业版起手'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-porcelain-100/62">
                      {presentation.family.description}
                    </p>
                    <p className="mt-3 line-clamp-4 text-sm leading-6 text-porcelain-100/58">
                      {presentation.preview}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(presentation.tags.length ? presentation.tags : ['待补标签']).map((tag) => (
                        <span key={tag} className="prompt-template-chip prompt-template-chip-tag">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[1.1rem] border border-porcelain-50/10 bg-ink-950/[0.34] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
                        <Sparkles className="h-4 w-4 text-signal-cyan" />
                        运行入口
                      </div>
                      <p className="mt-2 text-sm leading-6 text-porcelain-100/65">
                        {presentation.recommendedEntry.reason}
                      </p>
                      <div className="mt-3">
                        <Link
                          to={buildPromptTemplateStudioPath(
                            presentation.recommendedEntry.mode === 'consumer'
                              ? consumerLaunch
                              : proLaunch,
                          )}
                          className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/40 bg-signal-cyan/[0.12] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:border-signal-cyan/60 hover:bg-signal-cyan/[0.2]"
                        >
                          {presentation.recommendedEntry.mode === 'consumer'
                            ? '直接用这个模板起稿'
                            : '直接带入专业版'}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                      <div className="mt-3 rounded-2xl border border-signal-cyan/15 bg-signal-cyan/[0.07] px-3 py-3">
                        <p className="text-xs font-semibold text-signal-cyan">
                          {presentation.runtime.followUpLabel}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-porcelain-100/60">
                          {presentation.runtime.consumerEntrySummary}
                        </p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-porcelain-100/55">
                        更适合：{presentation.recommendedEntry.bestFor}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-porcelain-100/55">
                        进入后：{presentation.recommendedEntry.nextStep}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {presentation.useCases.map((useCase) => (
                          <span key={useCase} className="status-pill">
                            {useCase}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {[...presentation.entries]
                        .sort(
                          (left, right) =>
                            orderTemplateEntries(left.mode, presentation.recommendedEntry.mode) -
                            orderTemplateEntries(right.mode, presentation.recommendedEntry.mode),
                        )
                        .map((entry) => {
                        const launch = entry.mode === 'consumer' ? consumerLaunch : proLaunch
                        return (
                          <Link
                            key={`${template.id}:${entry.mode}`}
                            to={buildPromptTemplateStudioPath(launch)}
                            className={`rounded-[1.1rem] border px-4 py-3 transition ${
                              entry.recommended
                                ? 'border-signal-cyan/45 bg-signal-cyan/[0.1]'
                                : entry.available
                                  ? 'border-porcelain-50/10 bg-ink-950/[0.3] hover:border-porcelain-50/25'
                                  : 'border-porcelain-50/10 bg-ink-950/[0.18] opacity-75'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
                                {entry.mode === 'consumer' ? (
                                  <Wand2 className="h-4 w-4 text-signal-cyan" />
                                ) : (
                                  <LayoutPanelTop className="h-4 w-4 text-signal-cyan" />
                                )}
                                {entry.label}
                              </div>
                              <ArrowRight className="h-4 w-4 text-signal-cyan" />
                            </div>
                            <p className="mt-2 text-sm leading-6 text-porcelain-100/62">
                              {entry.description}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-porcelain-100/55">
                              {entry.reason}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-porcelain-100/55">
                              {entry.mode === 'consumer'
                                ? presentation.runtime.consumerEntrySummary
                                : presentation.runtime.proEntrySummary}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-porcelain-100/55">
                              更适合：{entry.bestFor}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-porcelain-100/55">
                              下一步：{entry.nextStep}
                            </p>
                            {entry.recommended ? (
                              <p className="mt-2 text-[11px] font-medium text-signal-cyan">
                                推荐入口，会优先接这条主链
                              </p>
                            ) : null}
                            {!entry.available ? (
                              <p className="mt-2 text-[11px] font-medium text-signal-amber">
                                当前模板不主推这个入口，进入后会优先按模板推荐路径纠偏
                              </p>
                            ) : null}
                          </Link>
                        )
                      })}
                    </div>

                    <div className="mt-4 rounded-[1.1rem] border border-porcelain-50/10 bg-ink-950/[0.3] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
                        <Wand2 className="h-4 w-4 text-signal-cyan" />
                        结果动作与回流链
                      </div>
                      <p className="mt-2 text-sm leading-6 text-porcelain-100/62">
                        {presentation.resultBridge.summary}
                      </p>
                      <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-3">
                        <p className="text-xs font-semibold text-porcelain-50">默认分支</p>
                        <p className="mt-1 text-xs leading-5 text-porcelain-100/58">
                          {presentation.runtime.resultActionPrioritySummary}
                        </p>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {presentation.resultBridge.actions.map((action) => (
                          <div
                            key={action.id}
                            className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.26] px-3 py-3"
                          >
                            <p className="text-xs font-semibold text-porcelain-50">
                              {action.label}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-porcelain-100/55">
                              {action.description}
                            </p>
                            {presentation.runtime.defaultAction?.id === action.id ? (
                              <p className="mt-2 text-[11px] font-medium text-emerald-300">
                                模板默认优先动作
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1.1rem] border border-dashed border-porcelain-50/15 bg-ink-950/[0.26] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
                        <Tags className="h-4 w-4 text-signal-cyan" />
                        结构与链路上下文
                      </div>
                      <p className="mt-2 text-sm leading-6 text-porcelain-100/62">
                        {presentation.structureMeta.sceneLabel} ·{' '}
                        {presentation.structureMeta.sceneDescription}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {presentation.structureMeta.fields.map((field) => (
                          <span key={field} className="status-pill">
                            {field}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-1 text-xs leading-5 text-porcelain-100/58">
                        {presentation.structureMeta.summary.map((item) => (
                          <p key={item.id}>
                            {item.label}：{item.value}
                          </p>
                        ))}
                      </div>
                      <div className="mt-3 rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.24] px-3 py-3 text-xs leading-5 text-porcelain-100/56">
                        <p>
                          {presentation.runtime.followUpLabel}：
                          {presentation.runtime.followUpSummary}
                        </p>
                        <p className="mt-1">
                          {presentation.chainContext.followUpLabel}：
                          {presentation.chainContext.followUpSummary}
                        </p>
                        <p>
                          {presentation.chainContext.versionLabel}：
                          {presentation.chainContext.versionSummary}
                        </p>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-porcelain-100/55">
                        {presentation.structureMeta.metadataHint}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs"
                        onClick={() => setEditingId(template.id)}
                        disabled={busyId === template.id}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs"
                        onClick={() => void handleDuplicate(template)}
                        disabled={busyId === template.id}
                      >
                        <Copy className="mr-1 inline h-3.5 w-3.5" />
                        复制为新模板
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs"
                        onClick={() => void handleCopyContent(template.content, template.id)}
                        disabled={busyId === template.id}
                      >
                        <ClipboardCopy className="mr-1 inline h-3.5 w-3.5" />
                        复制内容
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral"
                        onClick={() => void handleDelete(template.id)}
                        disabled={busyId === template.id}
                      >
                        <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                        {busyId === template.id ? '处理中…' : '删除'}
                      </button>
                    </div>
                  </article>
                )
              })}
              {!loading && hasTemplates && filteredTemplates.length === 0 ? (
                <div className="rounded-[1.4rem] border border-porcelain-50/10 bg-ink-950/[0.4] p-5">
                  <p className="text-base font-semibold text-porcelain-50">
                    {hasActiveFilters ? '没有找到匹配的模板' : '当前还没有可用模板'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-porcelain-100/60">
                    {hasActiveFilters
                      ? '换个关键词、分类或排序试试，或者清空筛选后查看全部模板。'
                      : '先创建一个模板，后续就可以把它直接带回工作台作为普通版任务入口或专业版结构底稿。'}
                  </p>
                  {hasActiveFilters ? (
                    <>
                      <p className="mt-2 text-sm leading-6 text-porcelain-100/55">
                        当前是筛空态，不是模板丢失。清空筛选后，模板入口和回流链路不会受影响。
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm"
                          onClick={() => {
                            setSearchQuery('')
                            setFamilyFilter('全部类型')
                            setCategoryFilter('全部分类')
                          }}
                        >
                          清空筛选
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
