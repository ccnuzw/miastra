# 图像 Skill 平台 V1 · 第四阶段复盘

## 文档说明

- 文档目标：基于第四阶段真实代码改动与阶段目标，整理“第四阶段已完成 / 已暴露问题 / 第五阶段建议”清单。
- 文档定位：承接 [image-skill-platform-phase4-scope-v1.md](./image-skill-platform-phase4-scope-v1.md) 和 [image-skill-platform-phase4-backlog-v1.md](./image-skill-platform-phase4-backlog-v1.md) 的阶段复盘文档。
- 当前状态：第四阶段复盘文档。
- 更新时间：2026-05-05。

## 1. 复盘结论先行

第四阶段的核心价值，不是继续增加几个结构点，而是把第三阶段已经出现的模板结构、轻量追问、版本链和专业版控制链，进一步压成更统一、更稳定的共享能力。

这一轮最明显的进展有四条：

- 模板、追问、执行、版本之间的共享场景语义继续被压实
- 轻量追问开始更像可扩展配置，而不是少量硬编码场景
- 版本链开始更接近多轮生产工作流，而不是只解释来源
- 模板页开始更明确地向 Skill 入口演进

一句话总结：

第三阶段让结构开始成立，第四阶段开始让结构更统一、更可扩展、更接近长期可维护的产品底盘。

## 2. 复盘依据

本次复盘主要基于以下实际代码改动与验收结果：

- [promptTemplate.schema.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.schema.ts)
- [promptTemplate.types.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.types.ts)
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
- 代码层面的类型、smoke 和生产构建均已通过

## 3. 第四阶段已完成

## 3.1 共享场景语义继续被压实

这是第四阶段最关键的推进。

当前已经具备：

- 模板结构字段与场景标签继续统一
- 模板 schema 和前台 scene 语义之间的映射更稳定
- 普通版任务入口、轻量追问、结果动作、版本回流之间的场景语言更一致

尤其是 [promptTemplate.schema.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.schema.ts) 和 [studioFlowSemantic.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/studioFlowSemantic.ts) 这一层，已经开始承担“统一场景语言”的角色，而不只是各页面自己命名。

这说明第四阶段没有停留在“再加几个字段”，而是在继续压缩语义分裂。

## 3.2 轻量追问更接近可扩展配置机制

第四阶段的轻量追问不再只是“首批场景能跑”。

当前已经具备：

- 模板字段上的 `guided` 选项定义更完整
- 首批高频场景的追问选项、默认值和补全语句更体系化
- 追问与场景模板之间的绑定关系更清楚
- 追问结果更容易写回工作台上下文

[consumerHomePresets.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-home/consumerHomePresets.ts) 的变化很关键，它说明：

- 追问开始更像配置对象
- 而不是继续增长成大量分散的页面逻辑

这让后续继续扩场景有了更好的落点。

## 3.3 版本链开始更接近生产工作流

第三阶段更多是把继续、重试、分叉这些动作语义立起来；第四阶段则更进一步，让这些动作更适合多轮创作。

当前已经具备：

- 更清楚的父节点、祖先节点和当前节点摘要
- 更清楚的版本来源说明
- 更强的模板、追问、参数与版本来源之间的联系
- 更适合多轮继续和分叉的回流表达

[workReplay.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.ts) 和新增的 [workReplay.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.test.ts) 很能说明这一点：

- 版本链不再只是“恢复一下”
- 而开始更像真正的生产链条

## 3.4 专业版开始更明确服务高频复用

第四阶段的专业版增强方向是对的：不是继续堆更多信息，而是更服务高频重跑、派生和结构复用。

当前已经具备：

- 模板上下文、来源上下文和最终 Prompt 的关系更清楚
- 参数快照与来源控制链的对应关系更强
- 模板基线、来源 Prompt、当前工作区三者之间的来回切换更明确

[StudioProPromptPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProPromptPanel.tsx) 里已经很明显：

- 专业版开始不只是“看”
- 而是在强调“回到模板基线”“恢复来源 Prompt”“回到当前工作区”

这说明专业版正在更像复用型工作台，而不是只读型控制台。

## 3.5 模板页开始更接近 Skill 入口集合

第四阶段的模板页不再只是“结构资源页”。

当前已经具备：

- 更明确的普通版入口 / 专业版入口区分
- 更明确的模板起稿、追问、结果动作、版本复用之间的关系说明
- 更明显的模板推荐模式和推荐入口表达

[TemplatesPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TemplatesPage.tsx) 现在已经在讲一件更大的事：

- 模板不只是内容
- 模板是在决定“该怎么进入工作台”

这是向 Skill 入口演进的一步。

## 3.6 测试和回归基础继续补强

第四阶段还有一个很重要的进展：

- 模板 schema 测试继续增强
- studio entry 测试继续增强
- 版本回流测试被补上
- 机器检查四项全部通过

这说明第四阶段不只是“结构更复杂了”，而是结构复杂度开始被纳入可验证范围。

