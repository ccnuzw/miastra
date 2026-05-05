# 图像 Skill 平台 V1 · 第三阶段多 Agent 任务说明书

## 文档说明

- 文档目标：把第三阶段 backlog 继续拆成可直接分发给多会话 / 多 Agent 的任务说明书。
- 文档定位：承接 [image-skill-platform-phase3-backlog-v1.md](./image-skill-platform-phase3-backlog-v1.md) 的执行分发文档。
- 当前状态：第三阶段多 Agent 执行说明文档。
- 更新时间：2026-05-05。

## 1. 使用方式

这份文档继续沿用前两阶段的分发方式，但目标已经切换到“结构化能力建设”。

推荐使用方式：

1. 继续以当前总分支 `feature/image-skill-platform-v1` 作为集成分支
2. 每个 Agent 从总分支切自己的第三阶段子分支
3. 每个 Agent 严格按自己的负责范围改动
4. 每个 Agent 完成后先自检，再合回总分支
5. 总分支统一做第三阶段集成验证

## 2. 第三阶段分工原则

- 先补结构，再补体验上的自然衔接
- 先做少量高频场景的正式闭环，不做全量铺开
- 按文件边界拆，但要明确共享语义边界
- 继续避免多个 Agent 同时深改同一个高冲突文件
- 第三阶段要特别避免“前台改了一堆，底层结构没跟上”的失衡

## 3. Agent 总览

| Agent | 任务名称 | 核心目标 | 优先级 | 是否阻塞别人 |
|---|---|---|---|---|
| Agent A3 | 模板结构化基础 | 让模板真正具备结构字段、场景、入口和展示基础 | P0 | 部分 |
| Agent B3 | 轻量追问正式化 | 让首批高频场景具备正式追问步骤和状态回写链 | P0 | 部分 |
| Agent C3 | 版本链工作流增强 | 让来源关系升级成继续、重试、分叉的工作流 | P0 | 部分 |
| Agent D3 | 专业版控制链深化 | 让专业版更明确承接结构模板、Prompt、参数、Provider 和来源 | P1 | 否 |
| Agent E3 | 模板-追问-执行链路对齐 | 让普通版、专业版、模板页和结果动作共享统一场景语义 | P1 | 部分 |

## 4. Agent A3：模板结构化基础

### 4.1 任务目标

建立首批结构模板元信息和字段基础，让模板真正成为工作台输入和展示的结构性入口。

### 4.2 负责范围

- `src/features/prompt-templates/*`
- `src/pages/app/TemplatesPage.tsx`
- 允许接触：
  - `src/pages/app/StudioPage.tsx`
  - `src/features/studio-home/*`
  - `src/features/studio-pro/*`

### 4.3 允许目标

- 定义首批结构模板元信息
- 定义模板字段、场景、入口模式和推荐模式基础类型
- 让模板列表展示结构信息
- 让模板卡片或详情展示字段摘要
- 让工作台入口可读取首批结构模板基础字段

### 4.4 不要做的事

- 不要开始做模板后台 CMS
- 不要设计完整模板 DSL 编辑器
- 不要深改普通版追问流程
- 不要顺手扩写版本链逻辑

### 4.5 交付标准

- 至少首批模板具备可读的结构化元信息
- 模板不再只展示一段 Prompt 内容
- 工作台能消费模板的基础结构字段

### 4.6 自测清单

- 打开模板页
- 检查模板列表和模板卡片是否展示结构信息
- 验证模板进入工作台后，基础字段能被带入

### 4.7 建议子分支名

- `feature/phase3-template-schema`

## 5. Agent B3：轻量追问正式化

### 5.1 任务目标

让 2 到 3 个高频场景拥有正式的轻量追问步骤、选项、默认值和状态回写链。

### 5.2 负责范围

- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/pages/app/StudioPage.tsx`
- 允许接触：
  - `src/features/generation/*`
  - `src/features/works/workReplay.ts`

### 5.3 允许目标

- 选定首批高频场景
- 为每个场景定义问题顺序和选项结构
- 让追问结果写回普通版输入上下文
- 让追问结果进入历史和继续创作上下文
- 保持按钮式、轻量式追问体验

### 5.4 不要做的事

- 不要做复杂聊天机器人
- 不要引入通用问答引擎
- 不要深改专业版控制区
- 不要重构模板主数据结构

### 5.5 交付标准

- 至少 2 到 3 个场景具备正式轻量追问流程
- 追问结果能在工作台中回显和继续使用
- 用户不需要重新组织整段描述也能继续生成

### 5.6 自测清单

- 进入首批高频场景
- 逐步触发追问流程
- 检查追问结果是否能写回输入区和后续生成状态
- 检查从历史回流时追问上下文是否还能理解

### 5.7 建议子分支名

- `feature/phase3-guided-flow-structured`

## 6. Agent C3：版本链工作流增强

### 6.1 任务目标

让版本链从“来源提示”升级到“继续这一版 / 重试这一版 / 从这一版分叉”的工作流能力。

### 6.2 负责范围

- `src/features/studio-consumer/*`
- `src/features/generation/PreviewStage.tsx`
- `src/features/generation/ResponsePanel.tsx`
- `src/features/works/workReplay.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`

### 6.3 允许目标

- 统一版本来源类型和动作命名
- 增强结果页中的版本继续动作
- 增强作品页中的版本继续和分叉表达
- 增强任务页中的重试和继续这一版表达
- 在回流链中保留更明确的父节点摘要

### 6.4 不要做的事

- 不要做复杂版本图谱
- 不要改模板结构定义
- 不要重构专业版参数控制区
- 不要引入项目级版本管理

### 6.5 交付标准

- 用户能明确区分继续、重试、分叉三种动作
- 作品、任务、结果页中的版本语义更一致
- 从历史回到工作台时版本上下文更清楚

### 6.6 自测清单

- 完成一次生成并进入结果动作
- 从作品页回流一次
- 从任务页回流一次
- 检查继续、重试、分叉动作的文案和行为是否清晰

### 6.7 建议子分支名

- `feature/phase3-version-workflow`

## 7. Agent D3：专业版控制链深化

### 7.1 任务目标

让专业版更清楚承接结构模板、Prompt、参数、Provider 和版本来源之间的控制关系。

### 7.2 负责范围

- `src/features/studio-pro/*`
- 允许接触：
  - `src/features/studio/AdvancedSettingsPanel.tsx`
  - `src/features/studio/ParameterPanel.tsx`
  - `src/features/studio/PromptComposer.tsx`
  - `src/pages/app/StudioPage.tsx`

### 7.3 允许目标

- 展示结构模板上下文
- 强化 Prompt、参数、Provider 的对应关系
- 强化来源版本到重跑控制的链路
- 增强参数快照的复用提示
- 为后续差异对比预留结构位

### 7.4 不要做的事

- 不要污染普通版输入区
- 不要重构版本链主逻辑
- 不要开始做完整调试台
- 不要扩写模板后台能力

### 7.5 交付标准

- 专业版能更清楚说明当前这一轮的结构、来源和执行关系
- Prompt、参数、Provider、来源之间的关系更清晰
- 从当前结果回到重跑和派生更顺

### 7.6 自测清单

- 打开专业版工作台
- 查看结构模板、Prompt、参数、Provider 区域
- 从当前结果重新进入控制链
- 确认普通版不出现这些增强块

### 7.7 建议子分支名

- `feature/phase3-pro-control-deepen`

## 8. Agent E3：模板-追问-执行链路对齐

### 8.1 任务目标

减少第三阶段出现“各模块各讲各的”的风险，让模板、追问、工作台、结果动作开始共享统一场景语义。

### 8.2 负责范围

- `src/features/prompt-templates/*`
- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`
- `src/pages/app/StudioPage.tsx`
- `src/features/works/workReplay.ts`

### 8.3 允许目标

- 定义首批统一场景对象和字段命名
- 对齐普通版、专业版、模板页的入口参数
- 对齐追问结果与 Prompt 填充字段
- 对齐结果动作与来源类型
- 清理命名不一致和回写断点

### 8.4 不要做的事

- 不要再做一套新的前台体验层
- 不要大范围重构所有历史逻辑
- 不要回滚前面 Agent 已经做出的结构化字段工作
- 不要引入新的抽象但不落地

### 8.5 交付标准

- 普通版、专业版、模板页使用同一套场景语义
- 追问结果与模板字段映射更稳定
- 结果动作、来源类型和工作台入口不再彼此割裂

### 8.6 自测清单

- 打开模板页、普通版、专业版
- 对比同一场景在三处的命名和入口参数
- 验证结果动作回到工作台后语义是否一致

### 8.7 建议子分支名

- `feature/phase3-flow-alignment`

## 9. 第三阶段建议集成顺序

建议按以下顺序集成：

1. Agent A3
2. Agent B3
3. Agent C3
4. Agent D3
5. Agent E3

原因：

- 先立模板结构化基础
- 再基于结构模板接正式轻量追问
- 再增强版本链工作流
- 再补专业版控制承载
- 最后统一命名、回写和入口语义

## 10. 第三阶段高冲突文件提醒

以下文件在第三阶段仍然容易冲突：

- `src/pages/app/StudioPage.tsx`
- `src/features/studio/PromptComposer.tsx`
- `src/features/works/workReplay.ts`
- `src/features/prompt-templates/*`

处理建议：

- 先明确 Agent 所有权
- 非负责人只做最小必要接触
- 集成时优先人工检查命名和状态回写是否冲突

## 11. 第三阶段总结

第三阶段的多 Agent 推进重点，是让前台已经讲清楚的产品故事，开始有真正成立的结构底座。

所以这一轮必须持续盯住两件事：

- 每个 Agent 不要只做视觉和文案调整
- 每个 Agent 都尽量补最小必要的结构层
