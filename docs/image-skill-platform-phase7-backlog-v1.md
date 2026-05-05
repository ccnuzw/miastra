# 图像 Skill 平台 V1 · 第七阶段多 Agent 开发任务清单

## 文档说明

- 文档目标：把第七阶段开发范围拆成可执行、可分配、可并行推进的任务清单。
- 文档定位：承接 [image-skill-platform-phase7-scope-v1.md](./image-skill-platform-phase7-scope-v1.md) 的第七阶段 backlog 文档。
- 当前状态：第七阶段 backlog 主文档。
- 更新时间：2026-05-05。

## 1. 文档结论先行

第七阶段不建议再围绕“继续加结构”和“继续补解释”拆任务，而应围绕“V1 主流程收口、主干稳定、高频效率和异常态一致性”拆任务。

建议继续拆成 5 个 Epic：

- E71 Contract 稳定收口
- E72 Runtime 分支收口
- E73 版本高频效率收口
- E74 专业版连续决策收口
- E75 双模式体验与异常态收口

一句话总结：

第七阶段继续多 Agent 并行，但每个 Agent 的目标不再是继续铺新能力，而是让现有能力更稳、更顺、更接近 V1 上线前收口状态。

## 2. 第七阶段分支策略

继续沿用当前总分支：

- 总分支：`feature/image-skill-platform-v1`

建议子分支：

- `feature/phase7-contract-stability`
- `feature/phase7-runtime-convergence`
- `feature/phase7-version-efficiency`
- `feature/phase7-pro-decision-flow`
- `feature/phase7-experience-hardening`

## 3. 第七阶段任务总览

| Epic | 名称 | 目标 | 优先级 | 可并行程度 |
|---|---|---|---|---|
| E71 | Contract 稳定收口 | 让 generation contract 更接近 V1 统一事实来源 | P0 | 中 |
| E72 | Runtime 分支收口 | 让模板 runtime 对主流程分支控制更稳定、更少例外 | P0 | 中 |
| E73 | 版本高频效率收口 | 让高频多轮版本流更快判断、更快继续 | P0 | 中 |
| E74 | 专业版连续决策收口 | 让专业版更适合连续校准、派生和重跑 | P1 | 中 |
| E75 | 双模式体验与异常态收口 | 让普通版、专业版、模板入口进入 V1 上线前收口状态 | P1 | 低 |

## 4. E71 Contract 稳定收口

### 目标

让 generation contract 更接近 V1 统一事实来源，而不只是更强的运行时主干。

### 主要任务

- T71.1 继续压缩旧结构兼容桥接
- T71.2 强化任务、结果、回流、重跑对 contract 的统一消费
- T71.3 明确 contract 在关键主流程中的事实来源地位
- T71.4 减少 snapshot / fallback / bridge 的重复语义

### 主要文件

- `src/features/generation/*`
- `src/features/works/workReplay.ts`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- contract 在关键主流程中的主干地位更明确
- 旧结构桥接继续减少
- 回流链与执行链对 contract 的消费更统一

## 5. E72 Runtime 分支收口

### 目标

让模板 runtime 对追问路径、入口方式、结果动作和回流再进入的控制更稳定、更少例外分支。

### 主要任务

- T72.1 继续减少 runtime 旁路逻辑
- T72.2 强化模板 runtime 对入口、追问、结果动作的统一控制
- T72.3 强化 runtime 与 contract、版本来源、场景入口之间的默认联动
- T72.4 优化 runtime 决策在普通版和模板入口中的一致性

### 主要文件

- `src/features/prompt-templates/*`
- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`

### 验收标准

- runtime 例外分支更少
- 模板对入口、追问和动作的控制更稳定
- 普通版和模板入口对 runtime 的消费更一致

## 6. E73 版本高频效率收口

### 目标

让版本流更适合高频继续、重试和分叉，而不只是更会说明变化。

### 主要任务

- T73.1 优化版本差异的高频消费密度
- T73.2 强化继续、重试、分叉的动作判断提示
- T73.3 强化版本节点与模板、追问、参数变化之间的直达关系
- T73.4 让普通版和专业版对版本消费更分层但更顺手

### 主要文件

- `src/features/works/workReplay.ts`
- `src/features/works/workReplay.test.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- 高频版本消费更快
- 继续、重试、分叉的判断成本更低
- 普通版和专业版都更容易消费版本变化

## 7. E74 专业版连续决策收口

### 目标

让专业版从“更会对照和校准”，继续走向“更适合连续决策和高频派生”。

### 主要任务

- T74.1 强化连续派生与重跑的决策提示
- T74.2 强化来源版 / 当前版 / 目标版之间的对照关系
- T74.3 优化参数、Prompt、执行信息在连续校准中的消费顺序
- T74.4 让专业版更像高频生产工具，而不是多块高级信息面板

### 主要文件

- `src/features/studio-pro/*`
- `src/features/studio/*`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 专业版更适合连续决策
- 派生与重跑的决策链更短
- 参数、Prompt、执行信息消费顺序更清楚

## 8. E75 双模式体验与异常态收口

### 目标

让普通版、专业版、模板入口和回流链在异常态、空态和边界态下更稳，更接近 V1 上线前收口状态。

### 主要任务

- T75.1 补齐主流程异常态、空态和恢复态
- T75.2 统一普通版 / 专业版 / 模板入口的边界反馈
- T75.3 优化关键主流程的状态提示、文案和降级路径
- T75.4 为 V1 上线前回归和手工验收准备更稳状态

### 主要文件

- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- 主流程异常态和空态更完整
- 双模式和模板入口边界反馈更统一
- 更适合后续回归和上线前验收

## 9. 第七阶段推荐多 Agent 拆分

建议继续按 5 个 Agent 拆。

| Agent | 负责 Epic | 核心目标 |
|---|---|---|
| Agent A7 | E71 | Contract 稳定收口 |
| Agent B7 | E72 | Runtime 分支收口 |
| Agent C7 | E73 | 版本高频效率收口 |
| Agent D7 | E74 | 专业版连续决策收口 |
| Agent E7 | E75 | 双模式体验与异常态收口 |

## 10. 第七阶段建议启动顺序

建议按以下顺序启动：

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

## 11. 第七阶段集成验收建议

第七阶段每轮集成后，至少检查：

- contract 是否更接近统一事实来源
- runtime 是否更稳定控制主流程分支
- 版本流是否更适合高频继续、重试和分叉
- 专业版是否更适合连续决策和连续校准
- 双模式和模板入口的异常态、空态和边界态是否更稳
