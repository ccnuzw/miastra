# 图像 Skill 平台 V1 · 第三阶段复盘

## 文档说明

- 文档目标：基于第三阶段真实代码改动与阶段目标，整理“第三阶段已完成 / 已暴露问题 / 第四阶段建议”清单。
- 文档定位：承接 [image-skill-platform-phase3-scope-v1.md](./image-skill-platform-phase3-scope-v1.md) 和 [image-skill-platform-phase3-backlog-v1.md](./image-skill-platform-phase3-backlog-v1.md) 的阶段复盘文档。
- 当前状态：第三阶段复盘文档。
- 更新时间：2026-05-05。

## 1. 复盘结论先行

第三阶段的核心价值，不是把页面再做得顺一点，而是让过去两阶段已经在前台被讲出来的产品承诺，开始具备真正的结构化底座。

这一轮最明显的进展有四条：

- 模板开始真正拥有结构字段和场景元信息
- 轻量追问开始从引导提示升级到可保存的正式输入快照
- 版本链开始从“来源说明”升级到“继续 / 重试 / 分叉”的动作语义
- 专业版开始更清楚地表达模板、Prompt、参数、Provider、来源之间的关系

一句话总结：

第一阶段让工作台站起来，第二阶段让工作台更像产品，第三阶段开始让它有真正可持续演进的结构底盘。

## 2. 复盘依据

本次复盘主要基于以下实际代码改动与验收结果：

- [promptTemplate.schema.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.schema.ts)
- [promptTemplate.types.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.types.ts)
- [promptTemplate.presentation.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.presentation.ts)
- [promptTemplate.studioEntry.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.studioEntry.ts)
- [studioFlowSemantic.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/studioFlowSemantic.ts)
- [consumerGuidedFlow.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/consumerGuidedFlow.ts)
- [ConsumerTaskEntrySection.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-home/ConsumerTaskEntrySection.tsx)
- [ConsumerResultActions.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/ConsumerResultActions.tsx)
- [workReplay.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.ts)
- [StudioProExecutionPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProExecutionPanel.tsx)
- [StudioProParameterPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProParameterPanel.tsx)
- [StudioProPromptPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProPromptPanel.tsx)
- [studioPro.utils.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/studioPro.utils.ts)
- [StudioPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/StudioPage.tsx)
- [TemplatesPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TemplatesPage.tsx)
- [WorksPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/WorksPage.tsx)
- [TasksPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TasksPage.tsx)

以及这轮已经通过的检查：

- `git diff --check`
- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

## 3. 第三阶段已完成

## 3.1 模板开始真正拥有结构化基础

这是第三阶段最重要的一步。

当前已经具备：

- 模板场景、家族、推荐模式等元信息
- 模板字段定义与字段摘要能力
- 模板默认参数的结构化表达
- 模板展示层和工作台入口层之间更明确的结构映射

尤其是 [promptTemplate.schema.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.schema.ts) 这一层，说明模板已经不再只是“存一段 Prompt”，而开始成为前端可以消费的结构对象。

这意味着模板页、工作台入口、专业版上下文终于有了一层共同的结构基础。

## 3.2 轻量追问已经从提示升级成了正式快照

第二阶段的追问还更像“补一句提示”，第三阶段已经往正式输入链迈进了一步。

当前已经具备：

- 追问步骤快照结构
- 问题、选项、顺序和摘要结果
- 追问结果的状态保存和读取基础
- 追问结果回写工作台上下文的路径

[consumerGuidedFlow.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/consumerGuidedFlow.ts) 虽然还很轻，但它的意义很大：

- 追问开始可保存
- 追问开始可回放
- 追问开始不再只是一次性 UI 状态

这说明普通版的“系统帮你补全”终于开始有真正的结构支撑。

## 3.3 版本链开始从“来源提示”升级到动作语义

第三阶段另一条明显推进的线，是版本工作流。

当前已经具备：

- `continue-version`
- `retry-version`
- `branch-version`

这三类更明确的动作语义。

从 [workReplay.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.ts) 可以看到：

- 版本来源类型已经被统一得更清楚
- 父节点摘要和来源说明开始具备稳定表达
- 作品回流和任务回流已经更像真实工作流，而不是简单恢复参数

这一轮的关键不是“又加了几个按钮”，而是版本关系终于开始具备产品语义。

## 3.4 专业版更像真正的控制链承载面

第三阶段的专业版并没有盲目加更多参数，而是开始把结构模板、Prompt、参数、Provider 和来源上下文串起来。

当前已经具备：

- 结构模板上下文展示
- 模板结构状态与字段摘要
- Prompt、参数和 Provider 之间更清晰的对应关系
- 来源版本和当前执行关系的更强解释力

例如 [studioPro.utils.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/studioPro.utils.ts) 已经开始输出：

- 模板上下文
- 复跑来源上下文
- Prompt 预览结构

这意味着专业版正在从“控制面板”走向“带结构解释的控制工作台”。

## 3.5 普通版、模板页、结果页开始说同一种场景语言

这一点虽然不如 schema 显眼，但很重要。

当前已经具备：

- 模板场景到工作台流转的更统一语义
- 结果动作和模板入口之间更清晰的动作命名
- 工作台、模板页、版本回流之间更接近同一套场景表达

这说明第三阶段已经开始处理一个更难的问题：

