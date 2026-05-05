# 图像 Skill 平台 V1 · 第七阶段多 Agent 任务说明书

## 文档说明

- 文档目标：把第七阶段 backlog 继续拆成可直接分发给多会话 / 多 Agent 的任务说明书。
- 文档定位：承接 [image-skill-platform-phase7-backlog-v1.md](./image-skill-platform-phase7-backlog-v1.md) 的执行分发文档。
- 当前状态：第七阶段多 Agent 执行说明文档。
- 更新时间：2026-05-05。

## 1. 使用方式

这份文档继续沿用前六阶段的分发方式，但目标已经切换到“V1 主流程收口、主干稳定、高频效率和异常态一致性”。

推荐使用方式：

1. 继续以当前总分支 `feature/image-skill-platform-v1` 作为集成分支
2. 每个 Agent 从总分支切自己的第七阶段子分支
3. 每个 Agent 严格按自己的负责范围改动
4. 每个 Agent 完成后先自检，再合回总分支
5. 总分支统一做第七阶段集成验证

## 2. 第七阶段分工原则

- 先收口主干，再收口高频效率和异常态
- 先减少例外分支，再增强连续决策与连续派生
- 按文件边界拆，但要明确 contract、runtime 和版本消费的共享边界
- 继续避免多个 Agent 同时深改同一个高冲突文件
- 第七阶段要特别避免“只是补更多说明和更多组件，但 V1 主流程没有更稳”

## 3. Agent 总览

| Agent | 任务名称 | 核心目标 | 优先级 | 是否阻塞别人 |
|---|---|---|---|---|
| Agent A7 | Contract 稳定收口 | 让 generation contract 更接近 V1 统一事实来源 | P0 | 部分 |
| Agent B7 | Runtime 分支收口 | 让模板 runtime 对主流程分支控制更稳定、更少例外 | P0 | 部分 |
| Agent C7 | 版本高频效率收口 | 让高频多轮版本流更快判断、更快继续 | P0 | 部分 |
| Agent D7 | 专业版连续决策收口 | 让专业版更适合连续校准、派生和重跑 | P1 | 否 |
| Agent E7 | 双模式体验与异常态收口 | 让普通版、专业版、模板入口进入 V1 上线前收口状态 | P1 | 部分 |

## 4. Agent A7：Contract 稳定收口

### 4.1 任务目标

让 generation contract 更接近 V1 统一事实来源，而不只是更强的运行时主干。

### 4.2 负责范围

- `src/features/generation/*`
- `src/features/works/workReplay.ts`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 4.3 允许目标

- 继续压缩旧结构兼容桥接
- 强化任务、结果、回流、重跑对 contract 的统一消费
- 明确 contract 在关键主流程中的事实来源地位
- 减少 snapshot / fallback / bridge 的重复语义

### 4.4 不要做的事

- 不要重构服务端或数据库
- 不要打断现有主流程
- 不要引入新的大中台抽象
- 不要回滚第六阶段已有 contract 工作

### 4.5 交付标准

- contract 在关键主流程中的主干地位更明确
- 旧结构桥接继续减少
- 回流链与执行链对 contract 的消费更统一

### 4.6 自测清单

- 检查任务发起、结果保存、回流恢复和重跑是否更统一围绕 contract
- 检查旧结构桥接是否继续收缩
- 确认没有新增并行快照语义

### 4.7 建议子分支名

- `feature/phase7-contract-stability`

## 5. Agent B7：Runtime 分支收口

### 5.1 任务目标

让模板 runtime 对追问路径、入口方式、结果动作和回流再进入的控制更稳定、更少例外分支。

### 5.2 负责范围

- `src/features/prompt-templates/*`
- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`

### 5.3 允许目标

- 继续减少 runtime 旁路逻辑
- 强化模板 runtime 对入口、追问、结果动作的统一控制
- 强化 runtime 与 contract、版本来源、场景入口之间的默认联动
- 优化 runtime 决策在普通版和模板入口中的一致性

### 5.4 不要做的事

- 不要做完整策略引擎平台
- 不要引入复杂模型决策树
- 不要回退成更多散点特例逻辑
- 不要重构专业版主体结构

### 5.5 交付标准

- runtime 例外分支更少
- 模板对入口、追问和动作的控制更稳定
- 普通版和模板入口对 runtime 的消费更一致

### 5.6 自测清单

- 从多个模板和首页入口进入普通版
- 检查追问、入口、结果动作是否更稳定地受 runtime 决定
- 检查模板入口与结果动作回流是否更一致

### 5.7 建议子分支名

- `feature/phase7-runtime-convergence`

## 6. Agent C7：版本高频效率收口

### 6.1 任务目标

让版本流更适合高频继续、重试和分叉，而不只是更会说明变化。

### 6.2 负责范围

- `src/features/works/workReplay.ts`
- `src/features/works/workReplay.test.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 6.3 允许目标

