import type { PromptTemplateWorkbenchEntryIntent, PromptTemplateWorkbenchEntryMode } from './promptTemplate.studioEntry'
import type { PromptTemplateListItem } from './promptTemplate.types'
import { normalizePromptTemplateTags } from './promptTemplate.utils'

export type PromptTemplateFamilyId =
  | 'marketing'
  | 'product'
  | 'character'
  | 'scene'
  | 'illustration'
  | 'generic'

type PromptTemplateFamilyConfig = {
  id: PromptTemplateFamilyId
  label: string
  description: string
  recommendedMode: PromptTemplateWorkbenchEntryMode
  recommendedReason: string
  consumerEntryDescription: string
  proEntryDescription: string
  useCases: string[]
  structureFields: string[]
  metadataHint: string
  keywords: string[]
}

export type PromptTemplateCategoryOverview = {
  id: PromptTemplateFamilyId
  label: string
  description: string
  count: number
  recommendedMode: PromptTemplateWorkbenchEntryMode
}

export type PromptTemplatePresentation = {
  title: string
  preview: string
  category: string
  tags: string[]
  family: Omit<PromptTemplateFamilyConfig, 'keywords'>
  useCases: string[]
  recommendedEntry: {
    mode: PromptTemplateWorkbenchEntryMode
    intent: PromptTemplateWorkbenchEntryIntent
    label: string
    reason: string
  }
  entries: Array<{
    mode: PromptTemplateWorkbenchEntryMode
    intent: PromptTemplateWorkbenchEntryIntent
    label: string
    description: string
    recommended: boolean
  }>
  structureMeta: {
    statusLabel: string
    fields: string[]
    metadataHint: string
  }
}

