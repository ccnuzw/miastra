# 图像 Skill 平台 V1 · 第八阶段复盘

## 文档说明

- 文档目标：基于第八阶段真实代码改动与阶段目标，整理“第八阶段已完成 / 已暴露问题 / 第九阶段建议”清单。
- 文档定位：承接 [image-skill-platform-phase8-scope-v1.md](./image-skill-platform-phase8-scope-v1.md) 和 [image-skill-platform-phase8-backlog-v1.md](./image-skill-platform-phase8-backlog-v1.md) 的阶段复盘文档。
- 当前状态：第八阶段复盘文档。
- 更新时间：2026-05-05。

## 1. 复盘结论先行

第八阶段的核心价值，不是继续加能力，而是把前七阶段已经接近完成的主干能力继续封口，并把系统推到“可以进入最终验收与上线准备”的状态。

这一轮最明显的进展有五条：

- generation contract 更接近 V1 最终唯一事实来源
- 模板 runtime 的例外分支继续减少
- 版本流高频链继续缩短
- 专业版连续决策链继续收边
- 双模式异常态、恢复态和上线前回归准备更完整

一句话总结：

第七阶段让系统更像可上线产品，第八阶段开始让它更像“可以放心验收和上线准备的产品”。

## 2. 复盘依据

本次复盘主要基于以下实际代码改动与验收结果：

- [generation.contract.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.contract.ts)
- [generation.contract.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.contract.test.ts)
- [promptTemplate.runtime.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.runtime.ts)
- [promptTemplate.runtime.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.runtime.test.ts)
- [promptTemplate.studioEntry.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.studioEntry.ts)
- [promptTemplate.studioEntry.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.studioEntry.test.ts)
- [ConsumerResultActions.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/ConsumerResultActions.tsx)
- [consumerGuidedFlow.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/consumerGuidedFlow.ts)
- [consumerGuidedFlow.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/consumerGuidedFlow.test.ts)
- [StudioProDecisionFlowPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProDecisionFlowPanel.tsx)
- [StudioProExecutionPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProExecutionPanel.tsx)
- [StudioProPromptPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProPromptPanel.tsx)
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

- 这轮集成检查一开始只有一个类型错误，已在 [generation.contract.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.contract.ts) 收紧返回类型后修复
- 修复后，类型、smoke 和生产构建均已通过

## 3. 第八阶段已完成

## 3.1 generation contract 已非常接近 V1 最终唯一事实来源

这是第八阶段最关键的进展。

当前已经具备：

- contract 在 generation 主流程、版本回流、结果恢复中的主干地位进一步加强
- 残余 bridge / fallback 语义继续减少
- 关键 snapshot 恢复记录更明确围绕 contract 组织
- contract 返回结构的类型约束也更收紧

这说明：

- contract 已不只是主干
- 而开始非常接近 V1 的最终事实来源

## 3.2 模板 runtime 的例外分支继续减少

第八阶段在 runtime 上做的不是加更多能力，而是清理特例。

当前已经具备：

- 模板入口、结果动作回流、普通版默认流之间的一致性更高
- studio entry 与 runtime 之间的默认联动更稳
- 一些低频路径上的手工覆盖继续减少
- runtime 与 guided flow、结果动作之间的闭环更自然

这说明：

- runtime 已不只是“能驱动”
- 而开始更像“稳定、统一地驱动”

## 3.3 版本流高频链继续缩短

第八阶段版本流继续往“更短、更直接”推进。

当前已经具备：

- 继续、重试、分叉的判断提示更紧凑
- 作品页、任务页、工作台之间的高频回流效率更高
- 版本摘要继续压短，但保留了关键变化点
- 高频链路下的理解成本继续下降

这说明：

- 版本流已经不仅是可解释
- 而更接近高频生产流

## 3.4 专业版连续决策链继续收边

第八阶段专业版的重点是再压短决策链。

当前已经具备：

- 连续派生、连续重跑的路径更紧凑
- 决策流面板继续承接来源版 / 当前版 / 目标版关系
- 参数、Prompt、执行信息的消费顺序更适合连续判断
- 专业版已经更像生产中的高频决策面

这说明：

- 专业版离最终生产工具状态更近了一步

## 3.5 上线前异常态和回归准备更完整

第八阶段还有一个很重要的进展：

- 双模式、模板入口、回流链的异常态、恢复态、降级态更完整
- 关键状态反馈更加统一
- 更适合做手工验收和发布前回归

这意味着：

- 系统已经明显从“功能成型”
- 进入“发布准备”状态

## 4. 第八阶段已暴露问题

## 4.1 contract 已接近封口，但还值得再做一次最终统一检查

第八阶段后，contract 已经非常接近最终形态。

但当前仍值得警惕：

- 低频边界路径里是否还藏着少量隐性 fallback
- 个别历史恢复场景是否仍有结构差异

结论：

- contract 基本成型
- 但上线前仍值得再做一次“唯一事实来源”视角检查

## 4.2 runtime 已更稳，但发布前仍值得做一轮特例扫描

runtime 例外已经明显减少。

但当前仍可能存在：

- 低频入口的隐性特例
- 异常态下的恢复路径差异

所以更准确地说：

- runtime 已接近收口
- 但发布前还应再做一轮特例扫描

## 4.3 版本流已经很顺，但还可再做一轮发布前压测思维检查

版本流已经非常接近高频生产流。

但仍建议在最终一轮里关注：

- 高频继续 / 重试 / 分叉链是否还有少量理解拐点
- Works / Tasks / Studio 三处是否还有行为不完全对齐的边界

## 4.4 专业版已很强，但还值得做最后一轮使用链统一

专业版当前已经很接近连续决策工作台。

但最后仍值得关注：

- 多次连续派生时是否还有信息跳跃
- 对照、校准、执行建议之间是否还可再紧一点

## 4.5 系统已进入最终收口区，但最后一轮不能再发散

现在最大风险已经不是“能力不够”，而是：

- 最后一轮又打开新问题
- 或者为了再做一点功能，打断现有收口节奏

结论：

- 系统已经明显进入最终收口区
- 下一轮必须强控范围

## 5. 第九阶段建议

## 5.1 第九阶段应切到“最终验收与上线执行准备”

如果继续按前面阶段那样扩结构，会开始稀释当前成果。

第九阶段更合理的方向应该是：

- 做最终唯一事实来源检查
- 做 runtime 特例清零式检查
- 做高频主链最终收边
- 做最终回归、验收、上线执行准备

## 5.2 第九阶段最值得推进的 5 个方向

1. Contract 与 runtime 最终一致性检查
2. 高频主链最终收边
3. 专业版最终连续使用链压实
4. 双模式异常态与恢复态最终统一
5. 上线前回归、验收和执行准备

## 6. 第八阶段总结

第八阶段完成后，可以比较明确地说：

- generation contract 已非常接近 V1 最终唯一事实来源
- 模板 runtime 的例外分支已经明显减少
- 版本流高频链已经继续缩短
- 专业版连续决策链已经更紧凑
- 双模式工作台已经进入最终回归与验收准备区

一句话收口：

第八阶段的价值，在于让系统从“很接近可上线”继续推进到“接近可以进入最终上线执行准备”。 
