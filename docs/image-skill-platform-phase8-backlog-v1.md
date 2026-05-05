# 图像 Skill 平台 V1 · 第八阶段多 Agent 开发任务清单

## 文档说明

- 文档目标：把第八阶段开发范围拆成可执行、可分配、可并行推进的任务清单。
- 文档定位：承接 [image-skill-platform-phase8-scope-v1.md](./image-skill-platform-phase8-scope-v1.md) 的第八阶段 backlog 文档。
- 当前状态：第八阶段 backlog 主文档。
- 更新时间：2026-05-05。

## 1. 文档结论先行

第八阶段不建议再围绕“继续增强能力”拆任务，而应围绕“最终封口、清例外、补异常态、准备回归与验收”拆任务。

建议继续拆成 5 个 Epic：

- E81 Contract 最终封口
- E82 Runtime 例外分支清理
- E83 版本流最后一轮提效
- E84 专业版连续决策收边
- E85 上线前回归与验收准备

一句话总结：

第八阶段继续多 Agent 并行，但目标已经明确切到 V1 最终收口和上线前准备。

## 2. 第八阶段分支策略

继续沿用当前总分支：

- 总分支：`feature/image-skill-platform-v1`

建议子分支：

- `feature/phase8-contract-seal`
- `feature/phase8-runtime-cleanup`
- `feature/phase8-version-last-mile`
- `feature/phase8-pro-final-flow`
- `feature/phase8-release-hardening`

## 3. 第八阶段任务总览

| Epic | 名称 | 目标 | 优先级 | 可并行程度 |
|---|---|---|---|---|
| E81 | Contract 最终封口 | 让 generation contract 更接近 V1 最终唯一事实来源 | P0 | 中 |
| E82 | Runtime 例外分支清理 | 让模板 runtime 进一步减少特例和旁路 | P0 | 中 |
| E83 | 版本流最后一轮提效 | 让继续、重试、分叉的高频链更短 | P0 | 中 |
| E84 | 专业版连续决策收边 | 让专业版高频决策链更紧凑、更稳定 | P1 | 中 |
| E85 | 上线前回归与验收准备 | 让异常态、恢复态和回归准备更完整 | P1 | 低 |

## 4. E81 Contract 最终封口

### 目标

让 generation contract 更接近 V1 最终唯一事实来源。

### 主要任务

- T81.1 清理残余 bridge / fallback 语义
- T81.2 强化关键主流程默认围绕 contract 运转
- T81.3 明确 contract 主干判断与最终收口边界

### 主要文件

- `src/features/generation/*`
- `src/features/works/workReplay.ts`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- contract 更接近唯一事实来源
- bridge / fallback 继续减少
- 主流程默认围绕 contract 运转

## 5. E82 Runtime 例外分支清理

### 目标

让模板 runtime 进一步减少特例和旁路逻辑。

### 主要任务

- T82.1 清理低频入口上的 runtime 特例
- T82.2 强化 runtime 与降级、恢复、继续动作的一致性
- T82.3 统一普通版、模板入口、结果动作回流的 runtime 消费

### 主要文件

- `src/features/prompt-templates/*`
- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`

### 验收标准

- runtime 例外继续减少
- 入口、恢复、继续动作更一致
- 普通版和模板入口行为更稳定

## 6. E83 版本流最后一轮提效

### 目标

让继续、重试、分叉的高频链再更短一点。

### 主要任务

- T83.1 压缩版本差异消费路径
- T83.2 强化高频动作判断提示
- T83.3 优化 Works / Tasks / Studio 之间的高频回流效率

### 主要文件

- `src/features/works/workReplay.ts`
- `src/features/works/workReplay.test.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- 高频版本链更短
- 判断提示更清楚
- 回流效率更高

## 7. E84 专业版连续决策收边

### 目标

让专业版高频决策链更紧凑、更稳定。

### 主要任务

- T84.1 再压短连续派生与连续重跑路径
- T84.2 优化参数、Prompt、执行信息的决策消费顺序
- T84.3 强化来源版 / 当前版 / 目标版之间的直达关系

### 主要文件

- `src/features/studio-pro/*`
- `src/features/studio/*`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 专业版连续决策链更顺
- 派生与重跑更紧凑
- 对照与校准关系更直接

## 8. E85 上线前回归与验收准备

### 目标

让双模式、模板入口、回流链的异常态和回归准备更完整。

### 主要任务

- T85.1 补齐关键异常态、空态、恢复态、降级态
- T85.2 统一关键主流程的状态提示和恢复反馈
- T85.3 为手工验收与发布前回归整理更稳状态

### 主要文件

- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- 异常态和恢复态更完整
- 状态提示更统一
- 更适合上线前回归和手工验收

## 9. 第八阶段推荐多 Agent 拆分

建议继续按 5 个 Agent 拆。

| Agent | 负责 Epic | 核心目标 |
|---|---|---|
| Agent A8 | E81 | Contract 最终封口 |
| Agent B8 | E82 | Runtime 例外分支清理 |
| Agent C8 | E83 | 版本流最后一轮提效 |
| Agent D8 | E84 | 专业版连续决策收边 |
| Agent E8 | E85 | 上线前回归与验收准备 |

## 10. 第八阶段建议启动顺序

建议按以下顺序启动：

1. Agent A8
2. Agent B8
3. Agent C8
4. Agent D8
5. Agent E8

原因：

- 先做 contract 最终封口
- 再清 runtime 特例
- 再压版本流最后一轮高频效率
- 然后收边专业版连续决策链
- 最后补回归与验收准备

## 11. 第八阶段集成验收建议

第八阶段每轮集成后，至少检查：

- contract 是否更接近唯一事实来源
- runtime 特例是否继续减少
- 版本流是否更短更顺
- 专业版决策链是否更紧凑
- 异常态、恢复态和回归准备是否更完整
