import type {
  PromptTemplateFamilyId,
  PromptTemplateListItem,
  PromptTemplateWorkbenchEntryIntent,
  PromptTemplateWorkbenchEntryMode,
} from './promptTemplate.types'
import {
  getPromptTemplateStructure,
  getPromptTemplateStructureFieldDigest,
  getPromptTemplateStructureStatusLabel,
} from './promptTemplate.schema'
import {
  getStudioFlowActionLabel,
  type StudioFlowActionId,
} from './studioFlowSemantic'
import { normalizePromptTemplateTags } from './promptTemplate.utils'

type PromptTemplateFamilyConfig = {
  id: PromptTemplateFamilyId
  label: string
  description: string
  recommendedMode: PromptTemplateWorkbenchEntryMode
  recommendedReason: string
  consumerEntryDescription: string
  consumerEntryBestFor: string
  consumerEntryNextStep: string
  proEntryDescription: string
  proEntryBestFor: string
  proEntryNextStep: string
  useCases: string[]
  metadataHint: string
  executionIntentLabel: string
  executionIntentSummary: string
  starterHint: string
  resultActionIds: StudioFlowActionId[]
  resultActionDescriptions: Partial<Record<StudioFlowActionId, string>>
  followUpSummary: string
  versionSummary: string
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
  family: PromptTemplateFamilyConfig
  useCases: string[]
  recommendedEntry: {
    mode: PromptTemplateWorkbenchEntryMode
    intent: PromptTemplateWorkbenchEntryIntent
    label: string
    reason: string
    bestFor: string
    nextStep: string
  }
  entries: Array<{
    mode: PromptTemplateWorkbenchEntryMode
    intent: PromptTemplateWorkbenchEntryIntent
    label: string
    description: string
    recommended: boolean
    bestFor: string
    nextStep: string
  }>
  executionIntent: {
    label: string
    summary: string
    starter: string
  }
  resultBridge: {
    label: string
    summary: string
    actions: Array<{
      id: StudioFlowActionId
      label: string
      description: string
    }>
  }
  chainContext: {
    followUpLabel: string
    followUpSummary: string
    versionLabel: string
    versionSummary: string
  }
  runtime: {
    followUpLabel: string
    followUpSummary: string
    guidedFieldLabels: string[]
    guidedQuestionCount: number
    consumerEntrySummary: string
    proEntrySummary: string
    resultActionPrioritySummary: string
    defaultAction: {
      id: StudioFlowActionId
      label: string
      description: string
    } | null
  }
  structureMeta: {
    statusLabel: string
    scene: {
      id: string
      label: string
      description: string
    }
    sceneId: string
    sceneLabel: string
    sceneDescription: string
    fields: string[]
    summary: Array<{
      id: string
      label: string
      value: string
    }>
    metadataHint: string
  }
}

