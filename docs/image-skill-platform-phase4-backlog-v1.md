# 图像 Skill 平台 V1 · 第四阶段多 Agent 开发任务清单

## 文档说明

- 文档目标：把第四阶段开发范围拆成可执行、可分配、可并行推进的任务清单。
- 文档定位：承接 [image-skill-platform-phase4-scope-v1.md](./image-skill-platform-phase4-scope-v1.md) 的第四阶段 backlog 文档。
- 当前状态：第四阶段 backlog 主文档。
- 更新时间：2026-05-05。

## 1. 文档结论先行

第四阶段不建议再围绕“局部结构点”拆任务，而应围绕“结构统一”和“机制扩展”拆任务。

建议继续拆成 5 个 Epic：

- E41 统一场景 Schema 深化
- E42 轻量追问配置化
- E43 版本链生产流增强
- E44 专业版高频复用增强
- E45 模板向 Skill 入口演进

一句话总结：

第四阶段继续多 Agent 并行，但每个 Agent 的目标不再是单点成立，而是让第三阶段已经出现的结构能力更统一、更稳定、更可扩展。

## 2. 第四阶段分支策略

继续沿用当前总分支：

- 总分支：`feature/image-skill-platform-v1`

建议子分支：

- `feature/phase4-scene-schema`
- `feature/phase4-guided-flow-config`
- `feature/phase4-version-production-flow`
- `feature/phase4-pro-reuse`
- `feature/phase4-template-skill-entry`

## 3. 第四阶段任务总览

| Epic | 名称 | 目标 | 优先级 | 可并行程度 |
|---|---|---|---|---|
| E41 | 统一场景 Schema 深化 | 让模板、追问、执行、版本共享更统一的对象和字段命名 | P0 | 中 |
| E42 | 轻量追问配置化 | 让追问场景、步骤和默认值更容易扩展 | P0 | 中 |
| E43 | 版本链生产流增强 | 让多轮继续、重试、分叉具备更稳定的工作流心智 | P0 | 中 |
| E44 | 专业版高频复用增强 | 让专业版更明确服务结构复用、重跑和派生 | P1 | 中 |
| E45 | 模板向 Skill 入口演进 | 让模板从结构入口进一步走向带执行意图的 Skill 入口 | P1 | 低 |

## 4. E41 统一场景 Schema 深化

### 目标

让模板结构、追问结果、执行参数、版本上下文共享更稳定的场景对象和字段命名，减少多层适配与语义分裂。

### 主要任务

- T41.1 定义统一场景对象与字段命名约束
- T41.2 对齐模板 schema、追问快照、执行参数、版本上下文
- T41.3 清理重复字段和映射断点
- T41.4 为后续持久化扩展预留稳定接口

### 主要文件

- `src/features/prompt-templates/*`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`
- `src/features/generation/*`
- `src/features/works/workReplay.ts`

### 验收标准

- 模板、追问、执行、版本开始共享更稳定的场景字段
- 显著减少命名不一致和多层适配

## 5. E42 轻量追问配置化

### 目标

让当前追问从少量手工场景能力升级成更容易扩展的配置机制。

### 主要任务

- T42.1 抽离追问配置结构
- T42.2 让模板字段驱动追问步骤和默认值
- T42.3 扩展到更多高频场景，但控制范围
- T42.4 强化追问结果到 Prompt 和结果动作的映射闭环

### 主要文件

- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/features/prompt-templates/*`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 追问定义更清晰可扩展
- 新场景接入追问的成本明显下降
- 追问结果对工作台和结果动作的影响更稳定

## 6. E43 版本链生产流增强

### 目标

让版本链更稳定支持多轮继续、重试、分叉和派生，而不是只靠轻量动作语义。

### 主要任务

- T43.1 增强父节点、祖先节点和当前节点摘要
- T43.2 强化多轮回流与派生的来源说明
- T43.3 强化版本链与模板、追问、参数之间的对应关系
- T43.4 优化普通版和专业版中的多轮版本消费体验

### 主要文件

- `src/features/works/workReplay.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- 多轮版本链更容易理解
- 继续、重试、分叉在多轮场景下仍语义清晰
- 模板、追问、参数上下文与版本来源联系更紧

## 7. E44 专业版高频复用增强

### 目标

让专业版更明确服务高频复用、重跑和派生，而不是只停留在当前执行解释。

### 主要任务

- T44.1 强化结构字段与最终 Prompt / 执行的对应关系
- T44.2 强化参数快照与版本派生的联动
- T44.3 强化模板入口、重跑入口、派生入口的复用表达
- T44.4 让专业版更像结构化生产控制台

### 主要文件

- `src/features/studio-pro/*`
- `src/features/studio/*`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 专业版复用感更强
- 高频重跑和派生路径更明确
- 结构字段与执行关系更容易理解

## 8. E45 模板向 Skill 入口演进

### 目标

让模板从结构入口继续往“带执行意图和进入策略的 Skill 入口”推进。

### 主要任务

- T45.1 强化模板的推荐模式和推荐入口表达
- T45.2 强化模板到普通版/专业版/结果动作的进入策略
- T45.3 强化模板与版本链、追问链的关联表达
- T45.4 让模板页更像 Skill 入口集合，而不是结构资源页

### 主要文件

- `src/pages/app/TemplatesPage.tsx`
- `src/features/prompt-templates/*`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 模板更明显具备执行意图
- 模板与工作台模式和结果动作关系更明确
- 模板页更接近 Skill 入口集合

## 9. 第四阶段推荐多 Agent 拆分

建议继续按 5 个 Agent 拆。

| Agent | 负责 Epic | 核心目标 |
|---|---|---|
| Agent A4 | E41 | 统一场景 Schema 深化 |
| Agent B4 | E42 | 轻量追问配置化 |
| Agent C4 | E43 | 版本链生产流增强 |
| Agent D4 | E44 | 专业版高频复用增强 |
| Agent E4 | E45 | 模板向 Skill 入口演进 |

## 10. 第四阶段建议启动顺序

建议按以下顺序启动：

1. Agent A4
2. Agent B4
3. Agent C4
4. Agent D4
5. Agent E4

原因：

- 先把共享 schema 再压实
- 再让追问配置化建立在统一字段之上
- 再增强版本多轮生产流
- 然后补专业版高频复用
- 最后让模板更进一步走向 Skill 入口

## 11. 第四阶段集成验收建议

第四阶段每轮集成后，至少检查：

- 模板、追问、执行、版本是否更统一
- 新场景接入追问是否更轻
- 多轮版本链是否更稳定易懂
- 专业版是否更服务高频复用
- 模板页是否更像 Skill 入口集合

继续保持：

- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

## 12. 第四阶段总结

第四阶段的核心不是再做几个新结构点，而是让第三阶段已经出现的结构能力更统一、更稳、更能扩展。

所以这一轮最重要的不是继续散点推进，而是把下面这五条线继续打通：

- schema 更统一
- 追问更配置化
- 版本流更生产化
- 专业版更复用化
- 模板更 Skill 化
