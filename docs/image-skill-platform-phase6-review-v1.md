# 图像 Skill 平台 V1 · 第六阶段复盘

## 文档说明

- 文档目标：基于第六阶段真实代码改动与阶段目标，整理“第六阶段已完成 / 已暴露问题 / 第七阶段建议”清单。
- 文档定位：承接 [image-skill-platform-phase6-scope-v1.md](./image-skill-platform-phase6-scope-v1.md) 和 [image-skill-platform-phase6-backlog-v1.md](./image-skill-platform-phase6-backlog-v1.md) 的阶段复盘文档。
- 当前状态：第六阶段复盘文档。
- 更新时间：2026-05-05。

## 1. 复盘结论先行

第六阶段的核心价值，不是再补更多结构说明，而是让第五阶段已经出现的 contract、runtime、版本差异消费和专业版对照能力，更深地接管真实运行主流程。

这一轮最明显的进展有四条：

- generation contract 更接近统一主干契约，而不只是执行中间层
- 模板 runtime 更明显地开始主导追问路径、入口策略和结果动作优先级
- 版本流开始从“能回流”走向“能更快看出这版改了什么”
- 专业版开始从对照面板走向更像校准决策台

一句话总结：

第五阶段让系统开始 contract 化和 runtime 化，第六阶段开始让这些 contract 和 runtime 真正更深地接管主流程。

## 2. 复盘依据

本次复盘主要基于以下实际代码改动与验收结果：

- [generation.contract.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.contract.ts)
- [generation.contract.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.contract.test.ts)
- [generation.request.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.request.ts)
- [generation.types.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.types.ts)
- [useGenerationFlow.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/useGenerationFlow.ts)
- [promptTemplate.runtime.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.runtime.ts)
- [promptTemplate.runtime.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.runtime.test.ts)
- [promptTemplate.presentation.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.presentation.ts)
- [promptTemplate.studioEntry.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.studioEntry.ts)
- [promptTemplate.studioEntry.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.studioEntry.test.ts)
- [consumerGuidedFlow.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/consumerGuidedFlow.ts)
- [ConsumerResultActions.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/ConsumerResultActions.tsx)
- [consumerHomePresets.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-home/consumerHomePresets.ts)
- [StudioProExecutionPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProExecutionPanel.tsx)
- [StudioProParameterPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProParameterPanel.tsx)
- [StudioProPromptPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProPromptPanel.tsx)
- [studioPro.utils.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/studioPro.utils.ts)
- [workReplay.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.ts)
- [workReplay.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.test.ts)
- [StudioPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/StudioPage.tsx)
- [TemplatesPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TemplatesPage.tsx)
- [TasksPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TasksPage.tsx)
- [WorksPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/WorksPage.tsx)

以及这轮已经通过的检查：

- `git diff --check`
- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

补充说明：

- 这轮集成检查未发现阻塞性冲突
- 第六阶段代码层面的类型、smoke 和生产构建均已通过

## 3. 第六阶段已完成

## 3.1 generation contract 更接近统一主干契约

这是第六阶段最关键的进展。

当前已经具备：

- request、flow、gallery image、replay snapshot 对 contract 的消费更加统一
- contract 对 scene、prompt、parameters、guidedFlow、references、draw 的主干地位更明确
- 旧 snapshot 到新 contract 的兼容桥接继续收缩
- generation 请求构建与执行路径更像围绕 contract 进行

[generation.contract.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.contract.ts)、[generation.request.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.request.ts) 和 [useGenerationFlow.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/useGenerationFlow.ts) 的组合说明：

- contract 已经不只是“保存一下上下文”
- 而开始更像真实运行主干

## 3.2 模板 runtime 更深地开始主导追问、入口和结果动作

第六阶段另一个关键进展，是模板 runtime 不再只是决定默认值，而开始更明显地主导流程分支。

当前已经具备：

