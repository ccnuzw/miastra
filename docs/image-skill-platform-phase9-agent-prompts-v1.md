# 图像 Skill 平台 V1 · 第九阶段多 Agent 可复制任务提示词

## 文档说明

- 文档目标：提供可直接复制发送给第九阶段多会话 / 多 Agent 的单独任务提示词。
- 文档定位：承接 [image-skill-platform-phase9-agent-briefs-v1.md](./image-skill-platform-phase9-agent-briefs-v1.md) 的实操提示词文档。
- 当前状态：第九阶段可执行提示词文档。
- 更新时间：2026-05-05。

## 1. 使用说明

使用方式延续前八阶段：

1. 先确保当前总分支仍是 `feature/image-skill-platform-v1`
2. 为每个 Agent 从总分支切对应第九阶段子分支
3. 把下面对应 Agent 的整段提示词直接复制发送
4. 要求每个 Agent 只改自己负责的文件范围
5. 每个 Agent 完成后先汇报改动文件、自测结果和剩余风险

统一要求：

- 你不是独自在仓库里工作
- 不要回滚别人改动
- 只在自己负责范围内改动
- 如果发现现有状态已经变化，要适配现状，不要强行覆盖
- 完成后必须说明改了哪些文件、做了哪些自测、还有什么风险
- 第九阶段不要继续扩能力，只做最终一致性、最终收边、最终回归与上线执行准备

## 2. Agent A9 提示词

```text
你现在负责 Miastra 第九阶段开发里的 Agent A9：Contract / Runtime 最终一致性收口。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase9-contract-runtime-final

任务目标：
完成主干结构最终一致性检查与封口。

你负责的文件范围：
- src/features/generation/*
- src/features/prompt-templates/*
- src/features/studio-consumer/*
- src/features/works/workReplay.ts

你的核心任务：
1. 做 contract / runtime 最终一致性检查
2. 清理残余低频 bridge / fallback / runtime 特例
3. 明确最终主干判断边界
4. 压缩最后一批游离在主干外的结构语义

明确不要做的事：
- 不要重构服务端或数据库
- 不要重开新的结构层
- 不要扩新功能面
- 不要回滚第八阶段已有最终封口工作

交付标准：
- contract / runtime 一致性更明确
- 残余特例继续减少
- 主干判断更清楚

自测清单：
- 检查主流程、回流、版本恢复、入口恢复是否共享同一主干判断
- 检查低频 bridge / fallback / runtime 特例是否继续减少
- 确认没有新增平行主干

参考文档：
- docs/image-skill-platform-phase8-review-v1.md
- docs/image-skill-platform-phase9-scope-v1.md
- docs/image-skill-platform-phase9-backlog-v1.md
- docs/image-skill-platform-phase9-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 3. Agent B9 提示词

```text
你现在负责 Miastra 第九阶段开发里的 Agent B9：高频主链最终收边。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase9-mainflow-polish

任务目标：
完成普通版、版本流、模板入口的最终主链收边。

