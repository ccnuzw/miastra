# 图像 Skill 平台 V1 · 第五阶段多 Agent 开发任务清单

## 文档说明

- 文档目标：把第五阶段开发范围拆成可执行、可分配、可并行推进的任务清单。
- 文档定位：承接 [image-skill-platform-phase5-scope-v1.md](./image-skill-platform-phase5-scope-v1.md) 的第五阶段 backlog 文档。
- 当前状态：第五阶段 backlog 主文档。
- 更新时间：2026-05-05。

## 1. 文档结论先行

第五阶段不建议再围绕“配置再多一点”拆任务，而应围绕“系统能力稳定化”和“高频效率增强”拆任务。

建议继续拆成 5 个 Epic：

- E51 共享契约深化
- E52 追问机制可组合化
- E53 版本流高频效率增强
- E54 专业版对照与校准增强
- E55 模板 Skill 运行意图增强

一句话总结：

第五阶段继续多 Agent 并行，但每个 Agent 的目标不再是增加单点能力，而是让第四阶段已经较统一的结构能力更稳定、更高频、更接近系统级底盘。

## 2. 第五阶段分支策略

继续沿用当前总分支：

- 总分支：`feature/image-skill-platform-v1`

建议子分支：

- `feature/phase5-shared-contract`
- `feature/phase5-guided-flow-composition`
- `feature/phase5-version-efficiency`
- `feature/phase5-pro-compare`
- `feature/phase5-template-skill-runtime`

## 3. 第五阶段任务总览

| Epic | 名称 | 目标 | 优先级 | 可并行程度 |
|---|---|---|---|---|
| E51 | 共享契约深化 | 让模板、追问、执行、版本更接近稳定系统契约 | P0 | 中 |
| E52 | 追问机制可组合化 | 让追问更容易由字段、场景和默认策略自动组合 | P0 | 中 |
| E53 | 版本流高频效率增强 | 让多轮继续、重试、分叉在高频场景下更快更稳 | P0 | 中 |
| E54 | 专业版对照与校准增强 | 让专业版更适合比较、校准和派生 | P1 | 中 |
| E55 | 模板 Skill 运行意图增强 | 让模板更明确决定追问路径、进入策略和结果动作优先级 | P1 | 低 |

## 4. E51 共享契约深化

### 目标

让模板、追问、执行、版本之间的共享对象更接近稳定系统契约，减少桥接层和重复映射。

### 主要任务

- T51.1 收口共享对象边界和字段约束
- T51.2 清理重复桥接和重复映射
- T51.3 强化结构对象在主流程和历史回流中的一致性
- T51.4 为后续持久化和服务端承接预留更稳接口

### 主要文件

- `src/features/prompt-templates/*`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`
- `src/features/generation/*`
- `src/features/works/workReplay.ts`

### 验收标准

- 共享对象边界更清楚
- 桥接和重复映射明显减少
- 主流程和回流链中的结构对象更一致

## 5. E52 追问机制可组合化

### 目标

让轻量追问更容易由模板字段、场景和默认策略自动组合，而不是主要依赖手工定义。

### 主要任务

- T52.1 强化字段驱动问题生成
- T52.2 抽象默认值和推荐值策略
- T52.3 强化追问结果到 Prompt、结果动作、回流状态的自动映射
- T52.4 在控制范围内扩展更多高频场景

### 主要文件

- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/features/prompt-templates/*`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 字段与追问生成关系更直接
- 新场景接入追问的手工成本进一步下降
- 追问结果到主流程的映射更自动更稳定

## 6. E53 版本流高频效率增强

### 目标

让版本链在高频多轮创作中，不只是能理解，而且能更快消费、更快切换和更快继续。

### 主要任务

- T53.1 强化更结构化的节点摘要
- T53.2 强化高频多轮回流下的来源判断
- T53.3 强化模板、追问、参数与版本节点的显式对应关系
- T53.4 优化普通版和专业版对多轮版本流的消费效率

### 主要文件

- `src/features/works/workReplay.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 验收标准

- 多轮版本流更快理解
- 高级用户连续派生时心智更稳
- 版本节点与模板、追问、参数联系更显式

## 7. E54 专业版对照与校准增强

### 目标

让专业版更适合比较、校准和派生，而不只是复用当前已有基线。

### 主要任务

- T54.1 强化结构字段与 Prompt 的对照表达
- T54.2 强化当前版与来源版的对照表达
- T54.3 强化参数快照的校准和提示能力
- T54.4 强化专业版中的对照、派生和复用共存体验

### 主要文件

- `src/features/studio-pro/*`
- `src/features/studio/*`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 专业版更适合做对照和校准
- 来源版与当前版关系更直观
- 参数快照更有比较价值

## 8. E55 模板 Skill 运行意图增强

### 目标

让模板更明确决定追问路径、进入方式和结果动作优先级，进一步接近真正运行中的 Skill 单元。

### 主要任务

- T55.1 强化模板对追问路径的影响
- T55.2 强化模板对普通版 / 专业版进入策略的影响
- T55.3 强化模板对结果动作优先级和默认分支的影响
- T55.4 让模板页更像运行中的 Skill 入口集合

### 主要文件

- `src/pages/app/TemplatesPage.tsx`
- `src/features/prompt-templates/*`
- `src/pages/app/StudioPage.tsx`
- `src/features/studio-consumer/*`

### 验收标准

- 模板更明确决定追问路径和进入方式
- 模板对结果动作的优先级影响更清楚
- 模板页更像运行中 Skill 的入口集合

## 9. 第五阶段推荐多 Agent 拆分

建议继续按 5 个 Agent 拆。

| Agent | 负责 Epic | 核心目标 |
|---|---|---|
| Agent A5 | E51 | 共享契约深化 |
| Agent B5 | E52 | 追问机制可组合化 |
| Agent C5 | E53 | 版本流高频效率增强 |
| Agent D5 | E54 | 专业版对照与校准增强 |
| Agent E5 | E55 | 模板 Skill 运行意图增强 |

## 10. 第五阶段建议启动顺序

建议按以下顺序启动：

1. Agent A5
2. Agent B5
3. Agent C5
4. Agent D5
5. Agent E5

原因：

- 先把共享契约继续压实
- 再让追问走向字段驱动组合
- 再增强高频版本流效率
- 然后补专业版对照与校准
- 最后让模板更进一步承接 Skill 运行意图

## 11. 第五阶段集成验收建议

第五阶段每轮集成后，至少检查：

- 共享对象是否更稳定、更少桥接
- 追问是否更像字段驱动组合
- 多轮版本流是否更高频高效
- 专业版是否更适合对照和校准
- 模板是否更明确决定追问路径、进入方式和动作优先级

继续保持：

- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

## 12. 第五阶段总结

第五阶段的核心不是继续补更多表层能力，而是让前四阶段已经逐步统一起来的结构能力，更稳定、更高频、更接近系统底盘。

所以这一轮最重要的不是继续散点补充，而是把下面这五条线继续推进：

- 契约更稳
- 追问更可组合
- 版本流更高效
- 专业版更可对照
- 模板更像运行中的 Skill 单元
