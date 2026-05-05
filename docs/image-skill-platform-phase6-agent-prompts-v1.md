# 图像 Skill 平台 V1 · 第六阶段多 Agent 可复制任务提示词

## 文档说明

- 文档目标：提供可直接复制发送给第六阶段多会话 / 多 Agent 的单独任务提示词。
- 文档定位：承接 [image-skill-platform-phase6-agent-briefs-v1.md](./image-skill-platform-phase6-agent-briefs-v1.md) 的实操提示词文档。
- 当前状态：第六阶段可执行提示词文档。
- 更新时间：2026-05-05。

## 1. 使用说明

使用方式延续前五阶段：

1. 先确保当前总分支仍是 `feature/image-skill-platform-v1`
2. 为每个 Agent 从总分支切对应第六阶段子分支
3. 把下面对应 Agent 的整段提示词直接复制发送
4. 要求每个 Agent 只改自己负责的文件范围
5. 每个 Agent 完成后先汇报改动文件、自测结果和剩余风险

统一要求：

- 你不是独自在仓库里工作
- 不要回滚别人改动
- 只在自己负责范围内改动
- 如果发现现有状态已经变化，要适配现状，不要强行覆盖
- 完成后必须说明改了哪些文件、做了哪些自测、还有什么风险
- 第六阶段不要只补更多解释层和配置层，尽量让 contract、runtime 和高频差异消费更深地接管主流程

## 2. Agent A6 提示词

```text
你现在负责 Miastra 第六阶段开发里的 Agent A6：Contract 全链路深化。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase6-contract-core

任务目标：
让 generation contract 更像统一主干契约，而不只是前端运行时中间层。

你负责的文件范围：
- src/features/generation/*
- src/features/works/workReplay.ts
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 继续减少旧结构兼容分叉
2. 强化主流程和回流链对 contract 的统一消费
3. 强化 contract 对 scene、prompt、parameters、guidedFlow、references、draw 的主干地位
4. 为后续持久化和任务记录承接继续压结构

明确不要做的事：
- 不要重构服务端或数据库
- 不要为了统一命名而打断现有主流程
- 不要引入新的“大而全中台抽象”
- 不要回滚第五阶段已有 contract 工作

交付标准：
- contract 在主流程中的承接更统一
- 旧结构桥接继续减少
- 回流链与执行链对 contract 的消费更稳定

自测清单：
- 检查主流程发起、回流恢复和执行参数承接是否继续统一到 contract
- 检查旧结构桥接是否继续收缩
- 确认没有新增命名分裂和重复快照层

参考文档：
- docs/image-skill-platform-phase5-review-v1.md
- docs/image-skill-platform-phase6-scope-v1.md
- docs/image-skill-platform-phase6-backlog-v1.md
- docs/image-skill-platform-phase6-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 3. Agent B6 提示词

```text
你现在负责 Miastra 第六阶段开发里的 Agent B6：Runtime 决策深化。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase6-runtime-decision

任务目标：
让模板 runtime 更明确决定追问路径、进入方式和结果动作优先级，而不只是提供模板默认值。