- 模板对普通版 / 专业版进入方式的影响更直接
- 模板对追问路径和 follow-up 摘要的主导更明确
- 模板对结果动作优先级和默认动作的影响更明显
- 模板页已更明显展示 runtime 语义，而不只是展示模板内容

[promptTemplate.runtime.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.runtime.ts)、[promptTemplate.presentation.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.presentation.ts) 和 [promptTemplate.studioEntry.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.studioEntry.ts) 一起表明：

- 模板已经越来越像运行中的 Skill 决策器
- 而不是单纯的模板说明对象

## 3.3 普通版轻量追问与结果动作的 runtime 关联更强

第六阶段的普通版增强，不是继续加几个问题，而是让追问和结果动作更明确挂到 runtime 决策上。

当前已经具备：

- `consumerGuidedFlow` 继续增强，追问快照与 loop 状态关系更紧
- 首页 preset、模板入口和结果动作之间的承接更明确
- 结果动作更能消费当前 guided flow / runtime 决策上下文
- 场景入口到生成主流程之间的 contract 承接更稳

[consumerGuidedFlow.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/consumerGuidedFlow.ts)、[ConsumerResultActions.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/ConsumerResultActions.tsx) 和 [consumerHomePresets.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-home/consumerHomePresets.ts) 的组合说明：

- 轻量追问已经不只是提示层
- 而更像 runtime 主流程中的一段正式状态

## 3.4 版本流开始更强调“这一版改了什么”

第六阶段的版本链增强方向是对的：开始从“能恢复上下文”走向“能更快看懂变化点”。

当前已经具备：

- 更完整的 delta headline、delta items、source delta label
- 当前节点、父节点、来源节点之间的差异消费更明确
- 普通版和专业版都开始消费更结构化的版本差异信息
- Works / Tasks 的回流提示更像高频生产下的“下一步操作说明”

[workReplay.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.ts) 和 [workReplay.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/works/workReplay.test.ts) 现在的作用，已经更像真正的“版本差异解释层”。

## 3.5 专业版开始更像校准决策台

第六阶段的专业版，不只是继续加更多信息，而是让信息更服务于“下一步该怎么改”。

当前已经具备：

- prompt、参数、执行信息和来源版的对照表达继续增强
- current-vs-source、field-to-prompt、parameter calibration 等表达更完整
- 专业版执行区开始更明确承接 replay delta、delta items、node path 等高频判断信息
- 派生与重跑决策比前一阶段更像“下一步建议”

[StudioProPromptPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProPromptPanel.tsx)、[StudioProParameterPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProParameterPanel.tsx)、[StudioProExecutionPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProExecutionPanel.tsx) 和 [studioPro.utils.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/studioPro.utils.ts) 一起说明：

- 专业版已经开始从“对照面板”
- 往“校准决策台”演进

## 3.6 模板页更接近 Skill 运行入口集合

第六阶段模板页继续往前推进了一步。

当前已经具备：

- 模板是否挂接正式追问、默认 follow-up 和结果动作优先级表达更完整
- 模板进入普通版 / 专业版的策略更清楚
- 模板页更明显体现“运行入口”而不是“展示入口”

[TemplatesPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TemplatesPage.tsx) 现在更像一个带 runtime 语义的 Skill 入口集合页。

## 3.7 测试继续覆盖到了真正关键的新层

第六阶段还有一个重要进展：

- generation contract 测试继续增强
- runtime / studio entry / replay 测试继续扩展
- 机器检查四项全部通过

这说明第六阶段继续强化的是被测试约束住的系统层能力，而不是只补前端展示。

## 4. 第六阶段已暴露问题

## 4.1 contract 已更像主干，但仍未成为真正全链路契约

第六阶段最大的进展是 contract 更像主干了，但当前它仍然主要停留在前端和本地运行链路中。

问题在于：

- 仍然缺少真正跨任务持久化层的完整统一契约
- 旧结构兼容桥接虽然减少，但还没有完全收口
- 主流程和历史链虽然更统一，但离系统级唯一事实来源还有一步