- 不是某个页面更好看
- 而是不同页面开始说同一种产品语言

## 3.6 结构化能力已经开始具备测试落点

第三阶段还有一个很重要但容易被忽略的进展：

- 新增了结构模板相关测试
- 新增了入口语义相关测试
- 相关 smoke、typecheck、build 都通过

这意味着第三阶段不只是“想法成立”，而是已经开始变成可验证、可持续维护的代码能力。

## 4. 第三阶段已暴露问题

## 4.1 结构已经起步，但还远没有形成统一 schema

第三阶段最大的进展是结构化，但当前结构仍然主要体现在前端状态层和展示层。

问题在于：

- 模板结构、追问结果、执行参数、版本上下文之间还不是完整统一 schema
- 有些地方仍然依赖适配层映射，而不是天然统一
- 前台语义虽然越来越一致，但数据层仍有分段感

结论：

- 第三阶段已经把结构“做出来了”
- 但还没有把结构“彻底打通”

## 4.2 轻量追问已成立，但覆盖范围仍然非常有限

第三阶段解决的是“有没有正式追问链”，不是“追问是否已经全面成熟”。

当前问题包括：

- 仍然只覆盖少量高频场景
- 问题顺序和字段策略还偏手工定义
- 追问和模板字段虽然开始连接，但还不够深
- 追问结果对最终 Prompt 和结果动作的影响链还可继续增强

所以现在更准确的判断是：

- 轻量追问已经正式化
- 但还没平台化

## 4.3 版本工作流更清楚了，但还没到“稳定生产流”

第三阶段把版本动作命名和回流语义理顺了很多，这是对的。

但当前还缺：

- 更明确的父子版本可视表达
- 更直接的参数差异或结构差异辅助
- 更稳定的多轮分叉和回退心智

也就是说：

- 版本已经不是“只能看来源”
- 但还没到“高频生产用户可以稳定管理版本树”

## 4.4 专业版控制链增强了，但与普通版的协同边界还可再压

专业版现在明显更有控制力了，但新的问题也出现了：

- 普通版与专业版之间共享的结构能力越来越多
- 两边的表达层和控制层开始出现交汇
- 如果后面不继续收边界，专业版可能再次把普通版拖复杂

所以第四阶段不能只继续往专业版堆能力，还要继续守住：

- 普通版仍然任务导向
- 专业版才是结构控制导向

## 4.5 模板页已经开始像“能力入口”，但还没有完全变成“Skill 入口”

第三阶段让模板页更像结构模板库，这是好事。

但当前仍然有一个明显边界：

- 模板已经是结构化模板
- 但还没有完全升级成 Skill 入口和执行策略入口

这会成为下一阶段的重要问题：

- 模板是否要继续只表达结构
- 还是要开始承接更明确的执行意图和模式策略

## 5. 第四阶段建议

## 5.1 第四阶段不应回到表层优化

到第三阶段为止，产品已经跨过了“页面像不像产品”的阶段。

第四阶段如果还主要做：

- 文案再修一点
- 视觉再顺一点
- 面板再调一点

价值会明显下降。

第四阶段应继续沿着第三阶段打开的结构能力往下走。

## 5.2 第四阶段最值得推进的 4 个方向

### 方向 1：统一场景 schema 继续深化

目标：

- 让模板结构、追问结果、执行参数、版本上下文进一步共享统一对象

重点：

- 统一字段命名
- 统一场景 ID 和入口参数
- 减少适配层分裂

### 方向 2：轻量追问从“首批场景”走向“可扩展机制”

目标：

- 把当前已成立的追问快照和问题顺序，升级成更容易扩展到更多场景的机制

重点：

- 追问配置化
- 模板字段与追问字段更稳定映射
- 追问结果对 Prompt 和结果动作的影响更直接

### 方向 3：版本链从动作语义走向更强的生产工作流

目标：

- 让继续、重试、分叉不仅能看懂，还能更稳定支持多轮创作

重点：

- 更清楚的父节点摘要
- 更清楚的结构来源提示
- 更强的多轮回流和派生心智

### 方向 4：专业版开始为“高频复用”服务

目标：

- 让专业版不只是解释当前执行，还更能服务反复复用、反复重跑和结构化对照

重点：

- 模板结构上下文继续增强
- Prompt 与结构字段的对应关系更强
- 参数快照和复跑入口更成熟

## 5.3 第四阶段最值得优先做的 6 个任务

1. 统一模板、追问、执行、版本的共享场景 schema
2. 让追问配置更容易扩展到更多高频场景
3. 增强追问结果到 Prompt 和结果动作的映射闭环
4. 让版本链具备更稳定的父子节点摘要和多轮分叉语义
5. 让专业版更明确展示结构字段与最终执行之间的对应关系
6. 继续守住普通版与专业版的边界，避免结构能力回流成普通版负担

## 6. 第三阶段总结

第三阶段是一个很关键的分水岭。

如果说前两阶段主要解决的是：

- 有没有工作台
- 双模式像不像产品

那么第三阶段开始解决的是：

- 这个产品背后有没有真正的结构化能力

从当前结果看，这条路是对的，而且已经跨出了最难的第一步：

- 模板开始结构化
- 追问开始正式化
- 版本开始工作流化
- 专业版开始结构承载化

下一阶段的重点，就不该再是“做更多页面”，而是把这些结构真正打通、扩展并稳定下来。