你负责的文件范围：
- src/features/prompt-templates/*
- src/features/studio-home/*
- src/features/studio-consumer/*
- src/pages/app/StudioPage.tsx
- src/pages/app/TemplatesPage.tsx

你的核心任务：
1. 强化模板对追问路径的主导
2. 强化模板对普通版 / 专业版进入方式的控制
3. 强化模板对结果动作优先级和默认分支的控制
4. 强化 runtime 与 contract、版本来源之间的联动

明确不要做的事：
- 不要做完整策略引擎
- 不要引入复杂模型路由系统
- 不要回退成更多散点 if/else
- 不要重构专业版控制区主体结构

交付标准：
- 模板 runtime 对主流程分支的控制更明显
- 进入方式、追问路径和动作分支更由模板决定
- runtime 与 contract 和版本上下文关系更紧

自测清单：
- 从多个模板入口进入普通版和专业版
- 检查模板是否更明确控制追问路径和动作优先级
- 检查 runtime 与版本来源、回流上下文的联动是否更清楚

参考文档：
- docs/image-skill-platform-phase5-review-v1.md
- docs/image-skill-platform-phase6-scope-v1.md
- docs/image-skill-platform-phase6-backlog-v1.md
- docs/image-skill-platform-phase6-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 4. Agent C6 提示词

```text
你现在负责 Miastra 第六阶段开发里的 Agent C6：版本差异消费增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase6-version-delta

任务目标：
让版本流更容易让高频用户看出这版和上一版、来源版到底差在哪里。

你负责的文件范围：
- src/features/works/workReplay.ts
- src/features/works/workReplay.test.ts
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 强化更直观的结构变化摘要
2. 强化当前节点与父节点的差异消费
3. 强化模板、追问、参数变化在版本流中的显式表达
4. 优化普通版和专业版对差异信息的消费方式

明确不要做的事：
- 不要做复杂图谱
- 不要引入完整 diff 工具
- 不要重构模板 runtime 层
- 不要为了“信息完整”而堆更多大段文字摘要

交付标准：
- 差异消费更直观
- 高级用户更容易理解“这一版比上一版改了什么”
- 多轮派生时关键变化更容易被抓住

自测清单：
- 连续进行继续、重试、分叉的多轮操作
- 从作品页和任务页分别高频回流
- 检查普通版和专业版里差异摘要是否更快可读

参考文档：
- docs/image-skill-platform-phase5-review-v1.md
- docs/image-skill-platform-phase6-scope-v1.md
- docs/image-skill-platform-phase6-backlog-v1.md
- docs/image-skill-platform-phase6-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 5. Agent D6 提示词

```text
你现在负责 Miastra 第六阶段开发里的 Agent D6：专业版校准决策增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase6-pro-calibration

任务目标：
让专业版不仅能对照，还能更快帮助用户决定下一步该怎么改、该从哪一版派生。

你负责的文件范围：
- src/features/studio-pro/*
- src/features/studio/*
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 强化 field-to-prompt 对照
2. 强化 current-vs-source 对照
3. 强化参数校准提示
4. 强化派生与重跑的决策辅助表达

明确不要做的事：
- 不要污染普通版任务流
- 不要重构版本链底层语义
- 不要开始做完整实验室
- 不要新增大量只读信息而无决策价值

交付标准：
- 专业版更会帮助用户判断下一步
- 来源版与当前版对照更清楚
- 参数校准建议更有价值

自测清单：
- 在专业版里做一次来源版对照和一次派生决策
- 检查结构字段、Prompt 和参数快照之间的校准提示
- 检查重跑与派生建议是否更像决策台

参考文档：
- docs/image-skill-platform-phase5-review-v1.md
- docs/image-skill-platform-phase6-scope-v1.md
- docs/image-skill-platform-phase6-backlog-v1.md
- docs/image-skill-platform-phase6-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 6. Agent E6 提示词

```text
你现在负责 Miastra 第六阶段开发里的 Agent E6：Skill 运行闭环增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase6-skill-loop

任务目标：
让模板、追问、执行、结果动作和版本回流更像一个完整 Skill 运行闭环，而不是若干相关模块。

你负责的文件范围：
- src/features/prompt-templates/*
- src/features/studio-home/*
- src/features/studio-consumer/*
- src/features/works/workReplay.ts
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 强化模板到追问到执行到结果动作的闭环承接
2. 强化结果动作对 runtime 分支的反向影响
3. 强化版本回流重新进入 Skill 闭环的体验
4. 让模板更像运行中的 Skill 单元

明确不要做的事：
- 不要做 Skill 市场系统
- 不要重构整站导航
- 不要深改 generation contract 主干
- 不要新增大量说明性 UI 而无闭环运行价值

交付标准：
- 模板、追问、执行、动作、回流之间更像闭环
- 结果动作对 runtime 分支影响更清楚
- 版本回流重新进入 Skill 链更自然

自测清单：
- 从模板入口发起一次普通版流程并继续到结果动作再回流
- 检查结果动作是否能反向影响 runtime 分支
- 检查版本回流后是否更自然重新进入同一 Skill 链

参考文档：
- docs/image-skill-platform-phase5-review-v1.md
- docs/image-skill-platform-phase6-scope-v1.md
- docs/image-skill-platform-phase6-backlog-v1.md
- docs/image-skill-platform-phase6-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 7. 推荐发送顺序

建议按这个顺序启动第六阶段多会话：

1. Agent A6
2. Agent B6
3. Agent C6
4. Agent D6
5. Agent E6

原因：

- 先把 contract 继续压成主干
- 再让 runtime 更深地接管主流程
- 再增强版本差异消费
- 然后补专业版校准决策
- 最后让 Skill 闭环更完整
