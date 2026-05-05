# 图像 Skill 平台 V1 · 第二阶段多 Agent 任务说明书

## 文档说明

- 文档目标：把第二阶段 backlog 继续拆成可直接分发给多会话 / 多 Agent 的任务说明书。
- 文档定位：承接 [image-skill-platform-phase2-backlog-v1.md](./image-skill-platform-phase2-backlog-v1.md) 的执行分发文档。
- 当前状态：第二阶段多 Agent 执行说明文档。
- 更新时间：2026-05-05。

## 1. 使用方式

这份文档和第一阶段的使用方式保持一致，但目标不同。

第二阶段不再围绕“搭双模式骨架”展开，而是围绕“继续收口体验和能力链”展开。

推荐使用方式：

1. 继续以当前总分支 `feature/image-skill-platform-v1` 作为集成分支
2. 每个 Agent 从总分支切自己的第二阶段子分支
3. 每个 Agent 严格按自己的负责范围改动
4. 每个 Agent 完成后先自检，再合回总分支
5. 总分支统一做第二阶段集成验证

## 2. 第二阶段分工原则

- 先收口普通版体验，再加强专业版控制
- 模板和轻量追问要接主流程，不做孤立功能页
- 按文件边界拆，不按概念空拆
- 继续避免多个 Agent 同时改同一个高冲突文件
- 第二阶段要特别控制范围，不做横向扩张

## 3. Agent 总览

| Agent | 任务名称 | 核心目标 | 优先级 | 是否阻塞别人 |
|---|---|---|---|---|
| Agent A2 | 普通版输入体验增强 | 让普通版更轻、更顺、更像助手 | P0 | 部分 |
| Agent B2 | 普通版结果动作与衔接增强 | 让普通版结果后的继续修改更自然 | P0 | 部分 |
| Agent C2 | 专业版控制链增强 | 让专业版更完整、更可追溯、更可复用 | P0 | 否 |
| Agent D2 | 模板系统升级 | 让模板更像模板库入口，而不是纯 Prompt 存档 | P1 | 否 |
| Agent E2 | 轻量追问与版本表达增强 | 让高频场景更少想一步，让版本来源更清楚 | P1 | 部分 |

## 4. Agent A2：普通版输入体验增强

### 4.1 任务目标

继续减轻普通版输入负担，让普通版更像智能做图助手，而不是简化控制台。

### 4.2 负责范围

- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- 允许接触：
  - `src/features/studio/PromptComposer.tsx`
  - `src/features/studio/ParameterPanel.tsx`
  - `src/pages/app/StudioPage.tsx`

### 4.3 允许目标

- 压缩普通版输入层复杂度
- 清理残余专业术语
- 强化任务入口与输入区关系
- 强化生成前提示和空态
- 优化普通版输入区视觉优先级

### 4.4 不要做的事

- 不要重构专业版控制区
- 不要深改作品回流或任务回流
- 不要顺手扩写模板页
- 不要引入复杂聊天式追问

### 4.5 交付标准

- 普通版输入区更聚焦任务语言
- 用户更容易从任务入口进入实际输入
- 专业术语进一步减少
- 整体看起来更像“助手式输入流”

### 4.6 自测清单

- 打开普通版工作台
- 点击任务入口进入输入
- 检查输入区和提示语是否更轻
- 确认没有明显新增专业术语

### 4.7 建议子分支名

- `feature/phase2-consumer-input-polish`

## 5. Agent B2：普通版结果动作与衔接增强

### 5.1 任务目标

让普通版结果页的“继续改”真正顺手，减少用户下一步犹豫。

### 5.2 负责范围

- `src/features/studio-consumer/ConsumerResultActions.tsx`
- `src/features/generation/PreviewStage.tsx`
- `src/features/generation/ResponsePanel.tsx`
- `src/pages/app/StudioPage.tsx`

### 5.3 允许目标

- 优化结果动作区文案和层级
- 优化动作触发后的状态反馈
- 让结果动作更明确绑定当前结果来源
- 优化动作后的输入恢复与焦点引导

### 5.4 不要做的事

- 不要重构普通版主输入区整体结构
- 不要改专业版控制区
- 不要深改模板页
- 不要改 Provider 配置页

### 5.5 交付标准

- 用户能更自然地从结果进入下一轮创作
- 动作反馈更明确
- 继续改比重新开始更顺

### 5.6 自测清单

- 完成一次生成
- 逐个点普通版结果动作
- 确认动作后状态和焦点恢复更自然
- 确认不需要重新回到复杂输入起点

### 5.7 建议子分支名

- `feature/phase2-consumer-result-flow`

## 6. Agent C2：专业版控制链增强

### 6.1 任务目标

把当前专业版从“最小控制视图”推进到“更完整的创作控制台”。

