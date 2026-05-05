# 图像 Skill 平台 V1 · 第二阶段多 Agent 可复制任务提示词

## 文档说明

- 文档目标：提供可直接复制发送给第二阶段多会话 / 多 Agent 的单独任务提示词。
- 文档定位：承接 [image-skill-platform-phase2-agent-briefs-v1.md](./image-skill-platform-phase2-agent-briefs-v1.md) 的实操提示词文档。
- 当前状态：第二阶段可执行提示词文档。
- 更新时间：2026-05-05。

## 1. 使用说明

使用方式延续第一阶段：

1. 先确保当前总分支仍是 `feature/image-skill-platform-v1`
2. 为每个 Agent 从总分支切对应第二阶段子分支
3. 把下面对应 Agent 的整段提示词直接复制发送
4. 要求每个 Agent 只改自己负责的文件范围
5. 每个 Agent 完成后先汇报改动文件、自测结果和剩余风险

统一要求：

- 你不是独自在仓库里工作
- 不要回滚别人改动
- 只在自己负责范围内改动
- 如果发现主骨架已有变化，要适配现状，不要强行覆盖
- 完成后必须说明改了哪些文件、做了哪些自测、还有什么风险

## 2. Agent A2 提示词

```text
你现在负责 Miastra 第二阶段开发里的 Agent A2：普通版输入体验增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase2-consumer-input-polish

任务目标：
继续减轻普通版输入负担，让普通版更像智能做图助手，而不是简化控制台。

你负责的文件范围：
- src/features/studio-home/*
- src/features/studio-consumer/*
- 允许接触：
  - src/features/studio/PromptComposer.tsx
  - src/features/studio/ParameterPanel.tsx
  - src/pages/app/StudioPage.tsx

你的核心任务：
1. 压缩普通版输入层复杂度
2. 清理残余专业术语
3. 强化任务入口与输入区关系
4. 强化生成前提示和空态
5. 优化普通版输入区视觉优先级

明确不要做的事：
- 不要重构专业版控制区
- 不要深改作品回流或任务回流
- 不要顺手扩写模板页
- 不要引入复杂聊天式追问

交付标准：
- 普通版输入区更聚焦任务语言
- 用户更容易从任务入口进入实际输入
- 专业术语进一步减少
- 整体更像助手式输入流

自测清单：
- 打开普通版工作台
- 点击任务入口进入输入
- 检查输入区和提示语是否更轻
- 确认没有明显新增专业术语

参考文档：
- docs/image-skill-platform-phase1-review-v1.md
- docs/image-skill-platform-phase2-scope-v1.md
- docs/image-skill-platform-phase2-backlog-v1.md
- docs/image-skill-platform-phase2-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 3. Agent B2 提示词

```text
你现在负责 Miastra 第二阶段开发里的 Agent B2：普通版结果动作与衔接增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase2-consumer-result-flow

任务目标：
让普通版结果页的“继续改”真正顺手，减少用户下一步犹豫。

你负责的文件范围：
- src/features/studio-consumer/ConsumerResultActions.tsx
- src/features/generation/PreviewStage.tsx
- src/features/generation/ResponsePanel.tsx
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 优化结果动作区文案和层级
2. 优化动作触发后的状态反馈
3. 让结果动作更明确绑定当前结果来源
4. 优化动作后的输入恢复与焦点引导
5. 继续减少“重新开始”的割裂感

明确不要做的事：
- 不要重构普通版主输入区整体结构
- 不要改专业版控制区
- 不要深改模板页
- 不要改 Provider 配置页

交付标准：
- 用户能更自然地从结果进入下一轮创作
- 动作反馈更明确
- 继续改比重新开始更顺

自测清单：
- 完成一次生成
- 逐个点普通版结果动作
- 确认动作后状态和焦点恢复更自然
- 确认不需要重新回到复杂输入起点

参考文档：
- docs/image-skill-platform-phase1-review-v1.md
- docs/image-skill-platform-phase2-scope-v1.md
- docs/image-skill-platform-phase2-backlog-v1.md
- docs/image-skill-platform-phase2-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 4. Agent C2 提示词

