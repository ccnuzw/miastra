export type ConsumerTaskPreset = {
  id: string
  title: string
  description: string
  icon: 'text' | 'image' | 'product' | 'poster' | 'portrait' | 'history'
  prompt?: string
  openUpload?: boolean
  action?: 'continue'
  ctaLabel?: string
  afterSelectHint?: string
}

export type ConsumerScenePreset = {
  id: string
  title: string
  description: string
  prompt: string
  afterSelectHint?: string
}

export type ConsumerGuidedFlowOption = {
  id: string
  label: string
  prompt: string
}

export type ConsumerGuidedFlowQuestion = {
  id: string
  title: string
  options: ConsumerGuidedFlowOption[]
}

export type ConsumerGuidedFlowPreset = {
  id: string
  title: string
  description: string
  prompt: string
  taskIds?: string[]
  sceneIds?: string[]
  questions: ConsumerGuidedFlowQuestion[]
}

export const consumerTaskPresets: ConsumerTaskPreset[] = [
  {
    id: 'text-to-image',
    title: '从文字生成图片',
    description: '先说一句需求，马上起一版。',
    icon: 'text',
    prompt: '做一张有明确主题和风格的图片，先给我一版可以继续修改的结果。',
    ctaLabel: '直接写需求',
    afterSelectHint: '已带入起步描述。继续补一句主体、感觉或用途，就可以直接开始。',
  },
  {
    id: 'image-to-image',
    title: '按现有图片继续修改',
    description: '上传原图，再说想保留什么、想改哪里。',
    icon: 'image',
    prompt: '请在保留主要内容的前提下，继续把这张图改得更接近我想要的效果。',
    openUpload: true,
    ctaLabel: '上传原图',
    afterSelectHint: '已带入继续修改的起步描述。上传原图后，再补一句最想改哪里就够了。',
  },
  {
    id: 'product',
    title: '做商品图',
    description: '适合白底图、展示图和上架素材。',
    icon: 'product',
    prompt: '做一张适合商品展示的图片，主体干净清楚，画面利落，适合上架或详情页使用。',
    ctaLabel: '开始做商品图',
    afterSelectHint: '已按商品图带入起步内容。继续补一句卖点、背景或用途会更准。',
  },
  {
    id: 'poster',
    title: '做海报或宣传图',
    description: '适合活动宣传、品牌展示和社媒封面。',
    icon: 'poster',
    prompt: '做一张有高级感和传播感的宣传海报，主信息突出，画面完整，适合活动或品牌展示。',
    ctaLabel: '开始做海报',
    afterSelectHint: '已按海报方向带入起步内容。继续补一句主题、活动信息或氛围即可。',
  },
  {
    id: 'portrait',
    title: '做头像或人像图',
    description: '适合头像优化、人像美化和职业照方向。',
    icon: 'portrait',
    prompt: '做一张适合头像或人像展示的图片，人物状态自然，干净耐看，适合社媒头像或职业形象。',
    ctaLabel: '开始做人像图',
    afterSelectHint: '已按人像方向带入起步内容。继续补一句风格、场景或想保留的状态即可。',
  },
  {
    id: 'continue-last',
    title: '继续上次创作',
    description: '回到你刚才做到一半的内容。',
    icon: 'history',
    action: 'continue',
    ctaLabel: '去最近结果',
  },
]