### 6.2 负责范围

- `src/features/studio-pro/*`
- 允许接触：
  - `src/features/studio/AdvancedSettingsPanel.tsx`
  - `src/features/studio/PromptComposer.tsx`
  - `src/features/studio/ParameterPanel.tsx`
  - `src/features/provider/useProviderConfig.ts`
  - `src/pages/app/StudioPage.tsx`

### 6.3 允许目标

- 增强参数快照区
- 增强 Prompt 预览与复制链
- 增强 Provider / model / 执行信息表达
- 优化专业版结果回到参数控制的链路
- 强化专业版控制区信息分组

### 6.4 不要做的事

- 不要回头污染普通版输入区
- 不要深改作品页和任务页主结构
- 不要开始做完整调试台

### 6.5 交付标准

- 专业版可见性更强
- Prompt、参数、Provider 信息更系统
- 结果回到重跑与复用更顺

### 6.6 自测清单

- 打开专业版工作台
- 查看 Prompt、参数和 Provider 区
- 从结果回到控制区继续调整
- 切回普通版后不应出现这些增强块

### 6.7 建议子分支名

- `feature/phase2-pro-control-chain`

## 7. Agent D2：模板系统升级

### 7.1 任务目标

让模板页从 Prompt 存档页更进一步，成为真正更像模板库的前台页面。

### 7.2 负责范围

- `src/pages/app/TemplatesPage.tsx`
- `src/features/prompt-templates/*`
- 允许接触：
  - `src/pages/app/StudioPage.tsx`

### 7.3 允许目标

- 强化模板分类表达
- 增加模板适用说明与推荐入口
- 打通模板到普通版任务入口
- 打通模板到专业版控制面板
- 预留结构模板元信息展示位

### 7.4 不要做的事

- 不要重构工作台主骨架
- 不要深改普通版和专业版输入逻辑
- 不要开始做模板后台 CMS

### 7.5 交付标准

- 模板更像模板库，不只是内容列表
- 模板和工作台关系更明确
- 为后续结构模板升级留出位置

### 7.6 自测清单

- 打开模板页
- 检查模板分类、说明和入口表达
- 验证模板到工作台的衔接是否更清楚

### 7.7 建议子分支名

- `feature/phase2-template-upgrade`

## 8. Agent E2：轻量追问与版本表达增强

### 8.1 任务目标

为 2 到 3 个高频场景接入轻量追问，并让版本来源更容易理解。

### 8.2 负责范围

- `src/features/studio-consumer/*`
- `src/features/studio-home/*`
- `src/features/works/workReplay.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`

### 8.3 允许目标

- 定义首批高频场景
- 设计轻量按钮式追问
- 接入普通版输入流程
- 增强结果来源与继续这一版的表达
- 增强作品和任务中的版本来源提示

### 8.4 不要做的事

- 不要做复杂聊天机器人
- 不要做复杂版本图谱
- 不要重构专业版控制链

### 8.5 交付标准

- 至少 2 到 3 个场景有轻量追问
- 用户更容易理解“这是从哪一版来的”
- 继续创作路径更清晰

### 8.6 自测清单

- 进入普通版高频场景
- 检查轻量追问是否能触发
- 检查作品和任务中的来源表达是否更清楚

### 8.7 建议子分支名

- `feature/phase2-guided-flow-and-versions`

## 9. 第二阶段合并顺序

建议合并顺序：

1. Agent A2
2. Agent B2
3. Agent C2
4. Agent D2
5. Agent E2

原因：

- 先继续收口普通版输入
- 再收口普通版结果动作
- 再增强专业版控制链
- 模板升级和轻量追问放在体验骨架更稳后接入

## 10. 高冲突文件提醒

以下文件仍然是第二阶段高冲突区，原则上同一时间只允许一个 Agent 主改：

- `src/pages/app/StudioPage.tsx`
- `src/features/studio/PromptComposer.tsx`
- `src/features/studio/ParameterPanel.tsx`
- `src/pages/app/TemplatesPage.tsx`
- `src/pages/app/TasksPage.tsx`

## 11. 第二阶段集成验收清单

总分支每次合并后，至少检查：

- 普通版工作台是否更轻、更顺
- 专业版控制区是否更完整
- 模板页是否更像模板库
- 轻量追问是否不打断主流程
- 作品和任务的来源表达是否更清楚

并继续跑：

- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

## 12. 这份文档的作用

它和第一阶段的 Agent 说明书作用完全一致：

- 帮你把第二阶段并行开发边界写清楚
- 帮你减少多 Agent 互相踩文件的风险
- 帮你在集成时知道先合谁、后合谁

下一步如果继续按同样方式推进，最自然的动作就是：

- 再生成第二阶段可复制任务提示词
