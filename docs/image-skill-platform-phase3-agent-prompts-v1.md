# 图像 Skill 平台 V1 · 第三阶段多 Agent 可复制任务提示词

## 文档说明

- 文档目标：提供可直接复制发送给第三阶段多会话 / 多 Agent 的单独任务提示词。
- 文档定位：承接 [image-skill-platform-phase3-agent-briefs-v1.md](./image-skill-platform-phase3-agent-briefs-v1.md) 的实操提示词文档。
- 当前状态：第三阶段可执行提示词文档。
- 更新时间：2026-05-05。

## 1. 使用说明

使用方式延续前两阶段：

1. 先确保当前总分支仍是 `feature/image-skill-platform-v1`
2. 为每个 Agent 从总分支切对应第三阶段子分支
3. 把下面对应 Agent 的整段提示词直接复制发送
4. 要求每个 Agent 只改自己负责的文件范围
5. 每个 Agent 完成后先汇报改动文件、自测结果和剩余风险

统一要求：

- 你不是独自在仓库里工作
- 不要回滚别人改动
- 只在自己负责范围内改动
- 如果发现现有状态已经变化，要适配现状，不要强行覆盖
- 完成后必须说明改了哪些文件、做了哪些自测、还有什么风险
- 第三阶段不要只做表层体验调整，尽量补最小必要的结构层

## 2. Agent A3 提示词

```text
你现在负责 Miastra 第三阶段开发里的 Agent A3：模板结构化基础。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase3-template-schema

任务目标：
建立首批结构模板元信息和字段基础，让模板真正成为工作台输入和展示的结构性入口。

你负责的文件范围：
- src/features/prompt-templates/*
- src/pages/app/TemplatesPage.tsx
- 允许接触：
  - src/pages/app/StudioPage.tsx
  - src/features/studio-home/*
  - src/features/studio-pro/*

你的核心任务：
1. 定义首批结构模板元信息
2. 定义模板字段、场景、入口模式和推荐模式基础类型
3. 让模板列表展示结构信息
4. 让模板卡片或详情展示字段摘要
5. 让工作台入口可读取首批结构模板基础字段

明确不要做的事：
- 不要开始做模板后台 CMS
- 不要设计完整模板 DSL 编辑器
- 不要深改普通版追问流程
- 不要顺手扩写版本链逻辑

交付标准：
- 至少首批模板具备可读的结构化元信息
- 模板不再只展示一段 Prompt 内容
- 工作台能消费模板的基础结构字段

自测清单：
- 打开模板页
- 检查模板列表和模板卡片是否展示结构信息
- 验证模板进入工作台后，基础字段能被带入

参考文档：
- docs/image-skill-platform-phase2-review-v1.md
- docs/image-skill-platform-phase3-scope-v1.md
- docs/image-skill-platform-phase3-backlog-v1.md
- docs/image-skill-platform-phase3-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 3. Agent B3 提示词

```text
你现在负责 Miastra 第三阶段开发里的 Agent B3：轻量追问正式化。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase3-guided-flow-structured

任务目标：
让 2 到 3 个高频场景拥有正式的轻量追问步骤、选项、默认值和状态回写链。

