# 图像 Skill 平台 V1 · 第五阶段多 Agent 可复制任务提示词

## 文档说明

- 文档目标：提供可直接复制发送给第五阶段多会话 / 多 Agent 的单独任务提示词。
- 文档定位：承接 [image-skill-platform-phase5-agent-briefs-v1.md](./image-skill-platform-phase5-agent-briefs-v1.md) 的实操提示词文档。
- 当前状态：第五阶段可执行提示词文档。
- 更新时间：2026-05-05。

## 1. 使用说明

使用方式延续前四阶段：

1. 先确保当前总分支仍是 `feature/image-skill-platform-v1`
2. 为每个 Agent 从总分支切对应第五阶段子分支
3. 把下面对应 Agent 的整段提示词直接复制发送
4. 要求每个 Agent 只改自己负责的文件范围
5. 每个 Agent 完成后先汇报改动文件、自测结果和剩余风险

统一要求：

- 你不是独自在仓库里工作
- 不要回滚别人改动
- 只在自己负责范围内改动
- 如果发现现有状态已经变化，要适配现状，不要强行覆盖
- 完成后必须说明改了哪些文件、做了哪些自测、还有什么风险
- 第五阶段不要只补更多配置项，尽量补共享契约和高频主流程效率

## 2. Agent A5 提示词

```text
你现在负责 Miastra 第五阶段开发里的 Agent A5：共享契约深化。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase5-shared-contract

任务目标：
让模板、追问、执行、版本之间的共享对象更接近稳定系统契约，减少桥接层和重复映射。

你负责的文件范围：
- src/features/prompt-templates/*
- src/features/studio-consumer/*
- src/features/studio-pro/*
- src/features/generation/*
- src/features/works/workReplay.ts

你的核心任务：
1. 收口共享对象边界和字段约束
2. 清理重复桥接和重复映射
3. 强化结构对象在主流程和历史回流中的一致性
4. 为后续持久化和服务端承接预留更稳接口

明确不要做的事：
- 不要重构后端或数据库
- 不要为了“更纯”而打断现有主流程
- 不要引入大而全的新中台层
- 不要回滚第四阶段已有共享字段工作

交付标准：
- 共享对象边界更清楚
- 桥接和重复映射明显减少
- 主流程和回流链中的结构对象更一致

自测清单：
- 检查模板、追问、执行、版本的核心对象边界
- 验证同一结构对象在主流程和回流链中语义一致
- 确认没有新增命名分裂

参考文档：
- docs/image-skill-platform-phase4-review-v1.md
- docs/image-skill-platform-phase5-scope-v1.md
- docs/image-skill-platform-phase5-backlog-v1.md
- docs/image-skill-platform-phase5-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 3. Agent B5 提示词

```text
你现在负责 Miastra 第五阶段开发里的 Agent B5：追问机制可组合化。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase5-guided-flow-composition

任务目标：
让轻量追问更容易由模板字段、场景和默认策略自动组合，而不是主要依赖手工定义。

