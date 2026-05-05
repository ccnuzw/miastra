# 图像 Skill 平台 V1 · 第六阶段多 Agent 开发任务清单

## 文档说明

- 文档目标：把第六阶段开发范围拆成可执行、可分配、可并行推进的任务清单。
- 文档定位：承接 [image-skill-platform-phase6-scope-v1.md](./image-skill-platform-phase6-scope-v1.md) 的第六阶段 backlog 文档。
- 当前状态：第六阶段 backlog 主文档。
- 更新时间：2026-05-05。

## 1. 文档结论先行

第六阶段不建议再围绕“配置和解释再完整一点”拆任务，而应围绕“contract 深化、runtime 决策深化和高频差异消费”拆任务。

建议继续拆成 5 个 Epic：

- E61 Contract 全链路深化
- E62 Runtime 决策深化
- E63 版本差异消费增强
- E64 专业版校准决策增强
- E65 Skill 运行闭环增强

一句话总结：

第六阶段继续多 Agent 并行，但每个 Agent 的目标不再是继续补结构，而是让现有结构更深地接管真实运行主流程。

## 2. 第六阶段分支策略

继续沿用当前总分支：

- 总分支：`feature/image-skill-platform-v1`

建议子分支：

- `feature/phase6-contract-core`
- `feature/phase6-runtime-decision`
- `feature/phase6-version-delta`
- `feature/phase6-pro-calibration`
- `feature/phase6-skill-loop`

## 3. 第六阶段任务总览

| Epic | 名称 | 目标 | 优先级 | 可并行程度 |
|---|---|---|---|---|
| E61 | Contract 全链路深化 | 让 generation contract 更像主干契约 | P0 | 中 |
| E62 | Runtime 决策深化 | 让模板 runtime 更明确驱动追问、入口和结果分支 | P0 | 中 |
| E63 | 版本差异消费增强 | 让高频多轮版本流更容易看出关键变化 | P0 | 中 |
| E64 | 专业版校准决策增强 | 让专业版更适合决定下一步该怎么改、从哪一版派生 | P1 | 中 |
| E65 | Skill 运行闭环增强 | 让模板、追问、执行、结果动作、回流更像完整闭环 | P1 | 低 |

## 4. E61 Contract 全链路深化

### 目标

让 generation contract 更像统一主干契约，而不只是前端运行时中间层。

### 主要任务

- T61.1 继续减少旧结构兼容分叉
- T61.2 强化主流程和回流链对 contract 的统一消费
- T61.3 强化 contract 对 scene、prompt、parameters、guidedFlow、references、draw 的主干地位
- T61.4 为后续持久化和任务记录承接继续压结构

### 主要文件

- `src/features/generation/*`
- `src/features/works/workReplay.ts`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- contract 在主流程中的承接更统一
- 旧结构桥接继续减少
- 回流链与执行链对 contract 的消费更稳定

## 5. E62 Runtime 决策深化

### 目标

让模板 runtime 更明确决定追问路径、进入方式和结果动作优先级。

### 主要任务

- T62.1 强化模板对追问路径的主导
- T62.2 强化模板对普通版 / 专业版进入方式的控制
- T62.3 强化模板对结果动作优先级和默认分支的控制
- T62.4 强化 runtime 与 contract、版本来源之间的联动

### 主要文件

- `src/features/prompt-templates/*`
- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`

### 验收标准

- 模板 runtime 对主流程分支的控制更明显
- 进入方式、追问路径和动作分支更由模板决定
- runtime 与 contract 和版本上下文关系更紧

## 6. E63 版本差异消费增强

### 目标

让版本流更容易让高频用户看出这版和上一版、来源版到底差在哪里。

### 主要任务

- T63.1 强化更直观的结构变化摘要
- T63.2 强化当前节点与父节点的差异消费
- T63.3 强化模板、追问、参数变化在版本流中的显式表达
- T63.4 优化普通版和专业版对差异信息的消费方式

### 主要文件

- `src/features/works/workReplay.ts`
- `src/features/works/workReplay.test.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- 差异消费更直观
- 高级用户更容易理解“这一版比上一版改了什么”
- 多轮派生时关键变化更容易被抓住

## 7. E64 专业版校准决策增强

### 目标

让专业版不仅能对照，还能更快帮助用户决定下一步该怎么改、该从哪一版派生。

### 主要任务

- T64.1 强化 field-to-prompt 对照
- T64.2 强化 current-vs-source 对照
- T64.3 强化参数校准提示
- T64.4 强化派生与重跑的决策辅助表达

### 主要文件

- `src/features/studio-pro/*`
- `src/features/studio/*`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 专业版更会帮助用户判断下一步
- 来源版与当前版对照更清楚
- 参数校准建议更有价值

## 8. E65 Skill 运行闭环增强

### 目标

让模板、追问、执行、结果动作和版本回流更像一个完整 Skill 运行闭环。

### 主要任务

- T65.1 强化模板到追问到执行到结果动作的闭环承接
- T65.2 强化结果动作对 runtime 分支的反向影响
- T65.3 强化版本回流重新进入 Skill 闭环的体验
- T65.4 让模板更像运行中的 Skill 单元

### 主要文件

- `src/features/prompt-templates/*`
- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/features/works/workReplay.ts`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 模板、追问、执行、动作、回流之间更像闭环
- 结果动作对 runtime 分支影响更清楚
- 版本回流重新进入 Skill 链更自然

## 9. 第六阶段推荐多 Agent 拆分

建议继续按 5 个 Agent 拆。

| Agent | 负责 Epic | 核心目标 |
|---|---|---|
| Agent A6 | E61 | Contract 全链路深化 |
| Agent B6 | E62 | Runtime 决策深化 |
| Agent C6 | E63 | 版本差异消费增强 |
| Agent D6 | E64 | 专业版校准决策增强 |
| Agent E6 | E65 | Skill 运行闭环增强 |

## 10. 第六阶段建议启动顺序

建议按以下顺序启动：

1. Agent A6
2. Agent B6
3. Agent C6
4. Agent D6
5. Agent E6

原因：

- 先把 contract 继续压成主干
- 再让 runtime 更深地接管主流程
- 再增强版本差异消费
- 然后补专业版校准决策
- 最后让 Skill 闭环更完整

## 11. 第六阶段集成验收建议

第六阶段每轮集成后，至少检查：

- contract 是否更像统一主干
- runtime 是否更明确控制追问、入口和结果分支
- 版本差异是否更容易消费
- 专业版是否更会帮助用户做校准和决策
- Skill 闭环是否更完整

继续保持：

- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

## 12. 第六阶段总结

第六阶段的核心不是继续堆更多功能说明，而是让 contract、runtime、版本流和专业版校准链更深地接管真实运行主流程。

所以这一轮最重要的不是继续做外围补点，而是把下面这五条线继续推进：

- contract 更主干
- runtime 更有决策力
- 版本差异更会被消费
- 专业版更会帮助决策
- Skill 闭环更完整