- 优化版本差异的高频消费密度
- 强化继续、重试、分叉的动作判断提示
- 强化版本节点与模板、追问、参数变化之间的直达关系
- 让普通版和专业版对版本消费更分层但更顺手

### 6.4 不要做的事

- 不要做复杂图谱
- 不要引入完整 diff 面板系统
- 不要重构 generation contract 主干
- 不要为了“更全面”而堆更多长摘要

### 6.5 交付标准

- 高频版本消费更快
- 继续、重试、分叉的判断成本更低
- 普通版和专业版都更容易消费版本变化

### 6.6 自测清单

- 连续进行继续、重试、分叉的多轮操作
- 从作品页和任务页分别高频回流
- 检查普通版和专业版里版本判断是否更快

### 6.7 建议子分支名

- `feature/phase7-version-efficiency`

## 7. Agent D7：专业版连续决策收口

### 7.1 任务目标

让专业版从“更会对照和校准”，继续走向“更适合连续决策和高频派生”。

### 7.2 负责范围

- `src/features/studio-pro/*`
- `src/features/studio/*`
- `src/pages/app/StudioPage.tsx`

### 7.3 允许目标

- 强化连续派生与重跑的决策提示
- 强化来源版 / 当前版 / 目标版之间的对照关系
- 优化参数、Prompt、执行信息在连续校准中的消费顺序
- 让专业版更像高频生产工具，而不是多块高级信息面板

### 7.4 不要做的事

- 不要污染普通版任务流
- 不要重构版本链底层语义
- 不要开始做完整实验台
- 不要新增大量只读信息而无连续决策价值

### 7.5 交付标准

- 专业版更适合连续决策
- 派生与重跑的决策链更短
- 参数、Prompt、执行信息消费顺序更清楚

### 7.6 自测清单

- 在专业版里做一次连续派生和一次连续重跑
- 检查来源版 / 当前版 / 目标版之间的对照表达
- 检查参数和 Prompt 校准是否更利于下一步决策

### 7.7 建议子分支名

- `feature/phase7-pro-decision-flow`

## 8. Agent E7：双模式体验与异常态收口

### 8.1 任务目标

让普通版、专业版、模板入口和回流链在异常态、空态和边界态下更稳，更接近 V1 上线前收口状态。

### 8.2 负责范围

- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 8.3 允许目标

- 补齐主流程异常态、空态和恢复态
- 统一普通版 / 专业版 / 模板入口的边界反馈
- 优化关键主流程的状态提示、文案和降级路径
- 为 V1 上线前回归和手工验收准备更稳状态

### 8.4 不要做的事

- 不要扩新大型功能模块
- 不要重构整站导航
- 不要深改 contract 和 runtime 主干
- 不要只做纯视觉修饰而不提升状态稳定性

### 8.5 交付标准

- 主流程异常态和空态更完整
- 双模式和模板入口边界反馈更统一
- 更适合后续回归和上线前验收

### 8.6 自测清单

- 检查普通版、专业版、模板入口的空态和异常态
- 检查作品回流和任务回流的边界提示
- 检查关键主流程的状态反馈和降级文案

### 8.7 建议子分支名

- `feature/phase7-experience-hardening`

## 9. 第七阶段建议集成顺序

建议按以下顺序集成：

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

## 10. 第七阶段高冲突文件提醒

以下文件在第七阶段仍然容易冲突：

- `src/pages/app/StudioPage.tsx`
- `src/features/prompt-templates/*`
- `src/features/works/workReplay.ts`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`
- `src/features/generation/*`

处理建议：

- 先明确 Agent 所有权
- 非负责人只做最小必要接触
- 集成时优先人工检查 contract 主干、runtime 例外分支、版本判断提示和异常态反馈是否冲突

## 11. 第七阶段总结

第七阶段的多 Agent 推进重点，是把前六阶段逐步建立起来的主干能力压成更稳、更顺、更接近 V1 上线前收口状态的系统能力。

所以这一轮必须持续盯住两件事：

- 每个 Agent 不要继续打开新的大型结构层
- 每个 Agent 都尽量让 V1 主流程更稳、更顺、更适合上线前收口
