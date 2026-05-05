import type {
  PromptTemplateScenarioId,
  PromptTemplateWorkbenchEntryIntent,
  PromptTemplateWorkbenchEntryMode,
} from './promptTemplate.types'

export type StudioFlowSceneId =
  | 'poster-campaign'
  | 'product-shot'
  | 'portrait-avatar'
  | 'generic-create'
  | 'image-edit'
  | 'space-scene'
  | 'illustration-concept'

export type StudioFlowSourceType =
  | 'template'
  | 'task-preset'
  | 'scene-preset'
  | 'guided-flow'
  | 'result-action'
  | 'work-replay'
  | 'task-replay'

export type StudioFlowActionId =
  | 'start-create'
  | 'continue-edit'
  | 'guided-refine'
  | 'continue-version'
  | 'branch-version'
  | 'retry-version'
  | 'restore-controls'

export type StudioFlowFieldId =
  | 'usageScenario'
  | 'backgroundStyle'
  | 'visualTone'
  | 'campaignGoal'
  | 'layoutFocus'
  | 'portraitPurpose'
  | 'portraitStyle'
  | 'retouchLevel'
  | 'spacePurpose'
  | 'spaceViewpoint'
  | 'spaceMood'
  | 'storySubject'
  | 'storyWorld'
  | 'storyStyle'
  | 'colorMood'
  | 'genericSubject'
  | 'genericScene'
  | 'genericStyle'
  | 'genericConstraint'

export type StudioFlowScene = {
  id: StudioFlowSceneId
  label: string
  description: string
  recommendedMode: PromptTemplateWorkbenchEntryMode
  recommendedIntent: PromptTemplateWorkbenchEntryIntent
}

type StudioFlowSceneMeta = StudioFlowScene & {
  fieldLabels: Partial<Record<StudioFlowFieldId, string>>
}

const studioFlowSceneMetaMap: Record<StudioFlowSceneId, StudioFlowSceneMeta> = {
  'poster-campaign': {
    id: 'poster-campaign',
    label: '海报宣传',
    description: '适合活动海报、社媒封面和品牌传播素材。',
    recommendedMode: 'consumer',
    recommendedIntent: 'task',
    fieldLabels: {
      campaignGoal: '传播目标',
      visualTone: '氛围调性',
      layoutFocus: '版面重点',
    },
  },
  'product-shot': {
    id: 'product-shot',
    label: '商品展示',
    description: '适合白底图、详情页和种草展示。',
    recommendedMode: 'consumer',
    recommendedIntent: 'task',
    fieldLabels: {
      usageScenario: '用途场景',
      backgroundStyle: '背景方向',
      visualTone: '画面感觉',
    },
  },
  'portrait-avatar': {
    id: 'portrait-avatar',
    label: '头像与人像',
    description: '适合头像优化、职业照和生活感人像。',
    recommendedMode: 'consumer',
    recommendedIntent: 'task',
    fieldLabels: {
      portraitPurpose: '使用目的',
      portraitStyle: '人物感觉',
      retouchLevel: '修饰程度',
    },
  },
  'image-edit': {
    id: 'image-edit',
    label: '图片继续修改',
    description: '适合保留主体继续改背景、风格或局部细节。',
    recommendedMode: 'consumer',
    recommendedIntent: 'task',
    fieldLabels: {},
  },
  'space-scene': {
    id: 'space-scene',
    label: '空间场景',
    description: '适合室内、展台和环境搭建。',
    recommendedMode: 'consumer',
    recommendedIntent: 'task',
    fieldLabels: {
      spacePurpose: '空间用途',
      spaceViewpoint: '观看角度',
      spaceMood: '氛围光线',
    },
  },
  'illustration-concept': {
    id: 'illustration-concept',
    label: '插画概念',
    description: '适合概念图、叙事插画和风格实验。',
    recommendedMode: 'pro',
    recommendedIntent: 'panel',
    fieldLabels: {
      storySubject: '创作目标',
      storyWorld: '场景关系',
      storyStyle: '表现方式',
      colorMood: '色彩氛围',
    },
  },
  'generic-create': {
    id: 'generic-create',
    label: '通用创作',
    description: '适合先起稿，再逐步补主体、风格和用途。',
    recommendedMode: 'consumer',
    recommendedIntent: 'task',
    fieldLabels: {
      genericSubject: '主体方向',
      genericScene: '用途场景',
      genericStyle: '风格方向',
      genericConstraint: '结果边界',
    },
  },
}

