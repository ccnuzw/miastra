import type {
  PromptTemplateFamilyId,
  PromptTemplateFieldDefinition,
  PromptTemplateGuidedFieldConfig,
  PromptTemplateListItem,
  PromptTemplateScenarioId,
  PromptTemplateScenarioGuidedFlowConfig,
  PromptTemplateStructureDefaultSettings,
  PromptTemplateStructureMeta,
  PromptTemplateWorkbenchEntryIntent,
  PromptTemplateWorkbenchEntryMode,
} from './promptTemplate.types'
import { resolvePromptTemplateScene } from './studioFlowSemantic'
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
  guidedFlow?: PromptTemplateScenarioGuidedFlowConfig
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
        guided: {
          semanticFieldId: 'campaignGoal',
          questionTitle: '更偏什么用途？',
          defaultOptionId: 'event',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'launch',
              label: '新品上新',
              prompt: '突出新品上新感，画面更有新鲜度和吸引力。',
            },
            {
              id: 'event',
              label: '活动宣传',
              prompt: '突出活动氛围和传播感，适合引导点击或报名。',
            },
            {
              id: 'brand',
              label: '品牌展示',
              prompt: '更偏品牌展示，画面克制但有记忆点。',
            },
          ],
        },
      }),
      createField({
        id: 'value',
        label: '核心卖点',
        description: '写明最想被看见的利益点或产品亮点。',
        group: 'context',
        input: 'textarea',
        required: true,
        examples: ['限时折扣', '高级质感', '新品上市'],
        guided: {
          semanticFieldId: 'visualTone',
          questionTitle: '氛围更接近哪种？',
          defaultOptionId: 'minimal',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'minimal',
              label: '高级极简',
              prompt: '整体更高级极简，减少杂乱元素和堆砌。',
            },
            {
              id: 'energetic',
              label: '热闹吸睛',
              prompt: '整体更热闹吸睛，视觉冲击更强一些。',
            },
            {
              id: 'social',
              label: '年轻社媒感',
              prompt: '整体更年轻，更适合社媒传播和封面展示。',
            },
          ],
        },
      }),
      createField({
        id: 'visual-style',
        label: '画面风格',
        description: '定义调性、色彩和主视觉感觉。',
        group: 'style',
        input: 'text',
        examples: ['高级极简', '亮眼节庆', '品牌感'],
        guided: {
          semanticFieldId: 'layoutFocus',
          questionTitle: '你最在意什么？',
          defaultOptionId: 'visual',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'visual',
              label: '主视觉突出',
              prompt: '优先保证主视觉突出，第一眼就能抓住重点。',
            },
            {
              id: 'copy-space',
              label: '留出文字位',
              prompt: '为标题和卖点留出清晰文字区域，排版更好放信息。',
            },
            {
              id: 'brand-mark',
              label: '品牌露出',
              prompt: '让品牌露出更自然明确，但不要压过主画面。',
            },
          ],
        },
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
    guidedFlow: {
      defaultPromptText: '做一张适合宣传传播的海报，主视觉明确，画面完整，适合线上展示。',
      taskBindings: [
        {
          id: 'poster',
          mode: 'default',
        },
      ],
      sceneBindings: [
        {
          id: 'event-poster',
          mode: 'default',
        },
        {
          id: 'social-cover',
          mode: 'recommended',
          selections: {
            headline: 'event',
            value: 'social',
            'visual-style': 'visual',
          },
        },
      ],
    },
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
        guided: {
          semanticFieldId: 'usageScenario',
          questionTitle: '主要用在哪？',
          defaultOptionId: 'listing',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'listing',
              label: '电商主图',
              prompt: '优先满足电商主图使用，主体完整醒目，信息清楚。',
            },
            {
              id: 'detail',
              label: '详情页展示',
              prompt: '更适合详情页展示，保留材质和细节层次。',
            },
            {
              id: 'social',
              label: '种草配图',
              prompt: '更适合社媒种草展示，画面更有氛围和吸引力。',
            },
          ],
        },
      }),
      createField({
        id: 'usage-scene',
        label: '使用场景',
        description: '说明用于主图、详情页还是社媒种草。',
        group: 'context',
        input: 'single-select',
        required: true,
        examples: ['电商主图', '详情页', '社媒展示'],
        guided: {
          semanticFieldId: 'backgroundStyle',
          questionTitle: '背景想要哪种方向？',
          defaultOptionId: 'pure-white',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'pure-white',
              label: '纯白干净',
              prompt: '背景尽量纯白干净，边缘清楚，适合直接上架。',
            },
            {
              id: 'studio',
              label: '影棚质感',
              prompt: '背景做成简洁影棚感，光线自然，质感高级。',
            },
            {
              id: 'lifestyle',
              label: '生活场景',
              prompt: '背景换成贴合商品的生活化场景，但不要抢主体。',
            },
          ],
        },
      }),
      createField({
        id: 'background-direction',
        label: '背景方向',
        description: '说明白底、影棚或生活化场景。',
        group: 'style',
        input: 'single-select',
        examples: ['纯白背景', '影棚布光', '生活场景'],
        guided: {
          semanticFieldId: 'visualTone',
          questionTitle: '整体更偏哪种感觉？',
          defaultOptionId: 'clean',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'clean',
              label: '标准清爽',
              prompt: '整体更标准清爽，少一些夸张效果。',
            },
            {
              id: 'premium',
              label: '高级质感',
              prompt: '整体更有高级感，强化材质和灯光质感。',
            },
            {
              id: 'bright',
              label: '更亮眼',
              prompt: '整体更亮眼一些，但不要显得廉价。',
            },
          ],
        },
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
    guidedFlow: {
      defaultPromptText: '做一张适合商品展示的图片，主体清楚，构图利落，适合电商和内容展示。',
      taskBindings: [
        {
          id: 'product',
          mode: 'default',
        },
      ],
      sceneBindings: [
        {
          id: 'white-background',
          mode: 'default',
        },
        {
          id: 'swap-background',
          mode: 'recommended',
          selections: {
            'product-subject': 'detail',
            'usage-scene': 'lifestyle',
            'background-direction': 'premium',
          },
        },
      ],
      resultActionBindings: [
        {
          id: 'background',
          mode: 'recommended',
          selections: {
            'product-subject': 'detail',
            'usage-scene': 'lifestyle',
            'background-direction': 'premium',
          },
          semanticActionId: 'branch-version',
        },
      ],
    },
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
        guided: {
          semanticFieldId: 'portraitPurpose',
          questionTitle: '主要拿来做什么？',
          defaultOptionId: 'avatar',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'avatar',
              label: '社媒头像',
              prompt: '更适合社媒头像使用，人物干净亲近，缩略图里也清楚。',
            },
            {
              id: 'profile',
              label: '职业形象',
              prompt: '更适合职业形象展示，气质稳重、可信、利落。',
            },
            {
              id: 'lifestyle',
              label: '生活写真',
              prompt: '更偏生活感写真，人物自然放松，有轻松氛围。',
            },
          ],
        },
      }),
      createField({
        id: 'wardrobe',
        label: '服装特征',
        description: '说明服装、发型、妆面或配饰重点。',
        group: 'context',
        input: 'text',
        examples: ['西装职业感', '复古连衣裙', '未来风护甲'],
        guided: {
          semanticFieldId: 'portraitStyle',
          questionTitle: '想要哪种人物感觉？',
          defaultOptionId: 'natural',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'natural',
              label: '自然耐看',
              prompt: '人物状态自然耐看，不要过度修饰。',
            },
            {
              id: 'premium',
              label: '精致高级',
              prompt: '人物更精致高级，肤质和光线更有质感。',
            },
            {
              id: 'warm',
              label: '轻松亲切',
              prompt: '人物更轻松亲切，表情和氛围更有亲和力。',
            },
          ],
        },
      }),
      createField({
        id: 'mood-pose',
        label: '姿态情绪',
        description: '说明表情、动作或想传达的状态。',
        group: 'style',
        input: 'text',
        examples: ['自然微笑', '冷静克制', '动态回头'],
        guided: {
          semanticFieldId: 'retouchLevel',
          questionTitle: '修饰程度想要多少？',
          defaultOptionId: 'balanced',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'light',
              label: '少修一点',
              prompt: '保留真实感，只做轻微优化和整理。',
            },
            {
              id: 'balanced',
              label: '标准优化',
              prompt: '做标准优化，让五官、肤质和光线都更上镜。',
            },
            {
              id: 'camera-ready',
              label: '更上镜',
              prompt: '更上镜一些，但避免过度磨皮和失真。',
            },
          ],
        },
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
    guidedFlow: {
      defaultPromptText: '做一张适合头像或人像展示的图片，人物自然耐看，整体干净，有质感。',
      taskBindings: [
        {
          id: 'portrait',
          mode: 'default',
        },
      ],
      sceneBindings: [
        {
          id: 'portrait-retouch',
          mode: 'recommended',
          selections: {
            'character-subject': 'avatar',
            wardrobe: 'natural',
            'mood-pose': 'balanced',
          },
        },
      ],
    },
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
        guided: {
          semanticFieldId: 'spacePurpose',
          questionTitle: '这个空间主要用来做什么？',
          defaultOptionId: 'living',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'living',
              label: '日常生活',
              prompt: '空间更偏日常生活场景，舒适自然，容易代入。',
            },
            {
              id: 'retail',
              label: '商业展示',
              prompt: '空间更偏商业展示用途，信息清楚，陈列更利落。',
            },
            {
              id: 'event',
              label: '活动搭建',
              prompt: '空间更偏活动搭建和露出，整体更有氛围感和传播感。',
            },
          ],
        },
      }),
      createField({
        id: 'viewpoint',
        label: '主视角',
        description: '说明俯视、平视或近景展示方式。',
        group: 'context',
        input: 'text',
        required: true,
        examples: ['平视全景', '入口视角', '局部特写'],
        guided: {
          semanticFieldId: 'spaceViewpoint',
          questionTitle: '想从什么角度看这个空间？',
          defaultOptionId: 'wide',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'wide',
              label: '整体全景',
              prompt: '优先展示空间整体关系，构图完整，视线清楚。',
            },
            {
              id: 'entry',
              label: '入口视角',
              prompt: '从进入空间的第一视角展开，强调动线和第一印象。',
            },
            {
              id: 'detail',
              label: '局部亮点',
              prompt: '更突出空间局部亮点和材质细节，但仍保持整体协调。',
            },
          ],
        },
      }),
      createField({
        id: 'lighting',
        label: '氛围光线',
        description: '说明暖光、冷调或自然采光方向。',
        group: 'style',
        input: 'text',
        examples: ['自然采光', '夜景氛围', '暖色灯光'],
        guided: {
          semanticFieldId: 'spaceMood',
          questionTitle: '整体氛围更偏哪种？',
          defaultOptionId: 'natural',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'natural',
              label: '自然通透',
              prompt: '空间光线更自然通透，整体清爽、真实。',
            },
            {
              id: 'warm',
              label: '温暖高级',
              prompt: '空间更温暖高级，灯光层次更明显，但不要压暗。',
            },
            {
              id: 'dramatic',
              label: '戏剧氛围',
              prompt: '空间更有戏剧氛围和情绪感，光影对比更明显。',
            },
          ],
        },
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
    guidedFlow: {
      defaultPromptText: '做一个可直接展示的空间场景，结构清楚，氛围完整，适合继续细化。',
      sceneBindings: [
        {
          id: 'space-showcase',
          mode: 'default',
        },
      ],
    },
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
        guided: {
          semanticFieldId: 'storySubject',
          questionTitle: '这轮更偏哪种创作目标？',
          defaultOptionId: 'concept',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'concept',
              label: '概念起稿',
              prompt: '先把概念方向建立清楚，主体关系明确，方便继续派生。',
            },
            {
              id: 'cover',
              label: '封面主视觉',
              prompt: '更偏封面主视觉，主体集中，第一眼更有冲击力。',
            },
            {
              id: 'story',
              label: '故事画面',
              prompt: '更偏故事画面，保留叙事关系和场景信息。',
            },
          ],
        },
      }),
      createField({
        id: 'world-scene',
        label: '场景描述',
        description: '说明世界观、地点和叙事背景。',
        group: 'context',
        input: 'textarea',
        required: true,
        examples: ['赛博城市', '海底遗迹', '童话王国'],
        guided: {
          semanticFieldId: 'storyWorld',
          questionTitle: '场景关系更偏哪种？',
          defaultOptionId: 'single-scene',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'single-scene',
              label: '单场景聚焦',
              prompt: '优先聚焦一个核心场景，减少信息分散。',
            },
            {
              id: 'world-building',
              label: '世界观展开',
              prompt: '强调世界观展开，让场景层次和背景信息更完整。',
            },
            {
              id: 'character-relation',
              label: '主体关系',
              prompt: '让角色或主体之间的关系更明确，叙事性更强。',
            },
          ],
        },
      }),
      createField({
        id: 'art-style',
        label: '风格流派',
        description: '说明插画风格、媒介或表现手法。',
        group: 'style',
        input: 'text',
        examples: ['厚涂', '日系动画', '水彩感'],
        guided: {
          semanticFieldId: 'storyStyle',
          questionTitle: '更想先锁哪种表现方式？',
          defaultOptionId: 'painterly',
          recommendedOptionId: 'cinematic',
          recommendedStrategy: 'configured',
          options: [
            {
              id: 'painterly',
              label: '厚涂质感',
              prompt: '画面更偏厚涂质感，细节丰富，笔触明显。',
            },
            {
              id: 'cinematic',
              label: '电影概念感',
              prompt: '画面更偏电影概念感，镜头氛围和光影关系更强。',
            },
            {
              id: 'graphic',
              label: '平面海报感',
              prompt: '画面更偏平面海报感，轮廓明确，识别度更高。',
            },
          ],
        },
      }),
      createField({
        id: 'color-tone',
        label: '色彩基调',
        description: '说明冷暖倾向、主色和情绪氛围。',
        group: 'output',
        input: 'text',
        examples: ['低饱和冷调', '高对比霓虹', '梦幻粉紫'],
        guided: {
          semanticFieldId: 'colorMood',
          questionTitle: '色彩更偏哪种氛围？',
          defaultOptionId: 'cool',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'cool',
              label: '冷调克制',
              prompt: '色彩更偏冷调克制，整体更有概念感和留白感。',
            },
            {
              id: 'neon',
              label: '高对比霓虹',
              prompt: '色彩更偏高对比霓虹，情绪更强，视觉冲击更明显。',
            },
            {
              id: 'warm',
              label: '暖色叙事',
              prompt: '色彩更偏暖色叙事，氛围更柔和，更有故事温度。',
            },
          ],
        },
      }),
    ],
    guidedFlow: {
      defaultPromptText: '先做一版可以继续推演的插画概念图，主体、场景和色彩方向先清楚下来。',
    },
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
        guided: {
          semanticFieldId: 'genericSubject',
          questionTitle: '现在最先想做哪类图？',
          defaultStrategy: 'first-option',
          recommendedOptionId: 'visual',
          recommendedStrategy: 'configured',
          options: [
            {
              id: 'visual',
              label: '先出主视觉',
              prompt: '先把主视觉主体立起来，保证第一版方向清楚。',
            },
            {
              id: 'portrait',
              label: '先出人物',
              prompt: '更偏先把人物状态和镜头关系做出来。',
            },
            {
              id: 'product',
              label: '先出商品',
              prompt: '更偏先把商品主体和展示完整度做出来。',
            },
          ],
        },
      }),
      createField({
        id: 'scene',
        label: '场景范围',
        description: '说明发生在什么环境、用途或展示位置。',
        group: 'context',
        input: 'text',
        examples: ['宣传海报', '商品详情页', '角色设定'],
        guided: {
          semanticFieldId: 'genericScene',
          questionTitle: '这张图主要用在哪里？',
          defaultOptionId: 'social',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'social',
              label: '内容封面',
              prompt: '更偏内容封面或社媒展示，主体识别度优先。',
            },
            {
              id: 'listing',
              label: '商品展示',
              prompt: '更偏商品展示或详情页使用，画面信息更清楚。',
            },
            {
              id: 'concept',
              label: '概念提案',
              prompt: '更偏概念提案或方向探索，允许保留一定实验感。',
            },
          ],
        },
      }),
      createField({
        id: 'style',
        label: '风格方向',
        description: '说明写实、插画、高级感或其他风格倾向。',
        group: 'style',
        input: 'text',
        examples: ['写实', '高级极简', '概念插画'],
        guided: {
          semanticFieldId: 'genericStyle',
          questionTitle: '整体更想走哪种方向？',
          defaultOptionId: 'realistic',
          recommendedOptionId: 'stylized',
          recommendedStrategy: 'configured',
          options: [
            {
              id: 'realistic',
              label: '真实稳妥',
              prompt: '整体更真实稳妥，先保证信息和主体成立。',
            },
            {
              id: 'stylized',
              label: '更有风格',
              prompt: '整体更有风格识别度，但不要失去主体清晰度。',
            },
            {
              id: 'minimal',
              label: '干净克制',
              prompt: '整体更干净克制，减少杂乱元素和无效信息。',
            },
          ],
        },
      }),
      createField({
        id: 'constraints',
        label: '补充限制',
        description: '说明不希望出现的元素或结果边界。',
        group: 'output',
        input: 'textarea',
        examples: ['不要太花', '主体完整', '避免文字遮挡'],
        guided: {
          semanticFieldId: 'genericConstraint',
          questionTitle: '这一轮最需要避免什么？',
          defaultOptionId: 'stable',
          recommendedStrategy: 'same-as-default',
          options: [
            {
              id: 'stable',
              label: '先求稳定',
              prompt: '先保证主体稳定、结构清楚，不要过度发散。',
            },
            {
              id: 'local',
              label: '少动主体',
              prompt: '尽量少改主体，主要调整风格、背景或局部信息。',
            },
            {
              id: 'clean',
              label: '避免杂乱',
              prompt: '避免画面杂乱和信息堆叠，让重点更集中。',
            },
          ],
        },
      }),
    ],
    guidedFlow: {
      defaultPromptText: '先做一张方向清楚、后续还方便继续改的图片，主体和用途先说清楚就行。',
      taskBindings: [
        {
          id: 'text-to-image',
          mode: 'default',
        },
      ],
      sceneBindings: [
        {
          id: 'generic-create',
          mode: 'default',
        },
      ],
      resultActionBindings: [
        {
          id: 'closer',
          mode: 'default',
        },
        {
          id: 'style',
          mode: 'recommended',
          selections: {
            style: 'stylized',
          },
          semanticActionId: 'branch-version',
        },
        {
          id: 'partial',
          mode: 'recommended',
          selections: {
            constraints: 'local',
          },
          semanticActionId: 'continue-version',
        },
        {
          id: 'retry',
          mode: 'recommended',
          selections: {
            constraints: 'stable',
          },
          semanticActionId: 'retry-version',
        },
      ],
    },
  },
]

