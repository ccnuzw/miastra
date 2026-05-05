# 图像 Skill 平台 V1 · 第七阶段多 Agent 可复制任务提示词

## 文档说明

- 文档目标：提供可直接复制发送给第七阶段多会话 / 多 Agent 的单独任务提示词。
- 文档定位：承接 [image-skill-platform-phase7-agent-briefs-v1.md](./image-skill-platform-phase7-agent-briefs-v1.md) 的实操提示词文档。
- 当前状态：第七阶段可执行提示词文档。
- 更新时间：2026-05-05。

## 1. 使用说明

使用方式延续前六阶段：

1. 先确保当前总分支仍是 `feature/image-skill-platform-v1`
2. 为每个 Agent 从总分支切对应第七阶段子分支
3. 把下面对应 Agent 的整段提示词直接复制发送
4. 要求每个 Agent 只改自己负责的文件范围
5. 每个 Agent 完成后先汇报改动文件、自测结果和剩余风险

统一要求：

- 你不是独自在仓库里工作
- 不要回滚别人改动
- 只在自己负责范围内改动
- 如果发现现有状态已经变化，要适配现状，不要强行覆盖
- 完成后必须说明改了哪些文件、做了哪些自测、还有什么风险
- 第七阶段不要继续铺新的大能力层，尽量让现有主干更稳、更顺、更适合 V1 上线前收口

## 2. Agent A7 提示词

```text
你现在负责 Miastra 第七阶段开发里的 Agent A7：Contract 稳定收口。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase7-contract-stability

任务目标：
让 generation contract 更接近 V1 统一事实来源，而不只是更强的运行时主干。

你负责的文件范围：
- src/features/generation/*
- src/features/works/workReplay.ts
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 继续压缩旧结构兼容桥接
2. 强化任务、结果、回流、重跑对 contract 的统一消费
3. 明确 contract 在关键主流程中的事实来源地位
4. 减少 snapshot / fallback / bridge 的重复语义

明确不要做的事：
- 不要重构服务端或数据库
- 不要打断现有主流程
- 不要引入新的大中台抽象
- 不要回滚第六阶段已有 contract 工作

交付标准：
- contract 在关键主流程中的主干地位更明确
- 旧结构桥接继续减少
- 回流链与执行链对 contract 的消费更统一

自测清单：
- 检查任务发起、结果保存、回流恢复和重跑是否更统一围绕 contract
- 检查旧结构桥接是否继续收缩
- 确认没有新增并行快照语义

参考文档：
- docs/image-skill-platform-phase6-review-v1.md
- docs/image-skill-platform-phase7-scope-v1.md
- docs/image-skill-platform-phase7-backlog-v1.md
- docs/image-skill-platform-phase7-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 3. Agent B7 提示词

```text
你现在负责 Miastra 第七阶段开发里的 Agent B7：Runtime 分支收口。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase7-runtime-convergence

任务目标：
让模板 runtime 对追问路径、入口方式、结果动作和回流再进入的控制更稳定、更少例外分支。