const promptTemplateFamilyConfigs: PromptTemplateFamilyConfig[] = [
  {
    id: 'marketing',
    label: '传播与海报',
    description: '适合活动海报、社媒封面、宣传 KV 等需要快速成稿的传播型模板。',
    recommendedMode: 'consumer',
    recommendedReason: '先走普通版更快拿到第一版，再决定是否继续精修。',
    consumerEntryDescription: '从普通版任务入口起手，更适合先验证方向和文案氛围。',
    proEntryDescription: '进入专业版后可继续锁尺寸、负面提示词和风格强度。',
    useCases: ['活动海报', '社媒封面', '宣传横幅'],
    structureFields: ['主题信息', '核心卖点', '画面风格', '投放尺寸'],
    metadataHint: '后续可接渠道版本、默认尺寸和版式变体。',
    keywords: ['海报', '宣传', '营销', '活动', 'banner', '封面', '广告', 'kv', '社媒'],
  },
  {
    id: 'product',
    label: '商品与电商',
    description: '适合商品主图、卖点展示、电商包装和产品氛围图等模板。',
    recommendedMode: 'consumer',
    recommendedReason: '普通版更适合快速描述商品目标，再看结果决定是否补控制参数。',
    consumerEntryDescription: '从普通版开始，适合先说明商品、背景和想强调的卖点。',
    proEntryDescription: '进入专业版可继续细调镜头、清晰度和负面约束。',
    useCases: ['商品主图', '电商详情', '包装表现'],
    structureFields: ['商品主体', '场景背景', '卖点镜头', '光线风格'],
    metadataHint: '后续可接平台尺寸、卖点字段和背景方案。',
    keywords: ['电商', '产品', '商品', '包装', '主图', '详情页', 'sku', '卖点'],
  },
  {
    id: 'character',
    label: '人物与角色',
    description: '适合人物形象、角色设定、人像风格和角色探索类模板。',
    recommendedMode: 'pro',
    recommendedReason: '角色细节约束更多，专业版更适合先锁描述粒度和控制项。',
    consumerEntryDescription: '普通版适合先试人物方向，快速拿到第一版参考构图。',
    proEntryDescription: '专业版更适合控制服装、镜头、情绪和细节强度。',
    useCases: ['角色设定', '人物肖像', '形象探索'],
    structureFields: ['角色主体', '服装特征', '姿态情绪', '镜头设定'],
    metadataHint: '后续可接人物设定字段、姿势约束和风格变体。',
    keywords: ['角色', '人物', '人像', '肖像', 'cos', 'avatar', '模特', '少女', '男孩', '女孩'],
  },
  {
    id: 'scene',
    label: '空间与场景',
    description: '适合室内空间、背景场景、陈设氛围和环境搭建类模板。',
    recommendedMode: 'consumer',
    recommendedReason: '多数场景图先确定氛围即可，普通版起手更顺。',
    consumerEntryDescription: '从普通版开始，适合先描述空间用途、氛围和保留元素。',
    proEntryDescription: '专业版更适合继续锁镜头视角、细部陈设和输出尺寸。',
    useCases: ['室内空间', '背景搭建', '氛围场景'],
    structureFields: ['空间类型', '主视角', '氛围光线', '陈设元素'],
    metadataHint: '后续可接镜头角度、材质偏好和空间模板参数。',
    keywords: ['空间', '场景', '室内', '房间', '背景', '建筑', '环境', '展台', '客厅'],
  },
  {
    id: 'illustration',
    label: '插画与概念',
    description: '适合插画叙事、概念图、风格实验和世界观探索类模板。',
    recommendedMode: 'pro',
    recommendedReason: '概念和风格探索更依赖可控输入，专业版更容易连续调优。',
    consumerEntryDescription: '普通版适合先用一句话验证故事方向和大气氛。',
    proEntryDescription: '专业版适合继续控制流派、细节密度和风格组合。',
    useCases: ['概念插画', '故事画面', '风格探索'],
    structureFields: ['故事主体', '场景描述', '风格流派', '色彩基调'],
    metadataHint: '后续可接风格 token、叙事字段和默认构图策略。',
    keywords: ['插画', '概念', '设定', '世界观', '故事', '绘本', '动漫', '二次元', '风格'],
  },
  {
    id: 'generic',
    label: '通用模板',
    description: '还未完全结构化的通用模板，适合继续补充分类、标签和后续字段。',
    recommendedMode: 'consumer',
    recommendedReason: '先从普通版开始通常更轻，如果需要精控再切到专业版。',
    consumerEntryDescription: '普通版适合直接把模板当成任务起点，快速看第一版方向。',
    proEntryDescription: '专业版适合把现有 Prompt 当底稿，继续补充控制参数。',
    useCases: ['快速起稿', '方向探索', '通用复用'],
    structureFields: ['主题', '场景', '风格', '补充限制'],
    metadataHint: '后续可接字段 schema、默认参数和轻量追问顺序。',
    keywords: [],
  },
]

function buildPromptTemplateSourceText(template: PromptTemplateListItem) {
  return `${template.title ?? ''} ${template.content ?? ''} ${template.category ?? ''} ${normalizePromptTemplateTags(template.tags).join(' ')}`.toLowerCase()
}

function countPromptTemplateKeywordMatches(sourceText: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => total + (sourceText.includes(keyword) ? 1 : 0), 0)
}

export function formatPromptTemplateDate(value: string | number | Date) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getPromptTemplatePreview(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  return normalized || '空模板'
}

export function getPromptTemplateTitle(template: PromptTemplateListItem) {
  return template.title?.trim() || '未命名模板'
}

export function getPromptTemplateCategory(template: PromptTemplateListItem) {
  return template.category?.trim() || '未分类'
}

export function getPromptTemplateTags(template: PromptTemplateListItem) {
  return normalizePromptTemplateTags(template.tags)
}

export function getPromptTemplateSortTime(
  template: PromptTemplateListItem,
  sortMode: 'updated' | 'used',
) {
  const value =
    sortMode === 'used'
      ? (template.lastUsedAt ?? template.updatedAt ?? template.createdAt)
      : (template.updatedAt ?? template.createdAt)
  return Number(new Date(value))
}

export function getPromptTemplateSortDate(
  template: PromptTemplateListItem,
  sortMode: 'updated' | 'used',
) {
  return sortMode === 'used'
    ? (template.lastUsedAt ?? template.updatedAt ?? template.createdAt)
    : (template.updatedAt ?? template.createdAt)
}