function buildPromptTemplateSourceText(template: PromptTemplateListItem) {
  return `${template.title ?? ''} ${template.content ?? ''} ${template.category ?? ''} ${normalizePromptTemplateTags(template.tags).join(' ')}`.toLowerCase()
}

function countKeywordMatches(sourceText: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => total + (sourceText.includes(keyword) ? 1 : 0), 0)
}

function resolvePromptTemplateGuidedFieldOptionId(
  guided: PromptTemplateGuidedFieldConfig,
  kind: 'default' | 'recommended',
): string | undefined {
  if (!guided.options.length) return undefined

  if (kind === 'default') {
    const defaultStrategy = guided.defaultStrategy ?? 'configured'
    if (defaultStrategy === 'first-option') return guided.options[0]?.id
    return guided.defaultOptionId ?? guided.options[0]?.id
  }

  const recommendedStrategy =
    guided.recommendedStrategy ?? (guided.recommendedOptionId ? 'configured' : 'same-as-default')

  if (recommendedStrategy === 'first-option') return guided.options[0]?.id
  if (recommendedStrategy === 'same-as-default') {
    return resolvePromptTemplateGuidedFieldOptionId(guided, 'default')
  }
  return guided.recommendedOptionId ?? resolvePromptTemplateGuidedFieldOptionId(guided, 'default')
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

export function resolvePromptTemplateGuidedFieldDefaultOptionId(
  field: Pick<PromptTemplateFieldDefinition, 'guided'>,
) {
  if (!field.guided) return undefined
  return resolvePromptTemplateGuidedFieldOptionId(field.guided, 'default')
}

export function resolvePromptTemplateGuidedFieldRecommendedOptionId(
  field: Pick<PromptTemplateFieldDefinition, 'guided'>,
) {
  if (!field.guided) return undefined
  return resolvePromptTemplateGuidedFieldOptionId(field.guided, 'recommended')
}

export function getPromptTemplateStructure(template: PromptTemplateListItem) {
  return template.structure ?? buildPromptTemplateStructure(template)
}

export function buildPromptTemplateStructure(template: PromptTemplateListItem): PromptTemplateStructureMeta {
  const sourceText = buildPromptTemplateSourceText(template)
  const scenarioConfig = resolveScenarioConfig(template, sourceText)
  const resolvedScene = resolvePromptTemplateScene(scenarioConfig.id)
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
    scene: template.structure?.scene
      ? {
          ...resolvedScene,
          ...template.structure.scene,
          id: template.structure.scene.id ?? resolvedScene.id,
        }
      : {
          ...resolvedScene,
          label: template.structure?.scenarioLabel?.trim() || resolvedScene.label,
          description: template.structure?.sceneDescription?.trim() || resolvedScene.description,
        },
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
