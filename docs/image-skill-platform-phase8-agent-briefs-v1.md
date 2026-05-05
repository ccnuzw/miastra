# 图像 Skill 平台 V1 · 第八阶段多 Agent 任务说明书

## 文档说明

- 文档目标：把第八阶段 backlog 继续拆成可直接分发给多会话 / 多 Agent 的任务说明书。
- 文档定位：承接 [image-skill-platform-phase8-backlog-v1.md](./image-skill-platform-phase8-backlog-v1.md) 的执行分发文档。
- 当前状态：第八阶段多 Agent 执行说明文档。
- 更新时间：2026-05-05。

## 1. 使用方式

这份文档继续沿用前七阶段的分发方式，但目标已经切换到“最终封口、清例外、补异常态、准备回归与验收”。

推荐使用方式：

1. 继续以当前总分支 `feature/image-skill-platform-v1` 作为集成分支
2. 每个 Agent 从总分支切自己的第八阶段子分支
3. 每个 Agent 严格按自己的负责范围改动
4. 每个 Agent 完成后先自检，再合回总分支
5. 总分支统一做第八阶段集成验证

## 2. 第八阶段分工原则

- 先封口主干，再清理 runtime 和高频链里的残余例外
- 先提升上线前稳定性，再补回归与验收准备
- 按文件边界拆，但要明确 contract、runtime、版本流和专业版决策链的共享边界
- 继续避免多个 Agent 同时深改同一个高冲突文件
- 第八阶段要特别避免“又补了更多细节，但 V1 最终收口并没有更近”

## 3. Agent 总览

| Agent | 任务名称 | 核心目标 | 优先级 | 是否阻塞别人 |
|---|---|---|---|---|
| Agent A8 | Contract 最终封口 | 让 generation contract 更接近 V1 最终唯一事实来源 | P0 | 部分 |
| Agent B8 | Runtime 例外分支清理 | 让模板 runtime 进一步减少特例和旁路 | P0 | 部分 |
| Agent C8 | 版本流最后一轮提效 | 让继续、重试、分叉的高频链更短 | P0 | 部分 |
| Agent D8 | 专业版连续决策收边 | 让专业版高频决策链更紧凑、更稳定 | P1 | 否 |
| Agent E8 | 上线前回归与验收准备 | 让异常态、恢复态和回归准备更完整 | P1 | 部分 |

## 4. Agent A8：Contract 最终封口

### 4.1 任务目标

让 generation contract 更接近 V1 最终唯一事实来源。

### 4.2 负责范围

- `src/features/generation/*`
- `src/features/works/workReplay.ts`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 4.3 允许目标

- 清理残余 bridge / fallback 语义
- 强化关键主流程默认围绕 contract 运转
- 明确 contract 主干判断与最终收口边界
- 压缩仍然游离在主干之外的结构语义

### 4.4 不要做的事

- 不要重构服务端或数据库
- 不要重开新的结构层
- 不要打断现有主流程
- 不要回滚第七阶段已有主干收口工作

### 4.5 交付标准

- contract 更接近唯一事实来源
- bridge / fallback 继续减少
- 主流程默认围绕 contract 运转

### 4.6 自测清单

- 检查发起、回流、重跑、版本恢复是否都继续围绕 contract
- 检查残余 bridge / fallback 是否继续收缩
- 确认没有新增平行结构快照

### 4.7 建议子分支名

- `feature/phase8-contract-seal`

## 5. Agent B8：Runtime 例外分支清理

### 5.1 任务目标

让模板 runtime 进一步减少特例和旁路逻辑。

### 5.2 负责范围

- `src/features/prompt-templates/*`
- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`

### 5.3 允许目标

- 清理低频入口上的 runtime 特例
- 强化 runtime 与降级、恢复、继续动作的一致性
- 统一普通版、模板入口、结果动作回流的 runtime 消费
- 压缩仍需要手工覆盖的分支判断

### 5.4 不要做的事

- 不要做完整策略引擎平台
- 不要引入复杂模型决策树
- 不要继续堆更多特例 if/else
- 不要重构专业版主体结构

### 5.5 交付标准

- runtime 例外继续减少
- 入口、恢复、继续动作更一致
- 普通版和模板入口行为更稳定

### 5.6 自测清单

- 从首页入口、模板入口、结果动作回流分别进入普通版
- 检查恢复、降级、继续动作是否更稳定受 runtime 控制
- 检查模板入口与回流路径是否更一致

### 5.7 建议子分支名

- `feature/phase8-runtime-cleanup`

## 6. Agent C8：版本流最后一轮提效

### 6.1 任务目标

让继续、重试、分叉的高频链再更短一点。

### 6.2 负责范围

- `src/features/works/workReplay.ts`
- `src/features/works/workReplay.test.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 6.3 允许目标