你负责的文件范围：
- src/features/prompt-templates/*
- src/features/studio-home/*
- src/features/studio-consumer/*
- src/pages/app/StudioPage.tsx
- src/pages/app/TemplatesPage.tsx

你的核心任务：
1. 继续减少 runtime 旁路逻辑
2. 强化模板 runtime 对入口、追问、结果动作的统一控制
3. 强化 runtime 与 contract、版本来源、场景入口之间的默认联动
4. 优化 runtime 决策在普通版和模板入口中的一致性

明确不要做的事：
- 不要做完整策略引擎平台
- 不要引入复杂模型决策树
- 不要回退成更多散点特例逻辑
- 不要重构专业版主体结构

交付标准：
- runtime 例外分支更少
- 模板对入口、追问和动作的控制更稳定
- 普通版和模板入口对 runtime 的消费更一致

自测清单：
- 从多个模板和首页入口进入普通版
- 检查追问、入口、结果动作是否更稳定地受 runtime 决定
- 检查模板入口与结果动作回流是否更一致

参考文档：
- docs/image-skill-platform-phase6-review-v1.md
- docs/image-skill-platform-phase7-scope-v1.md
- docs/image-skill-platform-phase7-backlog-v1.md
- docs/image-skill-platform-phase7-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 4. Agent C7 提示词

```text
你现在负责 Miastra 第七阶段开发里的 Agent C7：版本高频效率收口。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase7-version-efficiency

任务目标：
让版本流更适合高频继续、重试和分叉，而不只是更会说明变化。

你负责的文件范围：
- src/features/works/workReplay.ts
- src/features/works/workReplay.test.ts
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 优化版本差异的高频消费密度
2. 强化继续、重试、分叉的动作判断提示
3. 强化版本节点与模板、追问、参数变化之间的直达关系
4. 让普通版和专业版对版本消费更分层但更顺手

明确不要做的事：
- 不要做复杂图谱
- 不要引入完整 diff 面板系统
- 不要重构 generation contract 主干
- 不要为了“更全面”而堆更多长摘要

交付标准：
- 高频版本消费更快
- 继续、重试、分叉的判断成本更低
- 普通版和专业版都更容易消费版本变化

自测清单：
- 连续进行继续、重试、分叉的多轮操作
- 从作品页和任务页分别高频回流
- 检查普通版和专业版里版本判断是否更快

参考文档：
- docs/image-skill-platform-phase6-review-v1.md
- docs/image-skill-platform-phase7-scope-v1.md
- docs/image-skill-platform-phase7-backlog-v1.md
- docs/image-skill-platform-phase7-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 5. Agent D7 提示词

```text
你现在负责 Miastra 第七阶段开发里的 Agent D7：专业版连续决策收口。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase7-pro-decision-flow

任务目标：
让专业版从“更会对照和校准”，继续走向“更适合连续决策和高频派生”。

你负责的文件范围：
- src/features/studio-pro/*
- src/features/studio/*
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 强化连续派生与重跑的决策提示
2. 强化来源版 / 当前版 / 目标版之间的对照关系
3. 优化参数、Prompt、执行信息在连续校准中的消费顺序
4. 让专业版更像高频生产工具，而不是多块高级信息面板

明确不要做的事：
- 不要污染普通版任务流
- 不要重构版本链底层语义
- 不要开始做完整实验台
- 不要新增大量只读信息而无连续决策价值

交付标准：
- 专业版更适合连续决策
- 派生与重跑的决策链更短
- 参数、Prompt、执行信息消费顺序更清楚

自测清单：
- 在专业版里做一次连续派生和一次连续重跑
- 检查来源版 / 当前版 / 目标版之间的对照表达
- 检查参数和 Prompt 校准是否更利于下一步决策

参考文档：
- docs/image-skill-platform-phase6-review-v1.md
- docs/image-skill-platform-phase7-scope-v1.md
- docs/image-skill-platform-phase7-backlog-v1.md
- docs/image-skill-platform-phase7-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 6. Agent E7 提示词

```text
你现在负责 Miastra 第七阶段开发里的 Agent E7：双模式体验与异常态收口。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase7-experience-hardening

任务目标：
让普通版、专业版、模板入口和回流链在异常态、空态和边界态下更稳，更接近 V1 上线前收口状态。

你负责的文件范围：
- src/pages/app/StudioPage.tsx
- src/pages/app/TemplatesPage.tsx
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 补齐主流程异常态、空态和恢复态
2. 统一普通版 / 专业版 / 模板入口的边界反馈
3. 优化关键主流程的状态提示、文案和降级路径
4. 为 V1 上线前回归和手工验收准备更稳状态

明确不要做的事：
- 不要扩新大型功能模块
- 不要重构整站导航
- 不要深改 contract 和 runtime 主干
- 不要只做纯视觉修饰而不提升状态稳定性

交付标准：
- 主流程异常态和空态更完整
- 双模式和模板入口边界反馈更统一
- 更适合后续回归和上线前验收

自测清单：
- 检查普通版、专业版、模板入口的空态和异常态
- 检查作品回流和任务回流的边界提示
- 检查关键主流程的状态反馈和降级文案

参考文档：
- docs/image-skill-platform-phase6-review-v1.md
- docs/image-skill-platform-phase7-scope-v1.md
- docs/image-skill-platform-phase7-backlog-v1.md
- docs/image-skill-platform-phase7-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 7. 推荐发送顺序

建议按这个顺序启动第七阶段多会话：

1. Agent A7
2. Agent B7
3. Agent C7
4. Agent D7
5. Agent E7

原因：

- 先把 contract 收口成更稳的主干
- 再压 runtime 决策中的例外分支
- 再优化版本高频效率
- 然后补专业版连续决策链
- 最后统一双模式体验和异常态