结论：

- contract 已经更稳
- 但还没有成为真正意义上的全链路唯一主干

## 4.2 runtime 决策更强了，但还不是完整运行决策器

模板 runtime 已明显更深地介入流程，这是对的。

但当前仍然存在：

- runtime 还主要决定前台路径和默认动作
- 对更复杂执行分支的接管还有限
- 对不同来源、不同版本链路下的策略差异还不够深

所以更准确地说：

- runtime 已经不轻了
- 但还没有走到“完整运行决策器”

## 4.3 版本差异消费更清楚了，但复杂链路仍偏摘要驱动

第六阶段开始强调差异消费，这是明显进步。

但当前复杂场景仍主要依赖：

- delta headline
- source delta label
- quick delta labels
- 结构化摘要卡片

这已经比前几轮好很多，但仍偏“摘要辅助理解”，还没进入真正高频专业消费的状态。

## 4.4 专业版更像校准台了，但还不是高强度生产工具终态

第六阶段专业版方向是对的，但当前仍存在：

- 校准建议更多是信息增强，还不是强决策流程
- 重跑、派生、对照之间的统一心智还可继续压
- 多来源、多节点、多参数的连续校准仍偏手工理解

也就是说：

- 专业版已经更像专业版
- 但离高强度生产工具还有一步

## 4.5 Skill 闭环已经出现，但还没完全平台化

模板、追问、执行、动作、回流之间的闭环感已经比前几轮强很多。

但当前仍存在：

- 闭环更多是在若干关键页面和运行函数中建立
- 还没有形成更完整、可扩展的统一闭环机制
- 新场景扩展时仍会遇到一定手工接线成本

结论：

- Skill 闭环已经成形
- 但还没有彻底平台化

## 5. 第七阶段建议

## 5.1 第七阶段不该再只是继续补表层体验

如果第七阶段继续只是补 UI 或补说明，会开始边际收益下降。

第七阶段更合理的方向应该是：

- 把第六阶段已经更像主干的 contract 再进一步压成更稳定的全链路结构
- 把 runtime 决策从“更强默认行为”继续推进到“更强运行接管”
- 把版本差异消费从“摘要更好看”推进到“高频操作更高效”
- 把专业版从“更会对照”推进到“更会做决策”

## 5.2 第七阶段最值得推进的 5 个方向

1. 继续收紧 contract 与持久化 / 历史链之间的统一结构
2. 继续强化 runtime 对来源、模式、动作分支的接管
3. 继续增强版本差异的高频消费效率
4. 继续强化专业版的决策辅助与校准闭环
5. 继续把模板入口推进成更完整的 Skill 运行入口

## 5.3 如果以 V1 上线为目标，第七阶段很可能会进入收口轮

结合前几轮进展来看：

- 前五阶段解决了双模式、模板、追问、版本、contract 和 runtime 的主结构问题
- 第六阶段进一步解决了“这些结构能不能更深地接管主流程”的问题

所以第七阶段很可能开始进入：

- 系统能力继续收口
- 体验统一
- 异常态补齐
- 高频链路磨平

也就是说，第七阶段很可能开始接近 V1 的上线前收口阶段。

## 6. 第六阶段总结

第六阶段完成后，可以比较明确地说：

- generation contract 已经更像统一主干契约
- 模板 runtime 已经更明显地主导追问、入口和结果动作
- 版本流已经更强调关键变化消费
- 专业版已经更像校准决策台
- 模板、追问、执行、动作、回流之间的 Skill 闭环感已经更强

但也要清醒地看到：

- contract 还没完全成为全链路唯一主干
- runtime 还不是完整运行决策器
- 差异消费还没到真正高频专业生产级别
- 专业版还没到最终生产工具状态

一句话收口：

第六阶段的价值，在于让系统不只是“有结构”，而是开始更像“结构真的在接管运行”。
