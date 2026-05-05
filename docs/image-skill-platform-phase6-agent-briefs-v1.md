# 图像 Skill 平台 V1 · 第六阶段多 Agent 任务说明书

## 文档说明

- 文档目标：把第六阶段 backlog 继续拆成可直接分发给多会话 / 多 Agent 的任务说明书。
- 文档定位：承接 [image-skill-platform-phase6-backlog-v1.md](./image-skill-platform-phase6-backlog-v1.md) 的执行分发文档。
- 当前状态：第六阶段多 Agent 执行说明文档。
- 更新时间：2026-05-05。

## 1. 使用方式

这份文档继续沿用前五阶段的分发方式，但目标已经切换到“contract 深化、runtime 决策深化和高频差异消费增强”。

推荐使用方式：

1. 继续以当前总分支 `feature/image-skill-platform-v1` 作为集成分支
2. 每个 Agent 从总分支切自己的第六阶段子分支
3. 每个 Agent 严格按自己的负责范围改动
4. 每个 Agent 完成后先自检，再合回总分支
5. 总分支统一做第六阶段集成验证

## 2. 第六阶段分工原则

- 先让 contract 更像主干，再让 runtime 更深地接管流程
- 先提升高频差异消费，再补更强的专业版校准决策
- 按文件边界拆，但要明确共享契约和运行上下文边界
- 继续避免多个 Agent 同时深改同一个高冲突文件
- 第六阶段要特别避免“结构更复杂了，但对真实主流程承接并没有更深”

## 3. Agent 总览

| Agent | 任务名称 | 核心目标 | 优先级 | 是否阻塞别人 |
|---|---|---|---|---|
| Agent A6 | Contract 全链路深化 | 让 generation contract 更像统一主干契约 | P0 | 部分 |
| Agent B6 | Runtime 决策深化 | 让模板 runtime 更明确驱动追问、入口和结果分支 | P0 | 部分 |
| Agent C6 | 版本差异消费增强 | 让高频多轮版本流更容易看出关键变化 | P0 | 部分 |
| Agent D6 | 专业版校准决策增强 | 让专业版更适合判断下一步该怎么改、从哪一版派生 | P1 | 否 |
| Agent E6 | Skill 运行闭环增强 | 让模板、追问、执行、结果动作、回流更像完整闭环 | P1 | 部分 |

## 4. Agent A6：Contract 全链路深化

### 4.1 任务目标

让 generation contract 更像统一主干契约，而不只是前端运行时中间层。

### 4.2 负责范围

- `src/features/generation/*`
- `src/features/works/workReplay.ts`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 4.3 允许目标

- 继续减少旧结构兼容分叉
- 强化主流程和回流链对 contract 的统一消费
- 强化 contract 对 scene、prompt、parameters、guidedFlow、references、draw 的主干地位
- 为后续持久化和任务记录承接继续压结构

### 4.4 不要做的事

- 不要重构服务端或数据库
- 不要为了统一命名而打断现有主流程
- 不要引入新的“大而全中台抽象”
- 不要回滚第五阶段已有 contract 工作

### 4.5 交付标准

- contract 在主流程中的承接更统一
- 旧结构桥接继续减少
- 回流链与执行链对 contract 的消费更稳定

### 4.6 自测清单

- 检查主流程发起、回流恢复和执行参数承接是否继续统一到 contract
- 检查旧结构桥接是否继续收缩
- 确认没有新增命名分裂和重复快照层

### 4.7 建议子分支名

- `feature/phase6-contract-core`

## 5. Agent B6：Runtime 决策深化

### 5.1 任务目标

让模板 runtime 更明确决定追问路径、进入方式和结果动作优先级，而不只是提供模板默认值。

### 5.2 负责范围