const studioFlowSourceTypes = [
  'template',
  'task-preset',
  'scene-preset',
  'guided-flow',
  'result-action',
  'work-replay',
  'task-replay',
] as const

const studioFlowActionIds = [
  'start-create',
  'continue-edit',
  'guided-refine',
  'continue-version',
  'branch-version',
  'retry-version',
  'restore-controls',
] as const

export function isStudioFlowSceneId(value: string | null): value is StudioFlowSceneId {
  if (!value) return false
  return value in studioFlowSceneMetaMap
}

export function isStudioFlowSourceType(value: string | null): value is StudioFlowSourceType {
  return Boolean(value && studioFlowSourceTypes.includes(value as StudioFlowSourceType))
}

export function isStudioFlowActionId(value: string | null): value is StudioFlowActionId {
  return Boolean(value && studioFlowActionIds.includes(value as StudioFlowActionId))
}

const promptScenarioToFlowSceneMap: Record<PromptTemplateScenarioId, StudioFlowSceneId> = {
  'poster-campaign': 'poster-campaign',
  'product-shot': 'product-shot',
  'portrait-look': 'portrait-avatar',
  'space-scene': 'space-scene',
  'illustration-concept': 'illustration-concept',
  'generic-starter': 'generic-create',
}

export function mapPromptScenarioToFlowSceneId(
  scenarioId?: PromptTemplateScenarioId,
): StudioFlowSceneId {
  if (!scenarioId) return 'generic-create'
  return promptScenarioToFlowSceneMap[scenarioId] ?? 'generic-create'
}

export function getStudioFlowSceneMeta(sceneId?: StudioFlowSceneId | null) {
  if (!sceneId) return studioFlowSceneMetaMap['generic-create']
  return studioFlowSceneMetaMap[sceneId] ?? studioFlowSceneMetaMap['generic-create']
}

export function getStudioFlowScene(sceneId?: StudioFlowSceneId | null): StudioFlowScene {
  const meta = getStudioFlowSceneMeta(sceneId)
  return {
    id: meta.id,
    label: meta.label,
    description: meta.description,
    recommendedMode: meta.recommendedMode,
    recommendedIntent: meta.recommendedIntent,
  }
}

export function getStudioFlowSceneLabel(sceneId?: StudioFlowSceneId | null) {
  return getStudioFlowSceneMeta(sceneId).label
}

export function resolvePromptTemplateScene(
  scenarioId?: PromptTemplateScenarioId | null,
): StudioFlowScene {
  return getStudioFlowScene(mapPromptScenarioToFlowSceneId(scenarioId ?? undefined))
}

export function getStudioFlowSourceLabel(sourceType?: StudioFlowSourceType | null) {
  switch (sourceType) {
    case 'template':
      return '模板入口'
    case 'task-preset':
      return '任务入口'
    case 'scene-preset':
      return '场景入口'
    case 'guided-flow':
      return '轻量追问'
    case 'result-action':
      return '结果动作'
    case 'work-replay':
      return '作品回放'
    case 'task-replay':
      return '任务回放'
    default:
      return '工作台入口'
  }
}

export function getStudioFlowActionLabel(actionId?: StudioFlowActionId | null) {
  switch (actionId) {
    case 'start-create':
      return '开始创作'
    case 'continue-edit':
      return '继续修改'
    case 'guided-refine':
      return '补充追问'
    case 'continue-version':
      return '继续这一版'
    case 'branch-version':
      return '从这一版分叉'
    case 'retry-version':
      return '按当前参数重跑'
    case 'restore-controls':
      return '恢复到控制区'
    default:
      return '继续处理'
  }
}

export function getStudioFlowFieldLabel(
  sceneId: StudioFlowSceneId,
  fieldId: StudioFlowFieldId,
) {
  return getStudioFlowSceneMeta(sceneId).fieldLabels[fieldId] ?? fieldId
}
