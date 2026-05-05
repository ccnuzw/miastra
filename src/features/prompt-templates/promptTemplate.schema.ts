import type {
  PromptTemplateFamilyId,
  PromptTemplateFieldDefinition,
  PromptTemplateListItem,
  PromptTemplateScenarioId,
  PromptTemplateStructureDefaultSettings,
  PromptTemplateStructureMeta,
  PromptTemplateWorkbenchEntryIntent,
  PromptTemplateWorkbenchEntryMode,
} from './promptTemplate.types'
import { normalizePromptTemplateTags } from './promptTemplate.utils'

type PromptTemplateScenarioConfig = {
  id: PromptTemplateScenarioId
  familyId: PromptTemplateFamilyId
  label: string
  description: string
  recommendedMode: PromptTemplateWorkbenchEntryMode
  recommendedIntent: PromptTemplateWorkbenchEntryIntent
  keywords: string[]
  defaults: PromptTemplateStructureDefaultSettings
  fields: PromptTemplateFieldDefinition[]
}

function createField(definition: PromptTemplateFieldDefinition): PromptTemplateFieldDefinition {
  return definition
}

const promptTemplateScenarioConfigs: PromptTemplateScenarioConfig[] = [
  {
    id: 'poster-campaign',
    familyId: 'marketing',
    label: '海报宣传',
    description: '适合活动海报、社媒封面和品牌传播素材，强调主题信息、卖点和版式方向。',
    recommendedMode: 'consumer',
    recommendedIntent: 'task',
    keywords: ['海报', '宣传', '营销', '活动', 'banner', '封面', '广告', 'kv', '社媒', '品牌'],
    defaults: {
      aspectLabel: '3:4',
      resolutionTier: '1k',
      quality: 'medium',
    },
    fields: [
      createField({
        id: 'headline',
        label: '主题信息',
        description: '说明活动主题、主标题或核心宣传语。',
        group: 'subject',
        input: 'textarea',
        required: true,
        examples: ['新品发布', '限时活动', '品牌联名'],
      }),
      createField({
        id: 'value',
        label: '核心卖点',
        description: '写明最想被看见的利益点或产品亮点。',
        group: 'context',
        input: 'textarea',
        required: true,
        examples: ['限时折扣', '高级质感', '新品上市'],
      }),
      createField({
        id: 'visual-style',
        label: '画面风格',
        description: '定义调性、色彩和主视觉感觉。',
        group: 'style',
        input: 'text',
        examples: ['高级极简', '亮眼节庆', '品牌感'],
      }),
      createField({
        id: 'delivery-size',
        label: '投放尺寸',
        description: '说明更偏竖版、横版或方图。',
        group: 'output',
        input: 'single-select',
        examples: ['3:4 竖版', '1:1 方图', '16:9 横幅'],
      }),
    ],
  },
  {
    id: 'product-shot',
    familyId: 'product',
    label: '商品展示',
    description: '适合白底图、详情页和种草物料，强调商品主体、背景方案和镜头卖点。',
    recommendedMode: 'consumer',
    recommendedIntent: 'task',
    keywords: ['电商', '产品', '商品', '包装', '主图', '详情页', 'sku', '卖点', '上架', '白底'],
    defaults: {
      aspectLabel: '1:1',
      resolutionTier: '1k',
      quality: 'medium',
    },
    fields: [
      createField({
        id: 'product-subject',
        label: '商品主体',
        description: '说明商品名称、材质、颜色或要保留的外观特征。',
        group: 'subject',
        input: 'textarea',
        required: true,
        examples: ['香水瓶', '护肤套装', '咖啡机'],
      }),
      createField({
        id: 'usage-scene',
        label: '使用场景',
        description: '说明用于主图、详情页还是社媒种草。',
        group: 'context',
        input: 'single-select',
        required: true,
        examples: ['电商主图', '详情页', '社媒展示'],
      }),
      createField({
        id: 'background-direction',
        label: '背景方向',
        description: '说明白底、影棚或生活化场景。',
        group: 'style',
        input: 'single-select',
        examples: ['纯白背景', '影棚布光', '生活场景'],
      }),
      createField({
        id: 'hero-angle',
        label: '卖点镜头',
        description: '写明想强调的角度、细节或质感。',
        group: 'output',
        input: 'text',
        examples: ['正面完整', '突出瓶身质感', '强调包装细节'],
      }),
    ],
  },
  {
    id: 'portrait-look',
    familyId: 'character',
    label: '人物角色',
    description: '适合头像、人像和角色设定，强调人物主体、服装情绪和镜头表达。',
    recommendedMode: 'pro',
    recommendedIntent: 'panel',
    keywords: ['角色', '人物', '人像', '肖像', 'avatar', '模特', '少女', '男孩', '女孩', '职业照'],
    defaults: {
      aspectLabel: '3:4',
      resolutionTier: '1k',
      quality: 'medium',
    },
    fields: [
      createField({
        id: 'character-subject',
        label: '角色主体',
        description: '说明人物身份、年龄感或关键外观特征。',
        group: 'subject',
        input: 'textarea',
        required: true,
        examples: ['都市女生', '职业人像', '幻想角色'],
      }),
      createField({
        id: 'wardrobe',
        label: '服装特征',
        description: '说明服装、发型、妆面或配饰重点。',
        group: 'context',
        input: 'text',
        examples: ['西装职业感', '复古连衣裙', '未来风护甲'],
      }),
      createField({
        id: 'mood-pose',
        label: '姿态情绪',
        description: '说明表情、动作或想传达的状态。',
        group: 'style',
        input: 'text',
        examples: ['自然微笑', '冷静克制', '动态回头'],
      }),
      createField({
        id: 'camera',
        label: '镜头设定',
        description: '说明半身、特写、角度或背景虚化需求。',
        group: 'output',
        input: 'text',
        examples: ['半身特写', '正面近景', '浅景深'],
      }),
    ],
  },
  {
    id: 'space-scene',
    familyId: 'scene',
    label: '空间场景',
    description: '适合室内、展台和环境搭建，强调空间用途、主视角和氛围光线。',
    recommendedMode: 'consumer',
    recommendedIntent: 'task',
    keywords: ['空间', '场景', '室内', '房间', '背景', '建筑', '环境', '展台', '客厅'],
    defaults: {
      aspectLabel: '16:9',
      resolutionTier: '1k',
      quality: 'medium',
    },
    fields: [
      createField({
        id: 'space-type',
        label: '空间类型',
        description: '说明客厅、展台、门店或其他空间用途。',
        group: 'subject',
        input: 'text',
        required: true,
        examples: ['客厅', '展台', '咖啡店'],
      }),
      createField({
        id: 'viewpoint',
        label: '主视角',
        description: '说明俯视、平视或近景展示方式。',
        group: 'context',
        input: 'text',
        required: true,
        examples: ['平视全景', '入口视角', '局部特写'],
      }),
      createField({
        id: 'lighting',
        label: '氛围光线',
        description: '说明暖光、冷调或自然采光方向。',
        group: 'style',
        input: 'text',
        examples: ['自然采光', '夜景氛围', '暖色灯光'],
      }),
      createField({
        id: 'decor',
        label: '陈设元素',
        description: '说明要保留或强化的摆件、材质与装饰。',
        group: 'output',
        input: 'textarea',
        examples: ['木质家具', '绿植点缀', '品牌导视'],
      }),
    ],
  },
  {
    id: 'illustration-concept',
    familyId: 'illustration',
    label: '插画概念',
    description: '适合概念图、叙事插画和风格实验，强调故事主体、流派与色彩基调。',
    recommendedMode: 'pro',
    recommendedIntent: 'panel',
    keywords: ['插画', '概念', '设定', '世界观', '故事', '绘本', '动漫', '二次元', '风格'],
    defaults: {
      aspectLabel: '3:4',
      resolutionTier: '2k',
      quality: 'high',
    },
    fields: [
      createField({
        id: 'story-subject',
        label: '故事主体',
        description: '说明角色、物件或事件的核心主体。',
        group: 'subject',
        input: 'textarea',
        required: true,
        examples: ['未来旅人', '机械森林', '神话生物'],
      }),
      createField({
        id: 'world-scene',
        label: '场景描述',
        description: '说明世界观、地点和叙事背景。',
        group: 'context',
        input: 'textarea',
        required: true,
        examples: ['赛博城市', '海底遗迹', '童话王国'],
      }),
      createField({
        id: 'art-style',
        label: '风格流派',
        description: '说明插画风格、媒介或表现手法。',
        group: 'style',
        input: 'text',
        examples: ['厚涂', '日系动画', '水彩感'],
      }),
      createField({
        id: 'color-tone',
        label: '色彩基调',
        description: '说明冷暖倾向、主色和情绪氛围。',
        group: 'output',
        input: 'text',
        examples: ['低饱和冷调', '高对比霓虹', '梦幻粉紫'],
      }),
    ],
  },
  {
    id: 'generic-starter',
    familyId: 'generic',
    label: '通用起稿',
    description: '适合还未完全结构化的通用模板，先定义主题、场景、风格和限制条件。',
    recommendedMode: 'consumer',
    recommendedIntent: 'task',
    keywords: [],
    defaults: {
      aspectLabel: '3:4',
      resolutionTier: '1k',
      quality: 'low',
    },
    fields: [
      createField({
        id: 'subject',
        label: '主题主体',
        description: '说明最核心的对象、人物或产品。',
        group: 'subject',
        input: 'textarea',
        required: true,
        examples: ['一瓶香水', '一位女生', '一间客厅'],
      }),
      createField({
        id: 'scene',
        label: '场景范围',
        description: '说明发生在什么环境、用途或展示位置。',
        group: 'context',
        input: 'text',
        examples: ['宣传海报', '商品详情页', '角色设定'],
      }),
      createField({
        id: 'style',
        label: '风格方向',
        description: '说明写实、插画、高级感或其他风格倾向。',
        group: 'style',
        input: 'text',
        examples: ['写实', '高级极简', '概念插画'],
      }),
      createField({
        id: 'constraints',
        label: '补充限制',
        description: '说明不希望出现的元素或结果边界。',
        group: 'output',
        input: 'textarea',
        examples: ['不要太花', '主体完整', '避免文字遮挡'],
      }),
    ],
  },
]

