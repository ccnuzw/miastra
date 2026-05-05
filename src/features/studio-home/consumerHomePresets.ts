export type ConsumerTaskPreset = {
  id: string
  title: string
  description: string
  icon: 'text' | 'image' | 'product' | 'poster' | 'portrait' | 'history'
  prompt?: string
  openUpload?: boolean
  action?: 'continue'
}

export type ConsumerScenePreset = {
  id: string
  title: string
  description: string
  prompt: string
}

export const consumerTaskPresets: ConsumerTaskPreset[] = [
  {
    id: 'text-to-image',
    title: '从文字生成图片',
    description: '从一句话开始，先出第一版。',
    icon: 'text',
    prompt: '做一张有明确主题和风格的图片，先给我一版可以继续修改的结果。',
  },
  {
    id: 'image-to-image',
    title: '按现有图片继续修改',
    description: '上传一张图，继续改得更接近你想要的效果。',
    icon: 'image',
    prompt: '请在保留主要内容的前提下，继续把这张图改得更接近我想要的效果。',
    openUpload: true,
  },
  {
    id: 'product',
    title: '做商品图',
    description: '更适合白底图、展示图和上架素材。',
    icon: 'product',
    prompt: '做一张适合商品展示的图片，主体干净清楚，画面利落，适合上架或详情页使用。',
  },
  {
    id: 'poster',
    title: '做海报或宣传图',
    description: '适合活动宣传、品牌展示和社媒封面。',
    icon: 'poster',
    prompt: '做一张有高级感和传播感的宣传海报，主信息突出，画面完整，适合活动或品牌展示。',
  },
  {
    id: 'portrait',
    title: '做头像或人像图',
    description: '适合头像优化、人像美化和职业照方向。',
    icon: 'portrait',
    prompt: '做一张适合头像或人像展示的图片，人物状态自然，干净耐看，适合社媒头像或职业形象。',
  },
  {
    id: 'continue-last',
    title: '继续上次创作',
    description: '回到你刚才做到一半的内容。',
    icon: 'history',
    action: 'continue',
  },
]

export const consumerScenePresets: ConsumerScenePreset[] = [
  {
    id: 'white-background',
    title: '商品白底图',
    description: '适合上架、展示和详情页首图',
    prompt: '生成一个干净的商品白底图，主体完整，边缘清楚，适合电商上架展示。',
  },
  {
    id: 'swap-background',
    title: '商品换背景',
    description: '保留主体，换成更适合的展示环境',
    prompt: '保留主体不变，把背景换成更适合展示商品的环境，整体看起来高级、自然、干净。',
  },
  {
    id: 'event-poster',
    title: '活动海报',
    description: '适合新品发布、活动宣传和品牌露出',
    prompt: '做一张活动海报，氛围明确，主视觉突出，适合线上宣传和品牌露出。',
  },
  {
    id: 'social-cover',
    title: '社媒封面',
    description: '适合小红书、朋友圈和内容封面',
    prompt: '做一张适合社媒封面的图片，构图醒目，主题明确，适合内容平台展示。',
  },
  {
    id: 'portrait-retouch',
    title: '头像美化',
    description: '让头像更干净、更好看、更有风格',
    prompt: '做一张更适合头像使用的人像图，人物自然耐看，整体干净，有质感。',
  },
  {
    id: 'remove-clutter',
    title: '去杂物或去文字',
    description: '去掉干扰内容，让画面更干净',
    prompt: '保留主体，去掉画面里的杂物和多余文字，让整体更干净。',
  },
]

export const consumerExamplePrompts = [
  '做一张高级感新品海报',
  '把这张图背景换成影棚',
  '生成一个干净的商品白底图',
]
