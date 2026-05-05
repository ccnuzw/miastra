export type StudioWorkbenchMode = 'consumer' | 'pro'

export type StudioWorkbenchModeOption = {
  value: StudioWorkbenchMode
  label: string
  description: string
}

export type StudioShellSectionViewModel = {
  eyebrow: string
  title: string
  description: string
}

export type StudioShellViewModel = {
  label: string
  title: string
  description: string
  switchHint: string
  editor: StudioShellSectionViewModel
  generation: StudioShellSectionViewModel
  works: StudioShellSectionViewModel
}

export const defaultStudioWorkbenchMode: StudioWorkbenchMode = 'consumer'

export const studioWorkbenchModeOptions: StudioWorkbenchModeOption[] = [
  {
    value: 'consumer',
    label: '简洁模式',
    description: '更适合直接开始、先试一版、继续修改',
  },
  {
    value: 'pro',
    label: '进阶模式',
    description: '控制导向，适合查看完整设置与执行细节',
  },
]

const studioShellViewModels: Record<StudioWorkbenchMode, StudioShellViewModel> = {
  consumer: {
    label: '简洁模式',
    title: '先把第一版做出来',
    description: '从一句话或一张图开始，先拿到第一版结果，再顺手继续改到更满意。',
    switchHint: '进入进阶模式后，当前输入、参考图和结果会继续保留。',
    editor: {
      eyebrow: '开始',
      title: '告诉我你想做什么图',
      description: '先说需求、再补图片和偏好，简洁模式会尽量用更少的决策帮你开工。',
    },
    generation: {
      eyebrow: '结果',
      title: '先看结果，再继续改',
      description: '结果出来后可以直接基于这一版继续改，不需要重新从头填写。',
    },
    works: {
      eyebrow: '历史',
      title: '最近结果与继续创作',
      description: '做过的图会留在这里，方便你继续做、再试一版或回看刚才的结果。',
    },
  },
  pro: {
    label: '进阶模式',
    title: '查看更多控制与复用',
    description: 'Prompt、参数、接入配置和作品复用都保留在同一工作台里，便于精细控制和重跑。',
    switchHint: '返回简洁模式时不会重置当前任务、参考图和结果。',
    editor: {
      eyebrow: '控制',
      title: '完整输入与参数',
      description:
        '现有 Prompt、参数、高级设置、风格和抽卡面板继续保留，后续专业控件直接接入这一列。',
    },
    generation: {
      eyebrow: '执行',
      title: '生成状态与响应',
      description: '保留当前预览、进度、取消和响应面板，后续专业结果细节会叠加在这一列。',
    },
    works: {
      eyebrow: '资产',
      title: '作品、批次与复用',
      description: '保留筛选、批量导出、参数回放和参考图回推，后续专业资产操作会接在这里。',
    },
  },
}

export function isStudioWorkbenchMode(value: string): value is StudioWorkbenchMode {
  return value === 'consumer' || value === 'pro'
}

export function getStudioShellViewModel(mode: StudioWorkbenchMode) {
  return studioShellViewModels[mode]
}
