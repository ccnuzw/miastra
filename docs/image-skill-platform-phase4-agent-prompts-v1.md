# 图像 Skill 平台 V1 · 第四阶段多 Agent 可复制任务提示词

## 文档说明

- 文档目标：提供可直接复制发送给第四阶段多会话 / 多 Agent 的单独任务提示词。
- 文档定位：承接 [image-skill-platform-phase4-agent-briefs-v1.md](./image-skill-platform-phase4-agent-briefs-v1.md) 的实操提示词文档。
- 当前状态：第四阶段可执行提示词文档。
- 更新时间：2026-05-05。

## 1. 使用说明

使用方式延续前三阶段：

1. 先确保当前总分支仍是 `feature/image-skill-platform-v1`
2. 为每个 Agent 从总分支切对应第四阶段子分支
3. 把下面对应 Agent 的整段提示词直接复制发送
4. 要求每个 Agent 只改自己负责的文件范围
5. 每个 Agent 完成后先汇报改动文件、自测结果和剩余风险

统一要求：

- 你不是独自在仓库里工作
- 不要回滚别人改动
- 只在自己负责范围内改动
- 如果发现现有状态已经变化，要适配现状，不要强行覆盖
- 完成后必须说明改了哪些文件、做了哪些自测、还有什么风险
- 第四阶段不要只做局部体验调整，尽量补共享 schema 和可扩展机制

## 2. Agent A4 提示词

```text
你现在负责 Miastra 第四阶段开发里的 Agent A4：统一场景 Schema 深化。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase4-scene-schema

任务目标：
让模板结构、追问结果、执行参数、版本上下文共享更稳定的场景对象和字段命名，减少多层适配与语义分裂。

你负责的文件范围：
- src/features/prompt-templates/*
- src/features/studio-consumer/*
- src/features/studio-pro/*
- src/features/generation/*
- src/features/works/workReplay.ts

你的核心任务：
1. 定义统一场景对象与字段命名约束
2. 对齐模板 schema、追问快照、执行参数、版本上下文
3. 清理重复字段和映射断点
4. 为后续持久化扩展预留稳定接口

明确不要做的事：
- 不要顺手做更多页面改版
- 不要引入新的大而全中台抽象
- 不要回滚第三阶段已有结构字段
- 不要做后端 schema 重构

交付标准：
- 模板、追问、执行、版本开始共享更稳定的场景字段
- 显著减少命名不一致和多层适配

自测清单：
- 检查模板、追问、结果动作、回流链中的核心字段命名
- 验证相同场景在多个入口下语义一致
- 确认不引入新的命名分裂

参考文档：
- docs/image-skill-platform-phase3-review-v1.md
- docs/image-skill-platform-phase4-scope-v1.md
- docs/image-skill-platform-phase4-backlog-v1.md
- docs/image-skill-platform-phase4-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 3. Agent B4 提示词

```text
你现在负责 Miastra 第四阶段开发里的 Agent B4：轻量追问配置化。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase4-guided-flow-config

任务目标：
让当前追问从少量手工场景能力升级成更容易扩展的配置机制。