const promptTemplateFamilyConfigs: Record<PromptTemplateFamilyId, PromptTemplateFamilyConfig> = {
  marketing: {
    id: 'marketing',
    label: '传播与海报',
    description: '适合活动海报、社媒封面、宣传 KV 等需要快速成稿的传播型模板。',
    recommendedMode: 'consumer',
    recommendedReason: '先走普通版更快拿到第一版，再决定是否继续精修。',
    consumerEntryDescription: '从普通版任务入口起手，更适合先验证方向和文案氛围。',
    consumerEntryBestFor: '先快速起稿，先看传播主题、卖点和氛围是否成立。',
    consumerEntryNextStep: '先出首版海报，再用结果动作继续补版式重点或卖点字感。',
    proEntryDescription: '进入专业版后可继续锁尺寸、负面提示词和风格强度。',
    proEntryBestFor: '已经明确传播方向，需要继续锁画幅、密度和负面约束。',
    proEntryNextStep: '进入专业版后先确认尺寸和风格，再准备重跑或派生渠道版本。',
    useCases: ['活动海报', '社媒封面', '宣传横幅'],
    metadataHint: '优先补主题信息、卖点和版式尺寸，后续可继续挂渠道版本。',
    executionIntentLabel: '快速起一版传播稿',
    executionIntentSummary: '先把主题、卖点和情绪氛围落成首版视觉，再决定是否继续精修。',
    starterHint: '适合先用模板带出主题、卖点和版式方向。',
    resultActionIds: ['continue-edit', 'guided-refine', 'retry-version'],
    resultActionDescriptions: {
      'continue-edit': '首版出来后优先继续改文案气质、构图和版面重点。',
      'guided-refine': '需要系统帮你补传播目标、氛围和重点时，直接走轻量追问。',
      'retry-version': '方向成立但结果不稳时，按同一模板参数快速重跑更高效。',
    },
    followUpSummary: '更适合先出首版，再围绕传播目标和版面重点补轻量追问。',
    versionSummary: '适合同一活动继续重跑、换渠道尺寸，或沿当前版本派生多套海报。',
  },
  product: {
    id: 'product',
    label: '商品与电商',
    description: '适合商品主图、卖点展示、电商包装和产品氛围图等模板。',
    recommendedMode: 'consumer',
    recommendedReason: '普通版更适合快速描述商品目标，再看结果决定是否补控制参数。',
    consumerEntryDescription: '从普通版开始，适合先说明商品、背景和想强调的卖点。',
    consumerEntryBestFor: '需要先验证商品主体、卖点镜头和背景方向是否对路。',
    consumerEntryNextStep: '首版出来后优先继续改背景、角度和卖点聚焦。',
    proEntryDescription: '进入专业版可继续细调镜头、清晰度和负面约束。',
    proEntryBestFor: '已经确认商品方向，需要细控镜头、清晰度和参数稳定性。',
    proEntryNextStep: '进入专业版后先锁默认尺寸与质量，再准备重跑或派生多平台版本。',
    useCases: ['商品主图', '电商详情', '包装表现'],
    metadataHint: '优先补商品主体、背景方向和卖点镜头，后续可接平台尺寸。',
    executionIntentLabel: '把商品卖点快速落成首版',
    executionIntentSummary: '优先建立商品主体、背景和卖点镜头，让模板先承担一次可执行起稿。',
    starterHint: '适合把商品目标、背景方向和卖点镜头一次性带入工作台。',
    resultActionIds: ['continue-edit', 'guided-refine', 'retry-version'],
    resultActionDescriptions: {
      'continue-edit': '优先沿当前结果继续改背景、角度、光感和摆位。',
      'guided-refine': '当商品用途、背景风格或卖点信息没讲全时，可直接补轻量追问。',
      'retry-version': '同一商品经常需要稳定重跑多版，这条链更适合复用模板参数。',
    },
    followUpSummary: '普通版起手后，适合用结果动作继续改商品背景、用途场景和卖点聚焦。',
    versionSummary: '适合围绕同一商品持续重跑、换背景或分叉不同平台素材。',
  },
  character: {
    id: 'character',
    label: '人物与角色',
    description: '适合人物形象、角色设定、人像风格和角色探索类模板。',
    recommendedMode: 'pro',
    recommendedReason: '角色细节约束更多，专业版更适合先锁描述粒度和控制项。',
    consumerEntryDescription: '普通版适合先试人物方向，快速拿到第一版参考构图。',
    consumerEntryBestFor: '先验证人物方向、构图感觉或整体情绪是否值得继续。',
    consumerEntryNextStep: '先出一版人物方向，再决定是否切回专业版继续细控。',
    proEntryDescription: '专业版更适合控制服装、镜头、情绪和细节强度。',
    proEntryBestFor: '需要从一开始就控制服装、镜头、神态和风格稳定性。',
    proEntryNextStep: '进入专业版后先锁人物字段，再围绕版本链做重跑和分叉。',
    useCases: ['角色设定', '人物肖像', '形象探索'],
    metadataHint: '优先补人物主体、情绪和镜头设定，后续可接姿势与风格变体。',
    executionIntentLabel: '先锁角色设定，再持续派生',
    executionIntentSummary: '这类模板更强调从一开始控制人物字段，便于后续稳定迭代和多轮派生。',
    starterHint: '适合把人物主体、服装、镜头和情绪一次性带入专业控制链。',
    resultActionIds: ['guided-refine', 'branch-version', 'retry-version'],
    resultActionDescriptions: {
      'guided-refine': '人物信息还不完整时，可以先补情绪、用途和风格追问。',
      'branch-version': '当角色方向成立后，更适合从这一版分叉出服装、表情或风格变体。',
      'retry-version': '参数方向稳定后，按当前控制链重跑更容易保持角色一致性。',
    },
    followUpSummary: '普通版只适合先试方向，真正的多轮细化更建议回到专业版控制链。',
    versionSummary: '角色模板更依赖版本链做同一人物的连续派生、重跑和分叉。',
  },
  scene: {
    id: 'scene',
    label: '空间与场景',
    description: '适合室内空间、背景场景、陈设氛围和环境搭建类模板。',
    recommendedMode: 'consumer',
    recommendedReason: '多数场景图先确定氛围即可，普通版起手更顺。',
    consumerEntryDescription: '从普通版开始，适合先描述空间用途、氛围和保留元素。',
    consumerEntryBestFor: '先快速确认空间气质、用途和大体构图方向。',
    consumerEntryNextStep: '首版出来后优先继续改视角、光线和陈设层次。',
    proEntryDescription: '专业版更适合继续锁镜头视角、细部陈设和输出尺寸。',
    proEntryBestFor: '场景方向已明确，需要继续压视角、细节密度和输出规格。',
    proEntryNextStep: '进入专业版后先锁镜头和尺寸，再准备多轮重跑或结构派生。',
    useCases: ['室内空间', '背景搭建', '氛围场景'],
    metadataHint: '优先补空间类型、视角与光线，后续可接材质偏好。',
    executionIntentLabel: '先把空间氛围建立起来',
    executionIntentSummary: '模板更适合先形成可判断的空间氛围，再顺着结果继续收紧视角和陈设。',
    starterHint: '适合把空间用途、视角和光线先带成一版可继续修改的底图。',
    resultActionIds: ['continue-edit', 'guided-refine', 'retry-version'],
    resultActionDescriptions: {
      'continue-edit': '优先沿当前结果继续改视角、动线、光线和陈设密度。',
      'guided-refine': '空间用途或保留元素没有讲清时，补追问能更快收紧场景。',
      'retry-version': '方向稳定后可持续重跑，挑出更适合继续派生的空间版本。',
    },
    followUpSummary: '更适合先出一版空间气氛，再沿当前结果持续补视角和陈设信息。',
    versionSummary: '适合同一空间做不同陈设、光线和用途的多轮重跑与派生。',
  },
  illustration: {
    id: 'illustration',
    label: '插画与概念',
    description: '适合插画叙事、概念图、风格实验和世界观探索类模板。',
    recommendedMode: 'pro',
    recommendedReason: '概念和风格探索更依赖可控输入，专业版更容易连续调优。',
    consumerEntryDescription: '普通版适合先用一句话验证故事方向和大气氛。',
    consumerEntryBestFor: '先试故事方向、画面气氛或主体关系是否值得继续。',
    consumerEntryNextStep: '先出一版概念气氛，再决定是否切到专业版做精控。',
    proEntryDescription: '专业版适合继续控制流派、细节密度和风格组合。',
    proEntryBestFor: '需要一开始就控制流派、色调、细节密度和风格组合。',
    proEntryNextStep: '进入专业版后先锁风格链，再围绕版本链持续派生世界观或镜头方案。',
    useCases: ['概念插画', '故事画面', '风格探索'],
    metadataHint: '优先补故事主体、场景和色彩基调，后续可接风格 token。',
    executionIntentLabel: '把概念方向变成可连续推演的底稿',
    executionIntentSummary: '这类模板更适合先把概念、风格和叙事关系压成稳定底稿，再持续派生。',
    starterHint: '适合把主体、世界观和风格基调一起带入专业版做连续调优。',
    resultActionIds: ['guided-refine', 'branch-version', 'retry-version'],
    resultActionDescriptions: {
      'guided-refine': '故事主体、场景关系或色彩基调不清时，先补追问能更快收口。',
      'branch-version': '概念方向成立后，建议从当前版本分叉不同流派、镜头或叙事方案。',
      'retry-version': '当控制链已稳定，可以按同一模板参数持续重跑挑版本。',
    },
    followUpSummary: '可先验证概念方向，但真正的连续风格实验更适合回到专业版。',
    versionSummary: '插画模板适合围绕同一概念持续分叉、重跑和派生多套世界观方案。',
  },
  generic: {
    id: 'generic',
    label: '通用模板',
    description: '还未完全结构化的通用模板，适合继续补充分类、标签和后续字段。',
    recommendedMode: 'consumer',
    recommendedReason: '先从普通版开始通常更轻，如果需要精控再切到专业版。',
    consumerEntryDescription: '普通版适合直接把模板当成任务起点，快速看第一版方向。',
    consumerEntryBestFor: '还没完全结构化时，先验证方向和可执行性。',
    consumerEntryNextStep: '先把第一版做出来，再决定要不要补追问或切到专业版。',
    proEntryDescription: '专业版适合把现有 Prompt 当底稿，继续补充控制参数。',
    proEntryBestFor: '模板较长、限制较多，或已经准备好继续补参数和负面约束。',
    proEntryNextStep: '进入专业版后先梳理控制项，再决定重跑还是派生。',
    useCases: ['快速起稿', '方向探索', '通用复用'],
    metadataHint: '优先补主题、场景和限制条件，后续可接正式 schema。',
    executionIntentLabel: '把通用 Prompt 提升成可执行入口',
    executionIntentSummary: '先用模板作为执行起点，边生成边补结构语义，让它逐步变成更稳定的 Skill 入口。',
    starterHint: '适合先带入一句完整描述，再根据结果决定要补哪些结构字段。',
    resultActionIds: ['continue-edit', 'guided-refine', 'retry-version'],
    resultActionDescriptions: {
      'continue-edit': '先沿首版继续改方向，把通用模板逐步收紧成稳定能力。',
      'guided-refine': '当主体、场景或限制条件不够清晰时，补追问最适合继续结构化。',
      'retry-version': '方向基本成立后，重跑有助于筛选更适合复用的版本。',
    },
    followUpSummary: '适合边用边补结构语义，先靠结果动作和轻量追问逐步收口。',
    versionSummary: '通用模板可以先通过重跑和分叉积累版本语义，再反推更稳定的模板结构。',
  },
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
  const structure = getPromptTemplateStructure(template)
  return promptTemplateFamilyConfigs[structure.familyId]
}

