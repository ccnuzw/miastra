# 图像 Skill 平台 V1 · 第五阶段复盘

## 文档说明

- 文档目标：基于第五阶段真实代码改动与阶段目标，整理“第五阶段已完成 / 已暴露问题 / 第六阶段建议”清单。
- 文档定位：承接 [image-skill-platform-phase5-scope-v1.md](./image-skill-platform-phase5-scope-v1.md) 和 [image-skill-platform-phase5-backlog-v1.md](./image-skill-platform-phase5-backlog-v1.md) 的阶段复盘文档。
- 当前状态：第五阶段复盘文档。
- 更新时间：2026-05-05。

## 1. 复盘结论先行

第五阶段的核心价值，不是再补几个场景或几个入口，而是让前四阶段已经逐步成形的共享对象、追问机制、版本流和模板运行语义，开始更像稳定的系统能力。

这一轮最明显的进展有四条：

- 共享契约开始从前端域模型走向更清晰的运行时契约
- 轻量追问开始更接近字段驱动和模板驱动的组合机制
- 版本链开始更明确地消费 generation contract，而不只是读页面状态
- 模板开始更接近真正会驱动运行路径的 Skill 单元

一句话总结：

第四阶段让结构更统一，第五阶段开始让统一后的结构更像系统契约，而不只是页面之间的约定。

## 2. 复盘依据

本次复盘主要基于以下实际代码改动与验收结果：

- [generation.contract.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.contract.ts)
- [generation.request.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.request.ts)
- [generation.types.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.types.ts)
- [promptTemplate.schema.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.schema.ts)
- [promptTemplate.runtime.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.runtime.ts)
- [promptTemplate.presentation.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.presentation.ts)
- [promptTemplate.studioEntry.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.studioEntry.ts)
- [studioFlowSemantic.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/studioFlowSemantic.ts)
- [consumerHomePresets.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-home/consumerHomePresets.ts)
- [consumerGuidedFlow.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/consumerGuidedFlow.ts)
- [ConsumerResultActions.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/ConsumerResultActions.tsx)
- [workReplay.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.ts)
- [workReplay.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.test.ts)
- [StudioProExecutionPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProExecutionPanel.tsx)
- [StudioProParameterPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProParameterPanel.tsx)
- [StudioProPromptPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProPromptPanel.tsx)
- [studioPro.utils.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/studioPro.utils.ts)
- [TemplatesPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TemplatesPage.tsx)
- [StudioPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/StudioPage.tsx)
- [TasksPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TasksPage.tsx)
- [WorksPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/WorksPage.tsx)

以及这轮已经通过的检查：

- `git diff --check`
- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

补充说明：

- 这轮集成检查未发现阻塞性冲突
- 第五阶段代码层面的类型、smoke 和生产构建均已通过

## 3. 第五阶段已完成

## 3.1 generation contract 已经开始形成统一运行契约

这是第五阶段最关键的进展。

当前已经具备：

- 统一的 generation contract snapshot
- request prompt / workspace prompt / mode / size / quality / model / provider / stream 的统一封装
- guided flow、references、draw 等上下文进入同一 contract
- 从旧 snapshot 向 contract 统一解析的兼容层

[generation.contract.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.contract.ts) 的意义很大：

- 前几阶段更多是在前台层约定结构
- 第五阶段开始有了更明确的运行时契约对象

这说明系统不再只是“页面彼此理解”，而开始具备更稳的执行中间层。

## 3.2 模板 runtime 开始真正驱动追问和动作优先级

第五阶段另一个关键进展，是模板不再只是结构字段和展示信息。

当前已经具备：

- 模板默认追问快照生成
- 模板默认 follow-up 摘要
- 模板 action priority
- 模板 default action
- 模板 entry mode / entry intent 与 runtime 的联动

[promptTemplate.runtime.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.runtime.ts) 说明模板开始真正参与运行：

- 模板不只是告诉页面“应该长什么样”
- 模板开始决定“应该怎么跑”

这正是从结构模板走向 Skill 单元的关键一步。

## 3.3 追问机制更接近字段驱动组合

第五阶段的轻量追问不再只是“配置更多问题”，而是在往更强的字段驱动组合推进。

当前已经具备：

- 模板字段上的 guided 定义继续增强
- question title、default option、semantic field、selection source 等信息更完整
- consumer home presets 与模板字段关系更紧
- 追问结果对场景、Prompt 和动作的影响路径更清楚

[consumerHomePresets.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-home/consumerHomePresets.ts) 和 [consumerGuidedFlow.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/consumerGuidedFlow.ts) 的组合说明：

- 追问开始不只是“页面提示”
- 而是在往“字段驱动的补全过程”推进

## 3.4 版本流开始消费 contract，而不只是页面摘要

第五阶段的版本流增强，不再只是多写几段摘要文案。

当前已经具备：

- work replay 基于 contract 解析 references、scene、prompt、parameters
- 版本来源与 request kind / quality / draw / stream / reference count 等关系更清楚
- 版本节点与模板、追问、参数之间联系更结构化
- 对应测试也同步增强

[workReplay.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.ts) 现在的作用，已经更像真正的“版本回流解释层”。

这说明版本流开始从“页面恢复链”走向“运行上下文恢复链”。

## 3.5 专业版开始从复用工作台走向对照工作台

第五阶段的专业版增强方向是对的：开始更明显地支持对照和校准。

当前已经具备：

- prompt field mapping
- comparison status / comparison item / comparison summary
- current vs baseline 的文本比较能力
- 模板结构字段与 Prompt 锚点的对应关系