function buildPromptTemplateSourceText(template: PromptTemplateListItem) {
  return `${template.title ?? ''} ${template.content ?? ''} ${template.category ?? ''} ${normalizePromptTemplateTags(template.tags).join(' ')}`.toLowerCase()
}

function countKeywordMatches(sourceText: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => total + (sourceText.includes(keyword) ? 1 : 0), 0)
}

function formatDefaultSettings(defaults: PromptTemplateStructureDefaultSettings) {
  const segments = [
    defaults.aspectLabel ? `${defaults.aspectLabel} 画幅` : '',
    defaults.resolutionTier ? defaults.resolutionTier.toUpperCase() : '',
    defaults.quality ? `质量 ${defaults.quality}` : '',
  ].filter(Boolean)
  return segments.join(' / ') || '未设置'
}

function resolveScenarioConfig(
  template: PromptTemplateListItem,
  sourceText = buildPromptTemplateSourceText(template),
) {
  const explicitScenarioId = template.structure?.scenarioId
  if (explicitScenarioId) {
    return (
      promptTemplateScenarioConfigs.find((config) => config.id === explicitScenarioId) ??
      promptTemplateScenarioConfigs[promptTemplateScenarioConfigs.length - 1]
    )
  }

  let bestMatch = promptTemplateScenarioConfigs[promptTemplateScenarioConfigs.length - 1]
  let bestScore = 0

  for (const config of promptTemplateScenarioConfigs) {
    if (config.id === 'generic-starter') continue
    const score = countKeywordMatches(sourceText, config.keywords)
    if (score > bestScore) {
      bestScore = score
      bestMatch = config
    }
  }

  return bestMatch
}