你负责的文件范围：
- src/features/studio-home/*
- src/features/studio-consumer/*
- src/features/prompt-templates/*
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 强化字段驱动问题生成
2. 抽象默认值和推荐值策略
3. 强化追问结果到 Prompt、结果动作、回流状态的自动映射
4. 在控制范围内扩展更多高频场景

明确不要做的事：
- 不要做复杂自由对话
- 不要重构专业版控制区
- 不要引入另一套完全独立的追问系统
- 不要回退成继续堆散点硬编码

交付标准：
- 字段与追问生成关系更直接
- 新场景接入追问的手工成本进一步下降
- 追问结果到主流程的映射更自动更稳定

自测清单：
- 触发多个场景的追问
- 检查字段驱动组合是否生效
- 检查追问结果到输入区、生成态、结果动作、回流状态的映射

参考文档：
- docs/image-skill-platform-phase4-review-v1.md
- docs/image-skill-platform-phase5-scope-v1.md
- docs/image-skill-platform-phase5-backlog-v1.md
- docs/image-skill-platform-phase5-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 4. Agent C5 提示词

```text
你现在负责 Miastra 第五阶段开发里的 Agent C5：版本流高频效率增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase5-version-efficiency

任务目标：
让版本链在高频多轮创作中，不只是能理解，而且能更快消费、更快切换和更快继续。

你负责的文件范围：
- src/features/works/workReplay.ts
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx
- src/features/studio-consumer/*
- src/features/studio-pro/*

你的核心任务：
1. 强化更结构化的节点摘要
2. 强化高频多轮回流下的来源判断
3. 强化模板、追问、参数与版本节点的显式对应关系
4. 优化普通版和专业版对多轮版本流的消费效率

明确不要做的事：
- 不要做复杂图谱
- 不要引入重量级多版本管理器
- 不要重构模板结构层
- 不要开始做完整 diff 面板

交付标准：
- 多轮版本流更快理解
- 高级用户连续派生时心智更稳
- 版本节点与模板、追问、参数联系更显式

自测清单：
- 连续进行多轮继续、重试、分叉
- 从作品页和任务页分别高频回流
- 检查来源判断和节点摘要是否更快被理解

参考文档：
- docs/image-skill-platform-phase4-review-v1.md
- docs/image-skill-platform-phase5-scope-v1.md
- docs/image-skill-platform-phase5-backlog-v1.md
- docs/image-skill-platform-phase5-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 5. Agent D5 提示词

```text
你现在负责 Miastra 第五阶段开发里的 Agent D5：专业版对照与校准增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase5-pro-compare

任务目标：
让专业版更适合比较、校准和派生，而不只是复用当前已有基线。

你负责的文件范围：
- src/features/studio-pro/*
- src/features/studio/*
- src/pages/app/StudioPage.tsx

你的核心任务：
1. 强化结构字段与 Prompt 的对照表达
2. 强化当前版与来源版的对照表达
3. 强化参数快照的校准和提示能力
4. 强化专业版中的对照、派生和复用共存体验

明确不要做的事：
- 不要污染普通版任务流
- 不要重构版本链底层语义
- 不要开始做完整实验台
- 不要新增大量只读信息而无校准价值

交付标准：
- 专业版更适合做对照和校准
- 来源版与当前版关系更直观
- 参数快照更有比较价值

自测清单：
- 在专业版里做一次来源版对照
- 检查结构字段与 Prompt 的对照表达
- 检查参数快照是否更有校准和比较价值

参考文档：
- docs/image-skill-platform-phase4-review-v1.md
- docs/image-skill-platform-phase5-scope-v1.md
- docs/image-skill-platform-phase5-backlog-v1.md
- docs/image-skill-platform-phase5-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 6. Agent E5 提示词

```text
你现在负责 Miastra 第五阶段开发里的 Agent E5：模板 Skill 运行意图增强。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/phase5-template-skill-runtime

任务目标：
让模板更明确决定追问路径、进入方式和结果动作优先级，进一步接近真正运行中的 Skill 单元。

你负责的文件范围：
- src/pages/app/TemplatesPage.tsx
- src/features/prompt-templates/*
- src/pages/app/StudioPage.tsx
- src/features/studio-consumer/*

你的核心任务：
1. 强化模板对追问路径的影响
2. 强化模板对普通版 / 专业版进入策略的影响
3. 强化模板对结果动作优先级和默认分支的影响
4. 让模板页更像运行中的 Skill 入口集合

明确不要做的事：
- 不要做 Skill 市场系统
- 不要重构整站导航
- 不要深改版本链底层逻辑
- 不要新增大量只读入口说明而无运行价值

交付标准：
- 模板更明确决定追问路径和进入方式
- 模板对结果动作的优先级影响更清楚
- 模板页更像运行中 Skill 的入口集合

自测清单：
- 从模板进入普通版和专业版
- 检查模板是否更清楚影响追问路径和默认动作
- 检查模板与结果动作优先级是否更一致

参考文档：
- docs/image-skill-platform-phase4-review-v1.md
- docs/image-skill-platform-phase5-scope-v1.md
- docs/image-skill-platform-phase5-backlog-v1.md
- docs/image-skill-platform-phase5-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 7. 推荐发送顺序

建议按这个顺序启动第五阶段多会话：

1. Agent A5
2. Agent B5
3. Agent C5
4. Agent D5
5. Agent E5

原因：

- 先把共享契约继续压实
- 再让追问走向字段驱动组合
- 再增强高频版本流效率
- 然后补专业版对照与校准
- 最后让模板更进一步承接 Skill 运行意图
