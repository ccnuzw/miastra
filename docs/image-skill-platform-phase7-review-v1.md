# 图像 Skill 平台 V1 · 第七阶段复盘

## 文档说明

- 文档目标：基于第七阶段真实代码改动与阶段目标，整理“第七阶段已完成 / 已暴露问题 / 第八阶段建议”清单。
- 文档定位：承接 [image-skill-platform-phase7-scope-v1.md](./image-skill-platform-phase7-scope-v1.md) 和 [image-skill-platform-phase7-backlog-v1.md](./image-skill-platform-phase7-backlog-v1.md) 的阶段复盘文档。
- 当前状态：第七阶段复盘文档。
- 更新时间：2026-05-05。

## 1. 复盘结论先行

第七阶段的核心价值，不是继续扩功能，而是让前六阶段已经逐步建立起来的 contract、runtime、版本流和专业版能力，开始进入真正的 V1 收口状态。

这一轮最明显的进展有五条：

- generation contract 更接近 V1 统一事实来源
- 模板 runtime 的入口、追问和动作分支控制更稳定
- 版本流更适合高频继续、重试和分叉
- 专业版更像可连续决策的工作台
- 双模式主流程和模板入口的异常态、边界态开始更完整

一句话总结：

第六阶段解决“结构能不能更深地接管运行”，第七阶段开始解决“这些结构能不能更稳、更顺、更接近 V1 可上线状态”。

## 2. 复盘依据

本次复盘主要基于以下实际代码改动与验收结果：

- [generation.contract.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.contract.ts)
- [generation.contract.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.contract.test.ts)
- [generation.request.ts](/Users/apple/Progame/newfeng/miastra/src/features/generation/generation.request.ts)
- [promptTemplate.runtime.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.runtime.ts)
- [promptTemplate.runtime.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.runtime.test.ts)
- [promptTemplate.studioEntry.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.studioEntry.ts)
- [promptTemplate.studioEntry.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/prompt-templates/promptTemplate.studioEntry.test.ts)
- [ConsumerResultActions.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-consumer/ConsumerResultActions.tsx)
- [ConsumerTaskEntrySection.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-home/ConsumerTaskEntrySection.tsx)
- [consumerHomePresets.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-home/consumerHomePresets.ts)
- [consumerHomePresets.test.ts](/Users/apple/Progame/newfeng/miastra/src/features/studio-home/consumerHomePresets.test.ts)
- [StudioProDecisionFlowPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio-pro/StudioProDecisionFlowPanel.tsx)
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

- 这轮集成检查未发现阻塞性错误
- 第七阶段代码层面的类型、smoke 和生产构建均已通过

## 3. 第七阶段已完成

## 3.1 generation contract 更接近 V1 统一事实来源

这是第七阶段最关键的进展。

当前已经具备：

- contract 在 generation 请求、主流程、版本回流中的主干地位继续增强
- 旧结构桥接继续收缩
- 关键字段在 contract 内的消费更一致
- 主流程更接近默认围绕 contract 运转

这一轮的意义在于：

- contract 不再只是“更强中间层”
- 而开始更像 V1 统一事实来源

## 3.2 模板 runtime 分支控制更稳定

第七阶段另一个关键进展，是 runtime 不只是更强，而是更稳。

当前已经具备：

- 模板入口、普通版入口和结果动作回流之间的 runtime 联动更一致
- studio entry 与 runtime 的默认映射更稳定
- 跟模板、入口模式、下一步动作相关的特例分支继续减少
- consumer 入口与结果动作的默认行为更像统一链路

这说明：

- runtime 已不只是“能驱动”
- 而开始更像“可预测地驱动”

## 3.3 版本流更适合高频继续、重试和分叉

第七阶段的版本流增强，不再只是改善说明文案，而是在继续压高频使用效率。

当前已经具备：

- 版本变化摘要继续增强
- 继续、重试、分叉的判断提示更清楚
- 作品页和任务页里的回流动作更像高频生产操作
- 版本节点与模板、追问、参数变化之间的对应关系更直达

这说明版本流已经从“更会解释”，继续走向“更会服务高频使用”。

## 3.4 专业版更像连续决策工作台