export const consumerScenePresets: ConsumerScenePreset[] = [
  {
    id: 'white-background',
    title: '商品白底图',
    description: '适合上架、展示和详情页首图',
    prompt: '生成一个干净的商品白底图，主体完整，边缘清楚，适合电商上架展示。',
    afterSelectHint: '已带入白底图方向。继续补一句商品类型或想强调的卖点会更贴近需求。',
  },
  {
    id: 'swap-background',
    title: '商品换背景',
    description: '保留主体，换成更适合的展示环境',
    prompt: '保留主体不变，把背景换成更适合展示商品的环境，整体看起来高级、自然、干净。',
    afterSelectHint: '已带入换背景方向。继续补一句想换成什么环境或氛围即可。',
  },
  {
    id: 'event-poster',
    title: '活动海报',
    description: '适合新品发布、活动宣传和品牌露出',
    prompt: '做一张活动海报，氛围明确，主视觉突出，适合线上宣传和品牌露出。',
    afterSelectHint: '已带入活动海报方向。继续补一句活动主题、主标题或想要的感觉即可。',
  },
  {
    id: 'social-cover',
    title: '社媒封面',
    description: '适合小红书、朋友圈和内容封面',
    prompt: '做一张适合社媒封面的图片，构图醒目，主题明确，适合内容平台展示。',
    afterSelectHint: '已带入封面方向。继续补一句内容主题或想突出的人物、商品即可。',
  },
  {
    id: 'portrait-retouch',
    title: '头像美化',
    description: '让头像更干净、更好看、更有风格',
    prompt: '做一张更适合头像使用的人像图，人物自然耐看，整体干净，有质感。',
    afterSelectHint: '已带入头像美化方向。继续补一句想要更职业、自然还是更有氛围即可。',
  },
  {
    id: 'remove-clutter',
    title: '去杂物或去文字',
    description: '去掉干扰内容，让画面更干净',
    prompt: '保留主体，去掉画面里的杂物和多余文字，让整体更干净。',
    afterSelectHint: '已带入清理画面的方向。继续补一句想重点保留哪部分即可。',
  },
]

export const consumerExamplePrompts = [
  '做一张高级感新品海报',
  '把这张图背景换成影棚',
  '生成一个干净的商品白底图',
]

export const consumerGuidedFlowPresets: ConsumerGuidedFlowPreset[] = [
  {
    id: 'product-shot',
    title: '商品展示图',
    description: '适合商品主图、详情页和种草展示。',
    prompt: '做一张适合商品展示的图片，主体清楚，构图利落，适合电商和内容展示。',
    taskIds: ['product'],
    sceneIds: ['white-background', 'swap-background'],
    questions: [
      {
        id: 'usage',
        title: '主要用在哪？',
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
      {
        id: 'background',
        title: '背景想要哪种方向？',
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
      {
        id: 'look',
        title: '整体更偏哪种感觉？',
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
    ],
  },
  {
    id: 'poster-campaign',
    title: '海报宣传图',
    description: '适合上新海报、活动宣传和品牌露出。',
    prompt: '做一张适合宣传传播的海报，主视觉明确，画面完整，适合线上展示。',
    taskIds: ['poster'],
    sceneIds: ['event-poster', 'social-cover'],
    questions: [
      {
        id: 'goal',
        title: '更偏什么用途？',
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
      {
        id: 'tone',
        title: '氛围更接近哪种？',
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
      {
        id: 'layout',
        title: '你最在意什么？',
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
    ],
  },
  {
    id: 'portrait-avatar',
    title: '头像与人像',
    description: '适合头像优化、职业照和生活感人像。',
    prompt: '做一张适合头像或人像展示的图片，人物自然耐看，整体干净，有质感。',
    taskIds: ['portrait'],
    sceneIds: ['portrait-retouch'],
    questions: [
      {
        id: 'purpose',
        title: '主要拿来做什么？',
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
      {
        id: 'style',
        title: '想要哪种人物感觉？',
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
      {
        id: 'retouch',
        title: '修饰程度想要多少？',
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
    ],
  },
]

export function findConsumerGuidedFlowByTaskId(taskId?: string) {
  if (!taskId) return undefined
  return consumerGuidedFlowPresets.find((item) => item.taskIds?.includes(taskId))
}

export function findConsumerGuidedFlowBySceneId(sceneId?: string) {
  if (!sceneId) return undefined
  return consumerGuidedFlowPresets.find((item) => item.sceneIds?.includes(sceneId))
}
