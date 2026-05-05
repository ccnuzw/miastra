# 图像 Skill 平台 V1 · 第八阶段多 Agent 可复制任务提示词

## 文档说明

- 文档目标：提供可直接复制发送给第八阶段多会话 / 多 Agent 的单独任务提示词。
- 文档定位：承接 [image-skill-platform-phase8-agent-briefs-v1.md](./image-skill-platform-phase8-agent-briefs-v1.md) 的实操提示词文档。
- 当前状态：第八阶段可执行提示词文档。
- 更新时间：2026-05-05。

## 1. 使用说明

使用方式延续前七阶段：

1. 先确保当前总分支仍是 `feature/image-skill-platform-v1`
2. 为每个 Agent 从总分支切对应第八阶段子分支
3. 把下面对应 Agent 的整段提示词直接复制发送
4. 要求每个 Agent 只改自己负责的文件范围
5. 每个 Agent 完成后先汇报改动文件、自测结果和剩余风险

统一要求：

- 你不是独自在仓库里工作
- 不要回滚别人改动
- 只在自己负责范围内改动
- 如果发现现有状态已经变化，要适配现状，不要强行覆盖
- 完成后必须说明改了哪些文件、做了哪些自测、还有什么风险
- 第八阶段不要继续扩新能力层，尽量让主干更稳、异常态更完整、回归与验收准备更充分

## 2. Agent A8 提示词

```text
你现在负责 Miastra 第八阶段开发里的 Agent A8：Contract 最终封口。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase8-contract-seal

任务目标：
让 generation contract 更接近 V1 最终唯一事实来源。

你负责的文件范围：
- src/features/generation/*
- src/features/works/workReplay.ts
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 清理残余 bridge / fallback 语义
2. 强化关键主流程默认围绕 contract 运转
3. 明确 contract 主干判断与最终收口边界
4. 压缩仍然游离在主干之外的结构语义

明确不要做的事：
- 不要重构服务端或数据库
- 不要重开新的结构层
- 不要打断现有主流程
- 不要回滚第七阶段已有主干收口工作

交付标准：
- contract 更接近唯一事实来源
- bridge / fallback 继续减少
- 主流程默认围绕 contract 运转

自测清单：
- 检查发起、回流、重跑、版本恢复是否都继续围绕 contract
- 检查残余 bridge / fallback 是否继续收缩
- 确认没有新增平行结构快照

参考文档：
- docs/image-skill-platform-phase7-review-v1.md
- docs/image-skill-platform-phase8-scope-v1.md
- docs/image-skill-platform-phase8-backlog-v1.md
- docs/image-skill-platform-phase8-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 3. Agent B8 提示词

```text
你现在负责 Miastra 第八阶段开发里的 Agent B8：Runtime 例外分支清理。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase8-runtime-cleanup

任务目标：
让模板 runtime 进一步减少特例和旁路逻辑。