export function resolvePromptTemplateFamily(template: PromptTemplateListItem) {
  const sourceText = buildPromptTemplateSourceText(template)
  let bestMatch = promptTemplateFamilyConfigs[promptTemplateFamilyConfigs.length - 1]
  let bestScore = 0

  for (const config of promptTemplateFamilyConfigs) {
    if (config.id === 'generic') continue
    const score = countPromptTemplateKeywordMatches(sourceText, config.keywords)
    if (score > bestScore) {
      bestScore = score
      bestMatch = config
    }
  }

  return bestMatch
}

export function getPromptTemplateSearchText(template: PromptTemplateListItem) {
  const presentation = buildPromptTemplatePresentation(template)
  return [
    template.title ?? '',
    template.content ?? '',
    template.category ?? '',
    presentation.family.label,
    presentation.family.description,
    presentation.useCases.join(' '),
    presentation.tags.join(' '),
  ]
    .join(' ')
    .toLowerCase()
}

export function buildPromptTemplatePresentation(
  template: PromptTemplateListItem,
): PromptTemplatePresentation {
  const title = getPromptTemplateTitle(template)
  const preview = getPromptTemplatePreview(template.content)
  const category = getPromptTemplateCategory(template)
  const tags = getPromptTemplateTags(template)
  const familyConfig = resolvePromptTemplateFamily(template)
  const isGenericLongform =
    familyConfig.id === 'generic' && (preview.length > 120 || tags.length >= 4)
  const recommendedMode = isGenericLongform ? 'pro' : familyConfig.recommendedMode
  const recommendedEntry = {
    mode: recommendedMode,
    intent: recommendedMode === 'consumer' ? 'task' : 'panel',
    label: recommendedMode === 'consumer' ? '推荐先从普通版起手' : '推荐先进入专业版',
    reason: isGenericLongform
      ? '这个模板内容较长，先放进专业版更适合继续补控制参数。'
      : familyConfig.recommendedReason,
  } as const
  const useCases = Array.from(
    new Set([
      ...familyConfig.useCases,
      ...tags.slice(0, 2).map((tag) => `${tag} 方向`),
      category !== '未分类' ? `${category} 场景` : '',
    ].filter(Boolean)),
  ).slice(0, 4)

  return {
    title,
    preview,
    category,
    tags,
    family: {
      id: familyConfig.id,
      label: familyConfig.label,
      description: familyConfig.description,
      recommendedMode,
      recommendedReason: recommendedEntry.reason,
      consumerEntryDescription: familyConfig.consumerEntryDescription,
      proEntryDescription: familyConfig.proEntryDescription,
      useCases: familyConfig.useCases,
      structureFields: familyConfig.structureFields,
      metadataHint: familyConfig.metadataHint,
    },
    useCases,
    recommendedEntry,
    entries: [
      {
        mode: 'consumer',
        intent: 'task',
        label: '带去普通版任务入口',
        description: familyConfig.consumerEntryDescription,
        recommended: recommendedMode === 'consumer',
      },
      {
        mode: 'pro',
        intent: 'panel',
        label: '带去专业版控制面板',
        description: familyConfig.proEntryDescription,
        recommended: recommendedMode === 'pro',
      },
    ],
    structureMeta: {
      statusLabel: '结构模板元信息预留位',
      fields: familyConfig.structureFields,
      metadataHint: familyConfig.metadataHint,
    },
  }
}

export function buildPromptTemplateCategoryOverview(
  templates: PromptTemplateListItem[],
): PromptTemplateCategoryOverview[] {
  const counts = new Map<PromptTemplateFamilyId, number>()

  for (const template of templates) {
    const family = resolvePromptTemplateFamily(template)
    counts.set(family.id, (counts.get(family.id) ?? 0) + 1)
  }

  return promptTemplateFamilyConfigs
    .map((config) => ({
      id: config.id,
      label: config.label,
      description: config.description,
      count: counts.get(config.id) ?? 0,
      recommendedMode: config.recommendedMode,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return left.label.localeCompare(right.label, 'zh-Hans-CN')
    })
}