第七阶段专业版的增强方向是对的：不再只是堆对照信息，而是在压连续决策链。

当前已经具备：

- 新的决策流面板开始承接来源版 / 当前版 / 目标版关系
- 参数、Prompt、执行信息的消费顺序更适合连续判断
- 派生与重跑之间的下一步决策提示更明确
- 专业版的信息组织更接近高频生产判断，而不是多个高级面板并列

这说明：

- 专业版已经开始从“高级信息台”
- 向“连续决策工作台”演进

## 3.5 双模式异常态和边界态开始更完整

第七阶段还有一个很重要的进展：

- 普通版、专业版、模板入口和回流链的异常态、空态、边界提示开始更统一
- Consumer 入口区与结果动作的恢复路径更自然
- Works / Tasks / Templates / Studio 之间的边界反馈更像一个整体产品，而不是几页松散页面

这一点对 V1 上线很重要，因为它说明系统开始进入真正的收边阶段。

## 4. 第七阶段已暴露问题

## 4.1 contract 已很接近主干，但还没完全成为唯一事实来源

第七阶段后，contract 已经非常接近主干。

但当前仍存在：

- 仍有少量旧结构兼容路径
- 某些历史恢复和边界回流仍有 fallback 痕迹
- contract 还没有在所有 V1 核心链路中达到绝对唯一地位

结论：

- contract 已经很接近收口
- 但还没有完全封口

## 4.2 runtime 已经更稳，但极端边界仍有例外分支

runtime 分支控制明显更稳定了。

但当前仍可能存在：

- 某些低频入口的默认联动仍偏手工
- 个别边界态下仍有例外判断
- runtime 与异常态降级路径的统一性还可继续压

所以更准确地说：

- runtime 已经开始收口
- 但还没完全去除例外

## 4.3 版本流已经高频化，但还没到“最短操作链”

第七阶段已经明显压了高频效率。

但当前复杂多轮创作里仍可能出现：

- 需要阅读摘要后再做判断
- 对比多个来源节点仍偏显式思考
- 高级用户在连续派生时仍有少量心智负担

也就是说：

- 版本流已经更像生产流
- 但还可以再压短一点

## 4.4 专业版更像连续决策台了，但还不是最终生产终态

这一轮专业版进展很明显，但当前仍有边界：

- 决策链已经更清楚，但还没有完全一气呵成
- 参数、Prompt、执行信息虽然更顺，但还可以再更紧
- 高强度重跑、连续派生、多版对照仍可继续收边

结论：

- 专业版已经很接近生产工具形态
- 但还没到最终终态

## 4.5 V1 已明显接近完成，但还需要最后一轮收边

从现在看，V1 的主结构已经基本齐了。

剩下更像：

- 主干继续封口
- 异常态继续统一
- 决策链再压短
- 回归与上线准备再补齐

也就是说：

- 已经非常接近 V1 完成
- 但仍值得再做一轮更明确的上线前收口

## 5. 第八阶段建议

## 5.1 第八阶段不应再打开新的结构层

如果第八阶段继续增加新结构层，会开始稀释当前的收口成果。

第八阶段更合理的方向应该是：

- 把 contract 真正压成 V1 统一事实来源
- 把 runtime 例外分支继续压平
- 把版本流和专业版的高频操作链再压短
- 把双模式异常态、空态、回退态、降级态彻底统一
- 为上线前回归和最终验收做准备

## 5.2 第八阶段最值得推进的 5 个方向

1. Contract 最终封口
2. Runtime 例外分支清理
3. 版本流最后一轮高频提效
4. 专业版连续决策最后一轮收边
5. 上线前回归、异常态和验收准备

## 6. 第七阶段总结

第七阶段完成后，可以比较明确地说：

- generation contract 已经非常接近 V1 统一事实来源
- 模板 runtime 已经更稳定地控制主流程分支
- 版本流已经更适合高频继续、重试和分叉
- 专业版已经更像连续决策工作台
- 双模式工作台已经开始进入真正的 V1 收口状态

一句话收口：

第七阶段的价值，在于让系统不只是“能跑”，而是开始更像“准备上线的 V1 产品”。