你负责的文件范围：
- src/features/prompt-templates/*
- src/features/studio-home/*
- src/features/studio-consumer/*
- src/pages/app/StudioPage.tsx
- src/pages/app/TemplatesPage.tsx

你的核心任务：
1. 清理低频入口上的 runtime 特例
2. 强化 runtime 与降级、恢复、继续动作的一致性
3. 统一普通版、模板入口、结果动作回流的 runtime 消费
4. 压缩仍需要手工覆盖的分支判断

明确不要做的事：
- 不要做完整策略引擎平台
- 不要引入复杂模型决策树
- 不要继续堆更多特例 if/else
- 不要重构专业版主体结构

交付标准：
- runtime 例外继续减少
- 入口、恢复、继续动作更一致
- 普通版和模板入口行为更稳定

自测清单：
- 从首页入口、模板入口、结果动作回流分别进入普通版
- 检查恢复、降级、继续动作是否更稳定受 runtime 控制
- 检查模板入口与回流路径是否更一致

参考文档：
- docs/image-skill-platform-phase7-review-v1.md
- docs/image-skill-platform-phase8-scope-v1.md
- docs/image-skill-platform-phase8-backlog-v1.md
- docs/image-skill-platform-phase8-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 4. Agent C8 提示词

```text
你现在负责 Miastra 第八阶段开发里的 Agent C8：版本流最后一轮提效。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase8-version-last-mile

任务目标：
让继续、重试、分叉的高频链再更短一点。

你负责的文件范围：
- src/features/works/workReplay.ts
- src/features/works/workReplay.test.ts
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 压缩版本差异消费路径
2. 强化高频动作判断提示
3. 优化 Works / Tasks / Studio 之间的高频回流效率
4. 继续减少多轮派生里的不必要理解成本

明确不要做的事：
- 不要做复杂图谱
- 不要引入完整 diff 面板系统
- 不要重构 contract 主干
- 不要为了信息完整而继续堆长摘要

交付标准：
- 高频版本链更短
- 判断提示更清楚
- 回流效率更高

自测清单：
- 连续进行继续、重试、分叉的高频操作
- 从作品页和任务页分别高频回流
- 检查普通版和专业版中的高频判断链是否更短

参考文档：
- docs/image-skill-platform-phase7-review-v1.md
- docs/image-skill-platform-phase8-scope-v1.md
- docs/image-skill-platform-phase8-backlog-v1.md
- docs/image-skill-platform-phase8-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 5. Agent D8 提示词

```text
你现在负责 Miastra 第八阶段开发里的 Agent D8：专业版连续决策收边。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase8-pro-final-flow

任务目标：
让专业版高频决策链更紧凑、更稳定。

你负责的文件范围：
- src/features/studio-pro/*
- src/features/studio/*
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 再压短连续派生与连续重跑路径
2. 优化参数、Prompt、执行信息的决策消费顺序
3. 强化来源版 / 当前版 / 目标版之间的直达关系
4. 继续减少决策链中的信息分散感

明确不要做的事：
- 不要污染普通版任务流
- 不要重构版本链底层语义
- 不要开始做完整实验台
- 不要新增大量只读信息而无连续决策价值

交付标准：
- 专业版连续决策链更顺
- 派生与重跑更紧凑
- 对照与校准关系更直接

自测清单：
- 在专业版里做一次连续派生和一次连续重跑
- 检查来源版 / 当前版 / 目标版直达关系
- 检查参数、Prompt、执行信息是否更利于连续判断

参考文档：
- docs/image-skill-platform-phase7-review-v1.md
- docs/image-skill-platform-phase8-scope-v1.md
- docs/image-skill-platform-phase8-backlog-v1.md
- docs/image-skill-platform-phase8-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 6. Agent E8 提示词

```text
你现在负责 Miastra 第八阶段开发里的 Agent E8：上线前回归与验收准备。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase8-release-hardening

任务目标：
让双模式、模板入口、回流链的异常态和回归准备更完整。

你负责的文件范围：
- src/pages/app/StudioPage.tsx
- src/pages/app/TemplatesPage.tsx
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 补齐关键异常态、空态、恢复态、降级态
2. 统一关键主流程的状态提示和恢复反馈
3. 为手工验收与发布前回归整理更稳状态
4. 优化最关键路径上的状态文案和反馈一致性

明确不要做的事：
- 不要扩新大型功能模块
- 不要重构整站导航
- 不要深改 contract 和 runtime 主干
- 不要只做视觉修饰而不提升回归稳定性

交付标准：
- 异常态和恢复态更完整
- 状态提示更统一
- 更适合上线前回归和手工验收

自测清单：
- 检查普通版、专业版、模板入口、回流链的异常态和空态
- 检查关键恢复态和降级态反馈
- 检查手工验收时最常见路径的状态稳定性

参考文档：
- docs/image-skill-platform-phase7-review-v1.md
- docs/image-skill-platform-phase8-scope-v1.md
- docs/image-skill-platform-phase8-backlog-v1.md
- docs/image-skill-platform-phase8-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 7. 推荐发送顺序

建议按这个顺序启动第八阶段多会话：

1. Agent A8
2. Agent B8
3. Agent C8
4. Agent D8
5. Agent E8

原因：

- 先做 contract 最终封口
- 再清 runtime 特例
- 再压版本流最后一轮高频效率
- 然后收边专业版连续决策链
- 最后补回归与验收准备