你负责的文件范围：
- src/features/studio-consumer/*
- src/pages/app/StudioPage.tsx
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx
- src/pages/app/TemplatesPage.tsx

你的核心任务：
1. 再压普通版高频主链
2. 再压版本流高频回流路径
3. 再压模板入口到工作台的最终体验链
4. 清理仍然存在的高频主链理解拐点

明确不要做的事：
- 不要做大改版 UI
- 不要重构 contract / runtime 主干
- 不要扩新入口
- 不要为了“更完整”而增加更多非必要说明

交付标准：
- 高频主链最终更顺
- 回流路径最终更短
- 模板入口最终更自然

自测清单：
- 从首页、模板入口、结果动作、作品回流、任务回流分别进入工作台
- 检查普通版高频主链是否更短
- 检查模板入口到工作台链路是否更自然

参考文档：
- docs/image-skill-platform-phase8-review-v1.md
- docs/image-skill-platform-phase9-scope-v1.md
- docs/image-skill-platform-phase9-backlog-v1.md
- docs/image-skill-platform-phase9-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 4. Agent C9 提示词

```text
你现在负责 Miastra 第九阶段开发里的 Agent C9：专业版连续链最终压实。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase9-pro-final-pass

任务目标：
完成专业版连续决策与连续派生的最终压实。

你负责的文件范围：
- src/features/studio-pro/*
- src/features/studio/*
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 再压专业版连续派生链
2. 再压专业版重跑 / 对照 / 校准链
3. 清理专业版剩余使用跳跃点
4. 让连续判断更像最终生产流

明确不要做的事：
- 不要污染普通版任务流
- 不要重构版本链底层语义
- 不要开始做完整实验台
- 不要增加大量只读信息而无连续判断价值

交付标准：
- 专业版连续链最终更稳
- 跳跃点更少
- 连续判断更自然

自测清单：
- 在专业版里做一次连续派生和一次连续重跑
- 检查对照、校准、执行建议之间是否更顺
- 检查剩余跳跃点是否减少

参考文档：
- docs/image-skill-platform-phase8-review-v1.md
- docs/image-skill-platform-phase9-scope-v1.md
- docs/image-skill-platform-phase9-backlog-v1.md
- docs/image-skill-platform-phase9-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 5. Agent D9 提示词

```text
你现在负责 Miastra 第九阶段开发里的 Agent D9：异常态与恢复态最终统一。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase9-state-unification

任务目标：
完成双模式关键边界态最终统一。

你负责的文件范围：
- src/pages/app/StudioPage.tsx
- src/pages/app/TemplatesPage.tsx
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 补最终异常态、恢复态、降级态
2. 统一双模式边界反馈
3. 统一模板入口和回流链的恢复反馈
4. 清理剩余边界态不一致问题

明确不要做的事：
- 不要扩新大型功能模块
- 不要重构整站导航
- 不要深改 contract 和 runtime 主干
- 不要只做视觉修饰而不提升边界态一致性

交付标准：
- 边界态更统一
- 恢复态更自然
- 降级态更清楚

自测清单：
- 检查普通版、专业版、模板入口、回流链的异常态与恢复态
- 检查关键降级态反馈
- 检查不同入口下边界态文案是否一致

参考文档：
- docs/image-skill-platform-phase8-review-v1.md
- docs/image-skill-platform-phase9-scope-v1.md
- docs/image-skill-platform-phase9-backlog-v1.md
- docs/image-skill-platform-phase9-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 6. Agent E9 提示词

```text
你现在负责 Miastra 第九阶段开发里的 Agent E9：最终回归与上线执行准备。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase9-release-execution

任务目标：
完成手工验收、回归视角和上线执行准备。

你负责的文件范围：
- docs/*
- 必要时少量涉及 src/pages/app/* 的状态文案和反馈

你的核心任务：
1. 整理最终手工验收视角
2. 整理最终回归重点
3. 整理上线执行准备相关文档或提示
4. 补充极少量与回归执行直接相关的状态文案

明确不要做的事：
- 不要再扩新业务功能
- 不要重构页面结构
- 不要深改主流程代码
- 不要把回归文档写成新一轮 PRD

交付标准：
- 最终回归重点更清楚
- 手工验收更容易执行
- 上线执行准备更完整

自测清单：
- 检查回归清单是否覆盖双模式、模板入口、版本回流、专业版连续链
- 检查验收步骤是否可直接执行
- 检查上线执行准备文档是否足够清楚

参考文档：
- docs/image-skill-platform-phase8-review-v1.md
- docs/image-skill-platform-phase9-scope-v1.md
- docs/image-skill-platform-phase9-backlog-v1.md
- docs/image-skill-platform-phase9-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 7. 推荐发送顺序

建议按这个顺序启动第九阶段多会话：

1. Agent A9
2. Agent B9
3. Agent C9
4. Agent D9
5. Agent E9

原因：

- 先做主干最终一致性收口
- 再压高频主链
- 再压专业版连续链
- 然后统一异常态与恢复态
- 最后整理最终回归与上线执行准备