- 压缩版本差异消费路径
- 强化高频动作判断提示
- 优化 Works / Tasks / Studio 之间的高频回流效率
- 继续减少多轮派生里的不必要理解成本

### 6.4 不要做的事

- 不要做复杂图谱
- 不要引入完整 diff 面板系统
- 不要重构 contract 主干
- 不要为了信息完整而继续堆长摘要

### 6.5 交付标准

- 高频版本链更短
- 判断提示更清楚
- 回流效率更高

### 6.6 自测清单

- 连续进行继续、重试、分叉的高频操作
- 从作品页和任务页分别高频回流
- 检查普通版和专业版中的高频判断链是否更短

### 6.7 建议子分支名

- `feature/phase8-version-last-mile`

## 7. Agent D8：专业版连续决策收边

### 7.1 任务目标

让专业版高频决策链更紧凑、更稳定。

### 7.2 负责范围

- `src/features/studio-pro/*`
- `src/features/studio/*`
- `src/pages/app/StudioPage.tsx`

### 7.3 允许目标

- 再压短连续派生与连续重跑路径
- 优化参数、Prompt、执行信息的决策消费顺序
- 强化来源版 / 当前版 / 目标版之间的直达关系
- 继续减少决策链中的信息分散感

### 7.4 不要做的事

- 不要污染普通版任务流
- 不要重构版本链底层语义
- 不要开始做完整实验台
- 不要新增大量只读信息而无连续决策价值

### 7.5 交付标准

- 专业版连续决策链更顺
- 派生与重跑更紧凑
- 对照与校准关系更直接

### 7.6 自测清单

- 在专业版里做一次连续派生和一次连续重跑
- 检查来源版 / 当前版 / 目标版直达关系
- 检查参数、Prompt、执行信息是否更利于连续判断

### 7.7 建议子分支名

- `feature/phase8-pro-final-flow`

## 8. Agent E8：上线前回归与验收准备

### 8.1 任务目标

让双模式、模板入口、回流链的异常态和回归准备更完整。

### 8.2 负责范围

- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 8.3 允许目标

- 补齐关键异常态、空态、恢复态、降级态
- 统一关键主流程的状态提示和恢复反馈
- 为手工验收与发布前回归整理更稳状态
- 优化最关键路径上的状态文案和反馈一致性

### 8.4 不要做的事

- 不要扩新大型功能模块
- 不要重构整站导航
- 不要深改 contract 和 runtime 主干
- 不要只做视觉修饰而不提升回归稳定性

### 8.5 交付标准

- 异常态和恢复态更完整
- 状态提示更统一
- 更适合上线前回归和手工验收

### 8.6 自测清单

- 检查普通版、专业版、模板入口、回流链的异常态和空态
- 检查关键恢复态和降级态反馈
- 检查手工验收时最常见路径的状态稳定性

### 8.7 建议子分支名

- `feature/phase8-release-hardening`

## 9. 第八阶段建议集成顺序

建议按以下顺序集成：

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

## 10. 第八阶段高冲突文件提醒

以下文件在第八阶段仍然容易冲突：

- `src/pages/app/StudioPage.tsx`
- `src/features/prompt-templates/*`
- `src/features/works/workReplay.ts`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`
- `src/features/generation/*`

处理建议：

- 先明确 Agent 所有权
- 非负责人只做最小必要接触
- 集成时优先人工检查 contract 封口、runtime 特例清理、版本高频链和异常态恢复是否互相覆盖

## 11. 第八阶段总结

第八阶段的多 Agent 推进重点，是把前七阶段已经很接近 V1 可上线状态的系统，真正压到“可以放心回归、可以放心验收、可以放心准备上线”的程度。

所以这一轮必须持续盯住两件事：

- 每个 Agent 不要继续打开新层
- 每个 Agent 都尽量让 V1 最终收口更近一步