```text
你现在负责 Miastra 第二阶段开发里的 Agent C2：专业版控制链增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase2-pro-control-chain

任务目标：
把当前专业版从“最小控制视图”推进到“更完整的创作控制台”。

你负责的文件范围：
- src/features/studio-pro/*
- 允许接触：
  - src/features/studio/AdvancedSettingsPanel.tsx
  - src/features/studio/PromptComposer.tsx
  - src/features/studio/ParameterPanel.tsx
  - src/features/provider/useProviderConfig.ts
  - src/pages/app/StudioPage.tsx

你的核心任务：
1. 增强参数快照区
2. 增强 Prompt 预览与复制链
3. 增强 Provider / model / 执行信息表达
4. 优化专业版结果回到参数控制的链路
5. 强化专业版控制区信息分组

明确不要做的事：
- 不要回头污染普通版输入区
- 不要深改作品页和任务页主结构
- 不要开始做完整调试台

交付标准：
- 专业版可见性更强
- Prompt、参数、Provider 信息更系统
- 结果回到重跑与复用更顺

自测清单：
- 打开专业版工作台
- 查看 Prompt、参数和 Provider 区
- 从结果回到控制区继续调整
- 切回普通版后不应出现这些增强块

参考文档：
- docs/image-skill-platform-phase1-review-v1.md
- docs/image-skill-platform-phase2-scope-v1.md
- docs/image-skill-platform-phase2-backlog-v1.md
- docs/image-skill-platform-phase2-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 5. Agent D2 提示词

```text
你现在负责 Miastra 第二阶段开发里的 Agent D2：模板系统升级。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase2-template-upgrade

任务目标：
让模板页从 Prompt 存档页更进一步，成为真正更像模板库的前台页面。

你负责的文件范围：
- src/pages/app/TemplatesPage.tsx
- src/features/prompt-templates/*
- 允许接触：
  - src/pages/app/StudioPage.tsx

你的核心任务：
1. 强化模板分类表达
2. 增加模板适用说明与推荐入口
3. 打通模板到普通版任务入口
4. 打通模板到专业版控制面板
5. 预留结构模板元信息展示位

明确不要做的事：
- 不要重构工作台主骨架
- 不要深改普通版和专业版输入逻辑
- 不要开始做模板后台 CMS

交付标准：
- 模板更像模板库，不只是内容列表
- 模板和工作台关系更明确
- 为后续结构模板升级留出位置

自测清单：
- 打开模板页
- 检查模板分类、说明和入口表达
- 验证模板到工作台的衔接是否更清楚

参考文档：
- docs/image-skill-platform-phase1-review-v1.md
- docs/image-skill-platform-phase2-scope-v1.md
- docs/image-skill-platform-phase2-backlog-v1.md
- docs/image-skill-platform-phase2-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 6. Agent E2 提示词

```text
你现在负责 Miastra 第二阶段开发里的 Agent E2：轻量追问与版本表达增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase2-guided-flow-and-versions

任务目标：
为 2 到 3 个高频场景接入轻量追问，并让版本来源更容易理解。

你负责的文件范围：
- src/features/studio-consumer/*
- src/features/studio-home/*
- src/features/works/workReplay.ts
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx

你的核心任务：
1. 定义首批高频场景
2. 设计轻量按钮式追问
3. 接入普通版输入流程
4. 增强结果来源与继续这一版的表达
5. 增强作品和任务中的版本来源提示

明确不要做的事：
- 不要做复杂聊天机器人
- 不要做复杂版本图谱
- 不要重构专业版控制链

交付标准：
- 至少 2 到 3 个场景有轻量追问
- 用户更容易理解“这是从哪一版来的”
- 继续创作路径更清晰

自测清单：
- 进入普通版高频场景
- 检查轻量追问是否能触发
- 检查作品和任务中的来源表达是否更清楚

参考文档：
- docs/image-skill-platform-phase1-review-v1.md
- docs/image-skill-platform-phase2-scope-v1.md
- docs/image-skill-platform-phase2-backlog-v1.md
- docs/image-skill-platform-phase2-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 7. 推荐发送顺序

建议按这个顺序启动第二阶段多会话：

1. Agent A2
2. Agent B2
3. Agent C2
4. Agent D2
5. Agent E2

原因：

- 先把普通版体验继续收口
- 再补专业版控制力
- 模板和轻量追问在输入层更稳定后接入更合适

## 8. 启动前提醒

真正开始第二阶段并行前，建议你再强调一次：

1. 只改自己负责范围
2. 不要回滚别人的改动
3. 如果主骨架已经变化，要适配现状
4. 第二阶段重点是收口体验，不是继续无边界扩张

这份文档的用途和第一阶段完全一致：

- 让你可以直接复制整段提示词发送
- 不需要现场再重新组织第二阶段任务语言
