# 图像 Skill 平台 V1 · 第九阶段多 Agent 开发任务清单

## 文档说明

- 文档目标：把第九阶段开发范围拆成可执行、可分配、可并行推进的任务清单。
- 文档定位：承接 [image-skill-platform-phase9-scope-v1.md](./image-skill-platform-phase9-scope-v1.md) 的第九阶段 backlog 文档。
- 当前状态：第九阶段 backlog 主文档。
- 更新时间：2026-05-05。

## 1. 文档结论先行

第九阶段不建议再围绕“继续增强能力”拆任务，而应围绕“最终一致性、最终收边、最终回归与上线执行准备”拆任务。

建议继续拆成 5 个 Epic：

- E91 Contract / Runtime 最终一致性收口
- E92 高频主链最终收边
- E93 专业版连续链最终压实
- E94 异常态与恢复态最终统一
- E95 最终回归与上线执行准备

一句话总结：

第九阶段继续多 Agent 并行，但目标已经明确切到 V1 最终验收与上线执行准备。

## 2. 第九阶段分支策略

继续沿用当前总分支：

- 总分支：`feature/image-skill-platform-v1`

建议子分支：

- `feature/phase9-contract-runtime-final`
- `feature/phase9-mainflow-polish`
- `feature/phase9-pro-final-pass`
- `feature/phase9-state-unification`
- `feature/phase9-release-execution`

## 3. 第九阶段任务总览

| Epic | 名称 | 目标 | 优先级 | 可并行程度 |
|---|---|---|---|---|
| E91 | Contract / Runtime 最终一致性收口 | 完成主干结构最终一致性检查与封口 | P0 | 中 |
| E92 | 高频主链最终收边 | 完成普通版、版本流、模板入口的最终主链收边 | P0 | 中 |
| E93 | 专业版连续链最终压实 | 完成专业版连续决策与连续派生的最终压实 | P0 | 中 |
| E94 | 异常态与恢复态最终统一 | 完成双模式关键边界态最终统一 | P1 | 中 |
| E95 | 最终回归与上线执行准备 | 完成手工验收、回归视角和上线执行准备 | P1 | 低 |

## 4. E91 Contract / Runtime 最终一致性收口

### 目标

完成主干结构最终一致性检查与封口。

### 主要任务

- T91.1 做 contract / runtime 最终一致性检查
- T91.2 清理残余低频 bridge / fallback / runtime 特例
- T91.3 明确最终主干判断边界

### 主要文件

- `src/features/generation/*`
- `src/features/prompt-templates/*`
- `src/features/studio-consumer/*`
- `src/features/works/workReplay.ts`

### 验收标准

- contract / runtime 一致性更明确
- 残余特例继续减少
- 主干判断更清楚

## 5. E92 高频主链最终收边

### 目标

完成普通版、版本流、模板入口的最终主链收边。

### 主要任务

- T92.1 再压普通版高频主链
- T92.2 再压版本流高频回流路径
- T92.3 再压模板入口到工作台的最终体验链

### 主要文件

- `src/features/studio-consumer/*`
- `src/pages/app/StudioPage.tsx`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/pages/app/TemplatesPage.tsx`

### 验收标准

- 高频主链最终更顺
- 回流路径最终更短
- 模板入口最终更自然

## 6. E93 专业版连续链最终压实

### 目标

完成专业版连续决策与连续派生的最终压实。

### 主要任务

- T93.1 再压专业版连续派生链
- T93.2 再压专业版重跑 / 对照 / 校准链
- T93.3 清理专业版剩余使用跳跃点

### 主要文件

- `src/features/studio-pro/*`
- `src/features/studio/*`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 专业版连续链最终更稳
- 跳跃点更少
- 连续判断更自然

## 7. E94 异常态与恢复态最终统一

### 目标

完成双模式关键边界态最终统一。

### 主要任务

- T94.1 补最终异常态、恢复态、降级态
- T94.2 统一双模式边界反馈
- T94.3 统一模板入口和回流链的恢复反馈

### 主要文件

- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- 边界态更统一
- 恢复态更自然
- 降级态更清楚

## 8. E95 最终回归与上线执行准备

### 目标

完成手工验收、回归视角和上线执行准备。

### 主要任务

- T95.1 整理最终手工验收视角
- T95.2 整理最终回归重点
- T95.3 整理上线执行准备相关文档或提示

### 主要文件

- `docs/*`
- 必要时少量涉及 `src/pages/app/*` 的状态文案和反馈

### 验收标准

- 最终回归重点更清楚
- 手工验收更容易执行
- 上线执行准备更完整

## 9. 第九阶段推荐多 Agent 拆分

建议继续按 5 个 Agent 拆。

| Agent | 负责 Epic | 核心目标 |
|---|---|---|
| Agent A9 | E91 | Contract / Runtime 最终一致性收口 |
| Agent B9 | E92 | 高频主链最终收边 |
| Agent C9 | E93 | 专业版连续链最终压实 |
| Agent D9 | E94 | 异常态与恢复态最终统一 |
| Agent E9 | E95 | 最终回归与上线执行准备 |

## 10. 第九阶段建议启动顺序

建议按以下顺序启动：

1. Agent A9
2. Agent B9
3. Agent C9
4. Agent D9
5. Agent E9

原因：

- 先做主干最终一致性收口
- 再压高频主链
- 再压专业版连续链
- 然后统一异常态与恢复态
- 最后整理最终回归与上线执行准备

## 11. 第九阶段集成验收建议

第九阶段每轮集成后，至少检查：

- contract / runtime 最终一致性是否更清楚
- 高频主链是否最终更顺
- 专业版连续链是否最终更稳
- 异常态与恢复态是否最终更统一
- 回归与上线执行准备是否更完整