## 4. 第四阶段已暴露问题

## 4.1 共享 schema 已经更统一，但仍然主要停留在前端域模型

第四阶段最大进展是统一场景 schema，但当前它仍然主要成立在前端代码层。

问题在于：

- 共享 schema 还没有成为更稳定的跨层数据契约
- 持久化、服务端、任务记录层还未完全跟进
- 某些映射仍然依赖前端适配逻辑

结论：

- 统一 schema 已经开始成立
- 但还没有真正变成“系统级契约”

## 4.2 轻量追问更像配置了，但还不是平台级追问系统

第四阶段解决的是“更容易扩展”，不是“已经平台化”。

当前仍然存在：

- 场景扩展还要手工补较多配置
- 追问结果到执行参数的映射仍有不少人工逻辑
- 追问和模板字段虽然更近了，但还没有完全自动联动

所以更准确的判断是：

- 轻量追问已经走向配置化
- 但还不是成熟的追问平台层

## 4.3 版本链更像生产流了，但多轮复杂创作仍偏文字摘要驱动

版本链的语义和回流已经明显变强，这是对的。

但当前问题也很清楚：

- 复杂多轮版本关系仍主要靠文字摘要解释
- 缺少更结构化的父子链消费能力
- 在高频专业场景里，仍可能出现“看得懂但不够快”的问题

这意味着：

- 版本流已经从“可理解”走向“可使用”
- 但还没有走到“高频生产下依然高效”

## 4.4 专业版复用增强了，但还缺更强的对照能力

第四阶段让专业版更适合复用和重跑，这一步是对的。

但当前还缺：

- 结构字段与最终 Prompt 的更强对照
- 当前版与来源版的更直接比较
- 参数快照之间更明确的差异感知

也就是说：

- 现在更适合复用
- 但还不够适合“比较后再复用”

## 4.5 模板页更像 Skill 入口了，但还没真正带起完整 Skill 运行心智

模板页已经更像 Skill 入口集合，但当前更多还是：

- 入口提示更明确
- 推荐模式更明确
- 进入策略更明确

还没有真正走到：

- 模板明确决定追问路径
- 模板明确决定执行策略
- 模板明确决定结果动作优先级

这会成为下一阶段继续深化的重点。

## 5. 第五阶段建议

## 5.1 第五阶段不应只继续补前台配置

到第四阶段为止，前台的模板、追问、版本和专业版复用链已经讲得足够清楚了。

第五阶段如果还主要做：

- 再多配几个场景
- 再多加几组入口
- 再补几条文案提示

价值会开始下降。

第五阶段更值得做的是，把当前前端已经较成熟的共享 schema 和机制，继续往系统级能力推进。

## 5.2 第五阶段最值得推进的 4 个方向

### 方向 1：共享 schema 向系统级契约推进

目标：

- 让模板、追问、执行、版本的共享对象不仅在前端成立，也更像稳定的数据契约

重点：

- 更稳定的结构对象边界
- 更少的前端适配层分裂
- 更适合后续持久化和服务端承接

### 方向 2：追问机制从配置化走向可组合化

目标：

- 让轻量追问不只“能配更多场景”，还更容易由模板字段自动组合

重点：

- 字段驱动问题生成
- 默认值和推荐值策略抽象
- 追问结果到执行链的更自动映射

### 方向 3：版本流从可用走向高频高效

目标：

- 让多轮继续、重试、分叉在高频生产场景下也能更快理解和更快操作

重点：

- 更结构化的版本节点摘要
- 更快的来源判断
- 更直接的多轮派生心智

### 方向 4：专业版从复用工作台走向对照工作台

目标：

- 让专业版不只是更适合复用，还更适合比较、校准和派生

重点：

- 结构字段与 Prompt 的对照
- 当前版与来源版的对照
- 参数快照之间的更强比较能力

## 5.3 第五阶段最值得优先做的 6 个任务

1. 把当前共享 schema 继续收敛成更稳定的系统级契约
2. 让追问定义更容易由模板字段自动组合
3. 强化追问结果到执行参数和结果动作的自动映射
4. 强化多轮版本链的结构化节点摘要
5. 让专业版具备更强的“当前版 vs 来源版”对照能力
6. 让模板更明确决定追问路径、进入策略和结果动作优先级

## 6. 第四阶段总结

第四阶段是一个很重要的“统一阶段”。

如果说第三阶段解决的是：

- 模板开始结构化
- 追问开始正式化
- 版本开始工作流化
- 专业版开始结构承载化

那么第四阶段解决的是：

- 这些结构开始更统一
- 这些能力开始更可扩展
- 这些链路开始更像长期可维护的底盘

从当前结果看，这条路仍然是对的，而且已经进入一个新的阶段：

- 不再只是前台讲得通
- 而是底层共享能力开始更稳定

下一阶段最重要的，就不该再只是“多做几个功能点”，而是继续把这些统一能力推进成更强、更稳、更系统级的产品底盘。