- `src/features/prompt-templates/*`
- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/pages/app/StudioPage.tsx`
- `src/pages/app/TemplatesPage.tsx`

### 5.3 允许目标

- 强化模板对追问路径的主导
- 强化模板对普通版 / 专业版进入方式的控制
- 强化模板对结果动作优先级和默认分支的控制
- 强化 runtime 与 contract、版本来源之间的联动

### 5.4 不要做的事

- 不要做完整策略引擎
- 不要引入复杂模型路由系统
- 不要回退成更多散点 if/else
- 不要重构专业版控制区主体结构

### 5.5 交付标准

- 模板 runtime 对主流程分支的控制更明显
- 进入方式、追问路径和动作分支更由模板决定
- runtime 与 contract 和版本上下文关系更紧

### 5.6 自测清单

- 从多个模板入口进入普通版和专业版
- 检查模板是否更明确控制追问路径和动作优先级
- 检查 runtime 与版本来源、回流上下文的联动是否更清楚

### 5.7 建议子分支名

- `feature/phase6-runtime-decision`

## 6. Agent C6：版本差异消费增强

### 6.1 任务目标

让版本流更容易让高频用户看出这版和上一版、来源版到底差在哪里。

### 6.2 负责范围

- `src/features/works/workReplay.ts`
- `src/features/works/workReplay.test.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`

### 6.3 允许目标

- 强化更直观的结构变化摘要
- 强化当前节点与父节点的差异消费
- 强化模板、追问、参数变化在版本流中的显式表达
- 优化普通版和专业版对差异信息的消费方式

### 6.4 不要做的事

- 不要做复杂图谱
- 不要引入完整 diff 工具
- 不要重构模板 runtime 层
- 不要为了“信息完整”而堆更多大段文字摘要

### 6.5 交付标准

- 差异消费更直观
- 高级用户更容易理解“这一版比上一版改了什么”
- 多轮派生时关键变化更容易被抓住

### 6.6 自测清单

- 连续进行继续、重试、分叉的多轮操作
- 从作品页和任务页分别高频回流
- 检查普通版和专业版里差异摘要是否更快可读

### 6.7 建议子分支名

- `feature/phase6-version-delta`

## 7. Agent D6：专业版校准决策增强

### 7.1 任务目标

让专业版不仅能对照，还能更快帮助用户决定下一步该怎么改、该从哪一版派生。

### 7.2 负责范围

- `src/features/studio-pro/*`
- `src/features/studio/*`
- `src/pages/app/StudioPage.tsx`

### 7.3 允许目标

- 强化 field-to-prompt 对照
- 强化 current-vs-source 对照
- 强化参数校准提示
- 强化派生与重跑的决策辅助表达

### 7.4 不要做的事

- 不要污染普通版任务流
- 不要重构版本链底层语义
- 不要开始做完整实验室
- 不要新增大量只读信息而无决策价值

### 7.5 交付标准

- 专业版更会帮助用户判断下一步
- 来源版与当前版对照更清楚
- 参数校准建议更有价值

### 7.6 自测清单

- 在专业版里做一次来源版对照和一次派生决策
- 检查结构字段、Prompt 和参数快照之间的校准提示
- 检查重跑与派生建议是否更像决策台

### 7.7 建议子分支名

- `feature/phase6-pro-calibration`

## 8. Agent E6：Skill 运行闭环增强

### 8.1 任务目标

让模板、追问、执行、结果动作和版本回流更像一个完整 Skill 运行闭环，而不是若干相关模块。

### 8.2 负责范围

- `src/features/prompt-templates/*`
- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/features/works/workReplay.ts`
- `src/pages/app/StudioPage.tsx`

### 8.3 允许目标

- 强化模板到追问到执行到结果动作的闭环承接
- 强化结果动作对 runtime 分支的反向影响
- 强化版本回流重新进入 Skill 闭环的体验
- 让模板更像运行中的 Skill 单元

### 8.4 不要做的事

- 不要做 Skill 市场系统
- 不要重构整站导航
- 不要深改 generation contract 主干
- 不要新增大量说明性 UI 而无闭环运行价值

### 8.5 交付标准

- 模板、追问、执行、动作、回流之间更像闭环
- 结果动作对 runtime 分支影响更清楚
- 版本回流重新进入 Skill 链更自然

### 8.6 自测清单

- 从模板入口发起一次普通版流程并继续到结果动作再回流
- 检查结果动作是否能反向影响 runtime 分支
- 检查版本回流后是否更自然重新进入同一 Skill 链

### 8.7 建议子分支名

- `feature/phase6-skill-loop`

## 9. 第六阶段建议集成顺序

建议按以下顺序集成：

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

## 10. 第六阶段高冲突文件提醒

以下文件在第六阶段仍然容易冲突：

- `src/pages/app/StudioPage.tsx`
- `src/features/prompt-templates/*`
- `src/features/works/workReplay.ts`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`
- `src/features/generation/*`

处理建议：

- 先明确 Agent 所有权
- 非负责人只做最小必要接触
- 集成时优先人工检查 contract 承接、runtime 分支和版本差异摘要是否冲突

## 11. 第六阶段总结

第六阶段的多 Agent 推进重点，是把第五阶段已经成立的 contract、runtime 和版本消费能力，继续推进成更深地承接主流程的系统能力。

所以这一轮必须持续盯住两件事：

- 每个 Agent 不要只补更多解释层或配置层
- 每个 Agent 都尽量让 contract、runtime 和高频差异消费更深地接管真实运行主流程