[studioPro.utils.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/studioPro.utils.ts) 已经在输出一套更像“对照工作台”的数据结构。

这意味着专业版正在从“更会复用”走向“更会判断和校准”。

## 3.6 模板页更接近运行中的 Skill 入口集合

第五阶段模板页继续往前推进了一步。

当前已经具备：

- 可直接挂模板追问的模板统计
- 模板默认追问路径的表达
- 模板起稿、追问、结果动作、版本语义之间更强的串联说明
- 普通版和专业版进入路径更明确

[TemplatesPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TemplatesPage.tsx) 现在已经不是“模板说明页”，而更像“Skill 入口集合页”。

## 3.7 测试覆盖继续补到了真正关键的新层

第五阶段还有一个很重要的进展：

- generation contract 测试被新增
- prompt template runtime 测试被新增
- schema / studio entry / work replay 测试继续增强
- 机器检查四项全部通过

这说明第五阶段新增的不是脆弱能力，而是开始被测试约束住的系统层能力。

## 4. 第五阶段已暴露问题

## 4.1 共享契约已经出现，但仍然主要是前端运行时契约

第五阶段最大的进展是 contract 层出现了，但当前它仍然主要服务于前端运行时。

问题在于：

- 它还没有真正变成跨前后端、跨任务记录层的统一契约
- 仍然存在部分旧结构兼容和回填逻辑
- 历史数据与新 contract 的关系仍然偏适配层

结论：

- 契约已经出现
- 但还没有成为真正的全链路契约

## 4.2 模板 runtime 已成立，但 runtime 决策仍然偏轻

模板已经开始能驱动追问和动作优先级，这是对的。

但当前仍然存在：

- runtime 决策还主要是前台默认行为
- 模板对执行策略的主导还不够深
- 模板对结果动作分支的控制还可以更细

所以更准确地说：

- 模板已经开始进入运行态
- 但还没有完全成为“运行单元”

## 4.3 追问机制更可组合了，但自动化程度还不够高

第五阶段开始让字段驱动组合更明确，但当前仍有这些问题：

- 问题生成还不是高度自动的
- 默认策略和推荐策略仍有不少手工配置
- 追问结果到执行参数的联动仍可继续深化

也就是说：

- 追问已经不只是配置化
- 但还没有真正走到“自动组合优先”

## 4.4 版本流更高频了，但复杂专业链路仍然缺更直观的对照消费

版本流已经更像高频工作流，但当前复杂场景仍主要依赖：

- 结构化摘要
- 来源判断
- 多字段描述

缺少的还是：

- 更直观的来源对照
- 更快的节点差异消费
- 更直接的“这一版到底比上一版改了什么”的辅助

## 4.5 专业版对照链已起步，但还没到真正高强度生产控制台

专业版现在比前几轮明显更成熟了，但还没到终局：

- 对照链已经有了
- 校准链已经有了
- 但复杂生产场景下还需要更强的差异消费和快速决策支持

换句话说：

- 它已经不是单纯控制台
- 但还没到高强度专业生产工具

## 5. 第六阶段建议

## 5.1 第六阶段不应主要继续扩前台功能面

到第五阶段为止，前台的模板、追问、版本和专业版链路已经足够厚了。

第六阶段如果继续主要做：

- 再多几个入口
- 再多几个模板场景
- 再多几组提示文案

收益会明显下降。

第六阶段更值得做的是，把当前已出现的运行契约、runtime 决策、版本链和专业版对照链，继续往“真正系统层能力”推进。

## 5.2 第六阶段最值得推进的 4 个方向

### 方向 1：contract 继续向全链路契约推进

目标：

- 让 generation contract 更像统一的数据主干，而不是前端运行时适配层

重点：

- 更少的旧结构兼容分叉
- 更稳定的历史记录消费方式
- 更清晰的 contract 对持久化和任务链的承接

### 方向 2：runtime 决策更明确、更深

目标：

- 让模板不只是附带默认追问，而是真正决定更多运行时路径

重点：

- 模板对追问路径、进入方式、结果动作优先级的更强控制
- 模板对不同模式和来源的决策能力增强

### 方向 3：版本流从结构化摘要走向更强差异消费

目标：

- 让版本流不仅能解释来源，还更容易看出关键变化和派生差异

重点：

- 更直观的结构变化摘要
- 更快的父子差异判断
- 更高频的专业场景消费效率

### 方向 4：专业版从对照工作台走向校准决策工作台

目标：

- 让专业版不仅能对照，还能更快帮助用户决定下一步该怎么改、该从哪一版派生

重点：

- 更强的 field-to-prompt 对照
- 更强的 current-vs-source 对照
- 更强的参数校准建议

## 5.3 第六阶段最值得优先做的 6 个任务

1. 继续减少 contract 与旧结构之间的桥接分裂
2. 让模板 runtime 更明确决定追问和动作分支
3. 强化追问结果到 contract 和执行参数的承接
4. 强化版本节点的结构化差异摘要
5. 强化专业版对照链里的校准和决策支持
6. 让模板更明显成为“运行中的 Skill 单元”，而不是带说明的结构模板

## 6. 第五阶段总结

第五阶段是一个非常关键的“系统化阶段”。

如果说前几阶段主要在做：

- 双模式工作台成立
- 模板结构化
- 追问正式化
- 版本工作流化
- schema 统一化

那么第五阶段开始做的是：

- contract 化
- runtime 化
- 对照化

从当前结果看，这条路还是对的，而且产品已经明显不再只是“一个前台工作台”，而是在长成一套真正的图像 Skill 运行系统。
