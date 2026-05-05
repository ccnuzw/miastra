# 图像 Skill 平台 V1 · 第三阶段多 Agent 开发任务清单

## 文档说明

- 文档目标：把第三阶段开发范围拆成可执行、可分配、可并行推进的任务清单。
- 文档定位：承接 [image-skill-platform-phase3-scope-v1.md](./image-skill-platform-phase3-scope-v1.md) 的第三阶段 backlog 文档。
- 当前状态：第三阶段 backlog 主文档。
- 更新时间：2026-05-05。

## 1. 文档结论先行

第三阶段不建议再围绕“体验抛光”拆任务，而应围绕“结构化能力正式落地”拆任务。

建议继续拆成 5 个 Epic：

- E31 模板结构化基础
- E32 轻量追问正式化
- E33 版本链工作流增强
- E34 专业版控制链深化
- E35 模板-追问-执行链路对齐

一句话总结：

第三阶段继续多 Agent 并行，但每个 Agent 不再主要负责“页面体验更顺”，而是负责“让前台体验背后的结构真正成立”。

## 2. 第三阶段分支策略

继续沿用当前总分支：

- 总分支：`feature/image-skill-platform-v1`

建议子分支：

- `feature/phase3-template-schema`
- `feature/phase3-guided-flow-structured`
- `feature/phase3-version-workflow`
- `feature/phase3-pro-control-deepen`
- `feature/phase3-flow-alignment`

## 3. 第三阶段任务总览

| Epic | 名称 | 目标 | 优先级 | 可并行程度 |
|---|---|---|---|---|
| E31 | 模板结构化基础 | 让模板具备结构字段、场景、入口和展示的统一基础 | P0 | 中 |
| E32 | 轻量追问正式化 | 让首批高频场景具备正式追问步骤和状态回写 | P0 | 中 |
| E33 | 版本链工作流增强 | 让来源关系升级成继续创作、重试、分叉的工作流 | P0 | 中 |
| E34 | 专业版控制链深化 | 让专业版更明确承接结构模板、Prompt、参数和执行上下文 | P1 | 中 |
| E35 | 模板-追问-执行链路对齐 | 让普通版、专业版、模板页和结果动作的场景语义一致 | P1 | 低 |

## 4. E31 模板结构化基础

### 目标

建立首批结构模板元信息和字段基础，让模板真正成为工作台输入和展示的结构性入口。

### 主要任务

- T31.1 定义首批结构模板元信息
- T31.2 定义模板字段、场景、入口模式和推荐模式基础类型
- T31.3 让模板列表展示结构信息
- T31.4 让模板详情或模板卡片展示字段摘要
- T31.5 让工作台入口可读取首批结构模板基础字段

### 主要文件

- `src/features/prompt-templates/*`
- `src/pages/app/TemplatesPage.tsx`
- `src/pages/app/StudioPage.tsx`
- `src/features/studio-home/*`
- `src/features/studio-pro/*`

### 验收标准

- 至少首批模板具备可读的结构化元信息
- 模板不再只展示一段 Prompt 内容
- 工作台能消费模板的基础结构字段

## 5. E32 轻量追问正式化

### 目标

让 2 到 3 个高频场景拥有正式的轻量追问步骤、选项、默认值和状态回写链。

### 主要任务

- T32.1 选定首批高频场景
- T32.2 为每个场景定义问题顺序和选项结构
- T32.3 让追问结果写回普通版输入上下文
- T32.4 让追问结果进入历史和继续创作上下文
- T32.5 让追问流程保持按钮式和轻量，不回退成复杂聊天流

### 主要文件

- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/pages/app/StudioPage.tsx`
- `src/features/generation/*`
- `src/features/works/workReplay.ts`

### 验收标准

- 至少 2 到 3 个场景具备正式轻量追问流程
- 追问结果能在工作台中回显和继续使用
- 用户不需要重新组织整段描述也能继续生成

## 6. E33 版本链工作流增强

### 目标

让版本链从“来源提示”升级到“继续这一版 / 重试这一版 / 从这一版分叉”的工作流能力。

### 主要任务

- T33.1 统一版本来源类型和动作命名
- T33.2 增强结果页中的版本继续动作
- T33.3 增强作品页中的版本继续和分叉表达
- T33.4 增强任务页中的重试和继续这一版表达
- T33.5 在回流链中保留更明确的父节点摘要

### 主要文件

- `src/features/studio-consumer/*`
- `src/features/generation/PreviewStage.tsx`
- `src/features/generation/ResponsePanel.tsx`
- `src/features/works/workReplay.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`

### 验收标准

- 用户能明确区分继续、重试、分叉三种动作
- 作品、任务、结果页中的版本语义更一致
- 从历史回到工作台时版本上下文更清楚

## 7. E34 专业版控制链深化

### 目标

让专业版更清楚承接结构模板、Prompt、参数、Provider 和版本来源之间的控制关系。

### 主要任务

- T34.1 展示结构模板上下文
- T34.2 强化 Prompt、参数、Provider 的对应关系
- T34.3 强化来源版本到重跑控制的链路
- T34.4 增强参数快照的复用提示
- T34.5 为后续差异对比预留结构位

### 主要文件

- `src/features/studio-pro/*`
- `src/features/studio/AdvancedSettingsPanel.tsx`
- `src/features/studio/ParameterPanel.tsx`
- `src/features/studio/PromptComposer.tsx`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 专业版能更清楚说明“当前这一轮是按什么结构和来源执行的”
- Prompt、参数、Provider、来源之间的关系更清晰
- 从当前结果回到重跑和派生更顺

## 8. E35 模板-追问-执行链路对齐

### 目标

减少第三阶段出现“各模块各讲各的”的风险，让模板、追问、工作台、结果动作开始共享统一场景语义。

### 主要任务

- T35.1 定义首批统一场景对象和字段命名
- T35.2 对齐普通版、专业版、模板页的入口参数
- T35.3 对齐追问结果与 Prompt 填充字段
- T35.4 对齐结果动作与来源类型
- T35.5 清理命名不一致和回写断点

### 主要文件

- `src/features/prompt-templates/*`
- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/features/studio-pro/*`
- `src/pages/app/StudioPage.tsx`
- `src/features/works/workReplay.ts`

### 验收标准

- 普通版、专业版、模板页使用同一套场景语义
- 追问结果与模板字段映射更稳定
- 结果动作、来源类型和工作台入口不再彼此割裂

## 9. 第三阶段推荐多 Agent 拆分

建议继续按 5 个 Agent 拆。

| Agent | 负责 Epic | 核心目标 |
|---|---|---|
| Agent A3 | E31 | 模板结构化基础 |
| Agent B3 | E32 | 轻量追问正式化 |
| Agent C3 | E33 | 版本链工作流增强 |
| Agent D3 | E34 | 专业版控制链深化 |
| Agent E3 | E35 | 模板-追问-执行链路对齐 |

## 10. 第三阶段建议启动顺序

建议按以下顺序启动：

1. Agent A3
2. Agent B3
3. Agent C3
4. Agent D3
5. Agent E3

原因：

- 先把模板结构化基础立起来
- 再让轻量追问基于模板字段成立
- 版本链和专业版控制链随后接入更稳
- 最后由链路对齐 Agent 做统一命名和回写收口

## 11. 第三阶段集成验收建议

第三阶段每轮集成后，至少检查：

- 模板是否已经不只是 Prompt 列表
- 首批场景的追问是否正式可用
- 追问结果是否能回写工作台和历史上下文
- 继续这一版 / 重试这一版 / 分叉这一版是否语义清楚
- 专业版是否更清楚展示模板、Prompt、参数、Provider、来源之间的关系

继续保持：

- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

## 12. 第三阶段总结

第三阶段的关键不是页面再好看一点，而是系统开始真正有“结构化可持续演进”的底盘。

所以这一轮最重要的不是继续做更多外显功能，而是把以下五条链真正补成立：

- 模板是结构入口
- 追问是正式输入
- 版本是工作流节点
- 专业版是控制链承载面
- 普通版和专业版说同一套场景语言

如果继续沿用多 Agent 方式，下一步就可以继续生成：

- 第三阶段 Agent 说明书
- 第三阶段可复制任务提示词