export function getPromptTemplateScenarioConfigById(id: PromptTemplateScenarioId) {
  return promptTemplateScenarioConfigs.find((config) => config.id === id) ?? null
}

export function buildPromptTemplateStructure(template: PromptTemplateListItem): PromptTemplateStructureMeta {
  const sourceText = buildPromptTemplateSourceText(template)
  const scenarioConfig = resolveScenarioConfig(template, sourceText)
  const tags = normalizePromptTemplateTags(template.tags)
  const mergedDefaults = {
    ...scenarioConfig.defaults,
    ...template.structure?.defaults,
  }
  const fields = template.structure?.fields?.length ? template.structure.fields : scenarioConfig.fields
  const recommendedMode = template.structure?.recommendedMode ?? scenarioConfig.recommendedMode
  const recommendedIntent =
    template.structure?.recommendedIntent ??
    (recommendedMode === 'consumer' ? 'task' : 'panel')
  const status = template.structure?.status ?? 'derived'

  const summary = [
    {
      id: 'scenario',
      label: '场景',
      value: template.structure?.scenarioLabel?.trim() || scenarioConfig.label,
    },
    {
      id: 'entry',
      label: '推荐入口',
      value: recommendedMode === 'consumer' ? '普通版任务入口' : '专业版控制面板',
    },
    {
      id: 'defaults',
      label: '默认参数',
      value: formatDefaultSettings(mergedDefaults),
    },
    {
      id: 'fields',
      label: '重点字段',
      value: fields.slice(0, 3).map((field) => field.label).join(' / '),
    },
  ]

  if (tags.length) {
    summary.push({
      id: 'tags',
      label: '标签',
      value: tags.slice(0, 3).join(' / '),
    })
  }

  return {
    status,
    familyId: template.structure?.familyId ?? scenarioConfig.familyId,
    scenarioId: scenarioConfig.id,
    scenarioLabel: template.structure?.scenarioLabel?.trim() || scenarioConfig.label,
    sceneDescription: template.structure?.sceneDescription?.trim() || scenarioConfig.description,
    recommendedMode,
    recommendedIntent,
    entryModes: template.structure?.entryModes?.length ? template.structure.entryModes : ['consumer', 'pro'],
    defaults: mergedDefaults,
    fields,
    summary,
  }
}

export function getPromptTemplateStructureStatusLabel(status: PromptTemplateStructureMeta['status']) {
  return status === 'structured' ? '结构模板' : '自动推导结构'
}

export function getPromptTemplateStructureFieldDigest(fields: PromptTemplateFieldDefinition[], limit = 3) {
  return fields.slice(0, limit).map((field) => `${field.required ? '必填' : '可选'} · ${field.label}`)
}