export function getPromptTemplateSearchText(template: PromptTemplateListItem) {
  const presentation = buildPromptTemplatePresentation(template)
  return [
    template.title ?? '',
    template.content ?? '',
    template.category ?? '',
    presentation.family.label,
    presentation.family.description,
    presentation.structureMeta.sceneLabel,
    presentation.structureMeta.sceneDescription,
    presentation.useCases.join(' '),
    presentation.tags.join(' '),
    presentation.structureMeta.fields.join(' '),
    presentation.structureMeta.summary.map((item) => item.value).join(' '),
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
  const structure = getPromptTemplateStructure(template)
  const family = promptTemplateFamilyConfigs[structure.familyId]
  const isGenericLongform =
    structure.familyId === 'generic' && (preview.length > 120 || tags.length >= 4)
  const recommendedMode = isGenericLongform ? 'pro' : structure.recommendedMode
  const recommendedIntent = recommendedMode === 'consumer' ? 'task' : 'panel'
  const recommendedEntry = {
    mode: recommendedMode,
    intent: recommendedIntent,
    label: recommendedMode === 'consumer' ? '推荐先从普通版起手' : '推荐先进入专业版',
    reason: isGenericLongform
      ? '这个模板内容较长，先放进专业版更适合继续补控制参数。'
      : family.recommendedReason,
    bestFor:
      recommendedMode === 'consumer' ? family.consumerEntryBestFor : family.proEntryBestFor,
    nextStep:
      recommendedMode === 'consumer' ? family.consumerEntryNextStep : family.proEntryNextStep,
  } as const
  const useCases = Array.from(
    new Set([
      ...family.useCases,
      structure.scenarioLabel,
      ...tags.slice(0, 2).map((tag) => `${tag} 方向`),
      category !== '未分类' ? `${category} 场景` : '',
    ].filter(Boolean)),
  ).slice(0, 5)
  const resultActions = family.resultActionIds.map((actionId) => ({
    id: actionId,
    label: getStudioFlowActionLabel(actionId),
    description:
      family.resultActionDescriptions[actionId] ?? `${getStudioFlowActionLabel(actionId)}会承接当前模板的场景语义。`,
  }))
  const guidedFields = structure.fields.filter((field) => Boolean(field.guided?.options?.length))
  const defaultGuidedSelections = guidedFields
    .map((field) => {
      const option =
        field.guided?.options.find((item) => item.id === field.guided?.defaultOptionId) ??
        field.guided?.options[0]
      if (!option) return null
      return `${field.guided?.questionTitle?.trim() || field.label}：${option.label}`
    })
    .filter(Boolean) as string[]
  const defaultAction = resultActions[0] ?? null
  const resultActionPrioritySummary = resultActions.length
    ? `默认先走「${resultActions[0].label}」，随后按 ${resultActions
        .slice(1)
        .map((action) => `「${action.label}」`)
        .join(' / ')} 承接。`
    : '当前模板未声明明确的结果动作优先级。'
  const followUpSummary = guidedFields.length
    ? defaultGuidedSelections.length
      ? `进入普通版时会先按模板默认追问路径补齐 ${guidedFields.length} 个字段：${defaultGuidedSelections.join(' / ')}。`
      : `进入普通版时会优先围绕 ${guidedFields.map((field) => field.label).join(' / ')} 继续追问。`
    : family.followUpSummary
  const consumerEntrySummary = guidedFields.length
    ? `普通版会直接带上模板起稿内容，并预挂 ${guidedFields.length} 步模板追问，再优先接「${defaultAction?.label ?? '继续处理'}」。`
    : `普通版会直接带上模板起稿内容，并优先接「${defaultAction?.label ?? '继续处理'}」。`
  const proEntrySummary = `专业版会把模板作为结构底稿接入控制区，先锁 ${getPromptTemplateStructureFieldDigest(structure.fields, 3).join(' / ')}，再按「${defaultAction?.label ?? '继续处理'}」继续。`

  return {
    title,
    preview,
    category,
    tags,
    family: {
      ...family,
      recommendedMode,
      recommendedReason: recommendedEntry.reason,
    },
    useCases,
    recommendedEntry,
    entries: [
      {
        mode: 'consumer',
        intent: 'task',
        label: '进入普通版起稿',
        description: family.consumerEntryDescription,
        recommended: recommendedMode === 'consumer',
        bestFor: family.consumerEntryBestFor,
        nextStep: family.consumerEntryNextStep,
      },
      {
        mode: 'pro',
        intent: 'panel',
        label: '进入专业版精修',
        description: family.proEntryDescription,
        recommended: recommendedMode === 'pro',
        bestFor: family.proEntryBestFor,
        nextStep: family.proEntryNextStep,
      },
    ],
    executionIntent: {
      label: family.executionIntentLabel,
      summary: family.executionIntentSummary,
      starter: family.starterHint,
    },
    resultBridge: {
      label: '结果动作承接',
      summary:
        recommendedMode === 'consumer'
          ? '更适合先从模板出第一版，再用结果动作继续修改、补追问或按当前参数重跑。'
          : '更适合先把模板带入控制链，再围绕结果动作做追问补充、版本分叉和稳定重跑。',
      actions: resultActions,
    },
    chainContext: {
      followUpLabel: '追问链',
      followUpSummary,
      versionLabel: '版本链',
      versionSummary: family.versionSummary,
    },
    runtime: {
      followUpLabel: guidedFields.length ? `模板追问 ${guidedFields.length} 步` : '结果后补追问',
      followUpSummary,
      guidedFieldLabels: guidedFields.map((field) => field.label),
      guidedQuestionCount: guidedFields.length,
      consumerEntrySummary,
      proEntrySummary,
      resultActionPrioritySummary,
      defaultAction,
    },
    structureMeta: {
      statusLabel: getPromptTemplateStructureStatusLabel(structure.status),
      scene: {
        id: structure.scene.id,
        label: structure.scene.label,
        description: structure.scene.description,
      },
      sceneId: structure.scene.id,
      sceneLabel: structure.scene.label,
      sceneDescription: structure.scene.description,
      fields: getPromptTemplateStructureFieldDigest(structure.fields, 4),
      summary: structure.summary,
      metadataHint: family.metadataHint,
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

  return Object.values(promptTemplateFamilyConfigs)
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