你负责的文件范围：
- src/features/studio-home/*
- src/features/studio-consumer/*
- src/pages/app/StudioPage.tsx
- 允许接触：
  - src/features/generation/*
  - src/features/works/workReplay.ts

你的核心任务：
1. 选定首批高频场景
2. 为每个场景定义问题顺序和选项结构
3. 让追问结果写回普通版输入上下文
4. 让追问结果进入历史和继续创作上下文
5. 保持按钮式、轻量式追问体验

明确不要做的事：
- 不要做复杂聊天机器人
- 不要引入通用问答引擎
- 不要深改专业版控制区
- 不要重构模板主数据结构

交付标准：
- 至少 2 到 3 个场景具备正式轻量追问流程
- 追问结果能在工作台中回显和继续使用
- 用户不需要重新组织整段描述也能继续生成

自测清单：
- 进入首批高频场景
- 逐步触发追问流程
- 检查追问结果是否能写回输入区和后续生成状态
- 检查从历史回流时追问上下文是否还能理解

参考文档：
- docs/image-skill-platform-phase2-review-v1.md
- docs/image-skill-platform-phase3-scope-v1.md
- docs/image-skill-platform-phase3-backlog-v1.md
- docs/image-skill-platform-phase3-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 4. Agent C3 提示词

```text
你现在负责 Miastra 第三阶段开发里的 Agent C3：版本链工作流增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase3-version-workflow

任务目标：
让版本链从“来源提示”升级到“继续这一版 / 重试这一版 / 从这一版分叉”的工作流能力。

你负责的文件范围：
- src/features/studio-consumer/*
- src/features/generation/PreviewStage.tsx
- src/features/generation/ResponsePanel.tsx
- src/features/works/workReplay.ts
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx

你的核心任务：
1. 统一版本来源类型和动作命名
2. 增强结果页中的版本继续动作
3. 增强作品页中的版本继续和分叉表达
4. 增强任务页中的重试和继续这一版表达
5. 在回流链中保留更明确的父节点摘要

明确不要做的事：
- 不要做复杂版本图谱
- 不要改模板结构定义
- 不要重构专业版参数控制区
- 不要引入项目级版本管理

交付标准：
- 用户能明确区分继续、重试、分叉三种动作
- 作品、任务、结果页中的版本语义更一致
- 从历史回到工作台时版本上下文更清楚

自测清单：
- 完成一次生成并进入结果动作
- 从作品页回流一次
- 从任务页回流一次
- 检查继续、重试、分叉动作的文案和行为是否清晰

参考文档：
- docs/image-skill-platform-phase2-review-v1.md
- docs/image-skill-platform-phase3-scope-v1.md
- docs/image-skill-platform-phase3-backlog-v1.md
- docs/image-skill-platform-phase3-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 5. Agent D3 提示词

```text
你现在负责 Miastra 第三阶段开发里的 Agent D3：专业版控制链深化。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase3-pro-control-deepen

任务目标：
让专业版更清楚承接结构模板、Prompt、参数、Provider 和版本来源之间的控制关系。

你负责的文件范围：
- src/features/studio-pro/*
- 允许接触：
  - src/features/studio/AdvancedSettingsPanel.tsx
  - src/features/studio/ParameterPanel.tsx
  - src/features/studio/PromptComposer.tsx
  - src/pages/app/StudioPage.tsx

你的核心任务：
1. 展示结构模板上下文
2. 强化 Prompt、参数、Provider 的对应关系
3. 强化来源版本到重跑控制的链路
4. 增强参数快照的复用提示
5. 为后续差异对比预留结构位

明确不要做的事：
- 不要污染普通版输入区
- 不要重构版本链主逻辑
- 不要开始做完整调试台
- 不要扩写模板后台能力

交付标准：
- 专业版能更清楚说明当前这一轮的结构、来源和执行关系
- Prompt、参数、Provider、来源之间的关系更清晰
- 从当前结果回到重跑和派生更顺

自测清单：
- 打开专业版工作台
- 查看结构模板、Prompt、参数、Provider 区域
- 从当前结果重新进入控制链
- 确认普通版不出现这些增强块

参考文档：
- docs/image-skill-platform-phase2-review-v1.md
- docs/image-skill-platform-phase3-scope-v1.md
- docs/image-skill-platform-phase3-backlog-v1.md
- docs/image-skill-platform-phase3-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 6. Agent E3 提示词

```text
你现在负责 Miastra 第三阶段开发里的 Agent E3：模板-追问-执行链路对齐。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase3-flow-alignment

任务目标：
减少第三阶段出现“各模块各讲各的”的风险，让模板、追问、工作台、结果动作开始共享统一场景语义。

你负责的文件范围：
- src/features/prompt-templates/*
- src/features/studio-home/*
- src/features/studio-consumer/*
- src/features/studio-pro/*
- src/pages/app/StudioPage.tsx
- src/features/works/workReplay.ts

你的核心任务：
1. 定义首批统一场景对象和字段命名
2. 对齐普通版、专业版、模板页的入口参数
3. 对齐追问结果与 Prompt 填充字段
4. 对齐结果动作与来源类型
5. 清理命名不一致和回写断点

明确不要做的事：
- 不要再做一套新的前台体验层
- 不要大范围重构所有历史逻辑
- 不要回滚前面 Agent 已经做出的结构化字段工作
- 不要引入新的抽象但不落地

交付标准：
- 普通版、专业版、模板页使用同一套场景语义
- 追问结果与模板字段映射更稳定
- 结果动作、来源类型和工作台入口不再彼此割裂

自测清单：
- 打开模板页、普通版、专业版
- 对比同一场景在三处的命名和入口参数
- 验证结果动作回到工作台后语义是否一致

参考文档：
- docs/image-skill-platform-phase2-review-v1.md
- docs/image-skill-platform-phase3-scope-v1.md
- docs/image-skill-platform-phase3-backlog-v1.md
- docs/image-skill-platform-phase3-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 7. 推荐发送顺序

建议按这个顺序启动第三阶段多会话：

1. Agent A3
2. Agent B3
3. Agent C3
4. Agent D3
5. Agent E3

原因：

- 先把模板结构化基础立起来
- 再让轻量追问基于模板字段成立
- 版本链和专业版控制链随后接入更稳
- 最后由链路对齐 Agent 做统一命名和回写收口