你负责的文件范围：
- src/features/studio-home/*
- src/features/studio-consumer/*
- src/features/prompt-templates/*
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 抽离追问配置结构
2. 让模板字段驱动追问步骤和默认值
3. 扩展到更多高频场景，但控制范围
4. 强化追问结果到 Prompt 和结果动作的映射闭环

明确不要做的事：
- 不要做复杂自由对话追问
- 不要重构专业版控制区
- 不要大范围重写模板 schema
- 不要回退成硬编码散点追问

交付标准：
- 追问定义更清晰可扩展
- 新场景接入追问的成本明显下降
- 追问结果对工作台和结果动作的影响更稳定

自测清单：
- 进入多个高频场景触发追问
- 检查追问配置是否可复用
- 检查追问结果到输入区、生成态、结果动作的映射是否稳定

参考文档：
- docs/image-skill-platform-phase3-review-v1.md
- docs/image-skill-platform-phase4-scope-v1.md
- docs/image-skill-platform-phase4-backlog-v1.md
- docs/image-skill-platform-phase4-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 4. Agent C4 提示词

```text
你现在负责 Miastra 第四阶段开发里的 Agent C4：版本链生产流增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase4-version-production-flow

任务目标：
让版本链更稳定支持多轮继续、重试、分叉和派生，而不是只靠轻量动作语义。

你负责的文件范围：
- src/features/works/workReplay.ts
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 增强父节点、祖先节点和当前节点摘要
2. 强化多轮回流与派生的来源说明
3. 强化版本链与模板、追问、参数之间的对应关系
4. 优化普通版和专业版中的多轮版本消费体验

明确不要做的事：
- 不要做复杂版本图谱
- 不要引入项目级版本树系统
- 不要重构模板结构层
- 不要开始做完整 diff 面板

交付标准：
- 多轮版本链更容易理解
- 继续、重试、分叉在多轮场景下仍语义清晰
- 模板、追问、参数上下文与版本来源联系更紧

自测清单：
- 连续做两轮以上继续/重试/分叉
- 从作品页和任务页分别回流
- 检查多轮来源摘要是否还能清楚表达

参考文档：
- docs/image-skill-platform-phase3-review-v1.md
- docs/image-skill-platform-phase4-scope-v1.md
- docs/image-skill-platform-phase4-backlog-v1.md
- docs/image-skill-platform-phase4-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 5. Agent D4 提示词

```text
你现在负责 Miastra 第四阶段开发里的 Agent D4：专业版高频复用增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase4-pro-reuse

任务目标：
让专业版更明确服务高频复用、重跑和派生，而不是只停留在当前执行解释。

你负责的文件范围：
- src/features/studio-pro/*
- src/features/studio/*
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 强化结构字段与最终 Prompt / 执行的对应关系
2. 强化参数快照与版本派生的联动
3. 强化模板入口、重跑入口、派生入口的复用表达
4. 让专业版更像结构化生产控制台

明确不要做的事：
- 不要污染普通版任务流
- 不要重构版本链底层语义
- 不要开始做专家级实验台
- 不要新增大量只读信息块而无动作价值

交付标准：
- 专业版复用感更强
- 高频重跑和派生路径更明确
- 结构字段与执行关系更容易理解

自测清单：
- 在专业版中做结构复用和重跑
- 检查当前结果回到参数控制的路径
- 检查结构字段与执行摘要是否一致

参考文档：
- docs/image-skill-platform-phase3-review-v1.md
- docs/image-skill-platform-phase4-scope-v1.md
- docs/image-skill-platform-phase4-backlog-v1.md
- docs/image-skill-platform-phase4-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 6. Agent E4 提示词

```text
你现在负责 Miastra 第四阶段开发里的 Agent E4：模板向 Skill 入口演进。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase4-template-skill-entry

任务目标：
让模板从结构入口继续往“带执行意图和进入策略的 Skill 入口”推进。

你负责的文件范围：
- src/pages/app/TemplatesPage.tsx
- src/features/prompt-templates/*
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 强化模板的推荐模式和推荐入口表达
2. 强化模板到普通版/专业版/结果动作的进入策略
3. 强化模板与版本链、追问链的关联表达
4. 让模板页更像 Skill 入口集合，而不是结构资源页

明确不要做的事：
- 不要做模板后台 CMS
- 不要重构整站导航
- 不要深改版本链底层逻辑
- 不要引入独立 Skill 市场系统

交付标准：
- 模板更明显具备执行意图
- 模板与工作台模式和结果动作关系更明确
- 模板页更接近 Skill 入口集合

自测清单：
- 打开模板页并检查推荐入口表达
- 从模板分别进入普通版/专业版
- 检查模板与结果动作、追问、版本语义是否更统一

参考文档：
- docs/image-skill-platform-phase3-review-v1.md
- docs/image-skill-platform-phase4-scope-v1.md
- docs/image-skill-platform-phase4-backlog-v1.md
- docs/image-skill-platform-phase4-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 7. 推荐发送顺序

建议按这个顺序启动第四阶段多会话：

1. Agent A4
2. Agent B4
3. Agent C4
4. Agent D4
5. Agent E4

原因：

- 先把共享 schema 再压实
- 再让追问配置化建立在统一字段之上
- 再增强版本多轮生产流
- 然后补专业版高频复用
- 最后让模板更进一步走向 Skill 入口
