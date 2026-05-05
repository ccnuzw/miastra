# 图像 Skill 平台 V1 · 第二阶段多 Agent 开发任务清单

## 文档说明

- 文档目标：把第二阶段开发范围拆成可执行、可分配、可并行推进的任务清单。
- 文档定位：承接 [image-skill-platform-phase2-scope-v1.md](./image-skill-platform-phase2-scope-v1.md) 的第二阶段 backlog 文档。
- 当前状态：第二阶段 backlog 主文档。
- 更新时间：2026-05-05。

## 1. 文档结论先行

第二阶段不建议再围绕“骨架搭建”拆任务，而应围绕“体验增强”和“能力收口”拆任务。

建议继续拆成 5 个 Epic：

- E21 普通版输入体验增强
- E22 普通版结果动作与衔接增强
- E23 专业版控制链增强
- E24 模板系统升级
- E25 轻量追问与版本表达增强

一句话总结：

第二阶段继续多 Agent 并行，但每个 Agent 不再负责“新骨架”，而是负责“把已有骨架做得更像产品”。

## 2. 第二阶段分支策略

继续沿用当前总分支：

- 总分支：`feature/image-skill-platform-v1`

建议子分支：

- `feature/phase2-consumer-input-polish`
- `feature/phase2-consumer-result-flow`
- `feature/phase2-pro-control-chain`
- `feature/phase2-template-upgrade`
- `feature/phase2-guided-flow-and-versions`

## 3. 第二阶段任务总览

| Epic | 名称 | 目标 | 优先级 | 可并行程度 |
|---|---|---|---|---|
| E21 | 普通版输入体验增强 | 让普通版更轻、更顺、更像助手 | P0 | 中 |
| E22 | 普通版结果动作与衔接增强 | 让普通版结果后的继续修改更自然 | P0 | 中 |
| E23 | 专业版控制链增强 | 让专业版更完整、更可追溯、更可复用 | P0 | 中 |
| E24 | 模板系统升级 | 让模板更像工作台入口与结构模板库 | P1 | 高 |
| E25 | 轻量追问与版本表达增强 | 让高频场景更少想一步，让版本来源更清楚 | P1 | 中 |

## 4. E21 普通版输入体验增强

### 目标

继续减轻普通版输入负担，让普通版更像智能做图助手，而不是简化控制台。

### 主要任务

- T21.1 压缩普通版输入层复杂度
- T21.2 清理残余专业术语
- T21.3 强化任务入口与输入区的关系
- T21.4 强化生成前提示和空态
- T21.5 优化普通版输入区视觉优先级

### 主要文件

- `src/features/studio-home/*`
- `src/features/studio-consumer/*`
- `src/features/studio/PromptComposer.tsx`
- `src/features/studio/ParameterPanel.tsx`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 普通版输入区更聚焦任务语言
- 用户更容易从任务入口进入实际输入
- 专业术语进一步减少

## 5. E22 普通版结果动作与衔接增强

### 目标

让普通版结果页的“继续改”真正顺手，减少用户下一步犹豫。

### 主要任务

- T22.1 优化结果动作区文案和层级
- T22.2 优化动作触发后的状态反馈
- T22.3 让结果动作更明确绑定当前结果来源
- T22.4 优化结果动作后的输入恢复与焦点引导
- T22.5 继续减少“重新开始”的割裂感

### 主要文件

- `src/features/studio-consumer/ConsumerResultActions.tsx`
- `src/features/generation/PreviewStage.tsx`
- `src/features/generation/ResponsePanel.tsx`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 用户能更自然地从结果进入下一轮创作
- 动作反馈更明确
- 继续改比重新开始更顺

## 6. E23 专业版控制链增强

### 目标

把当前专业版从“最小控制视图”推进到“更完整的创作控制台”。

### 主要任务

- T23.1 增强参数快照区
- T23.2 增强 Prompt 预览与复制链
- T23.3 增强 Provider / model / 执行信息表达
- T23.4 优化专业版结果回到参数控制的链路
- T23.5 强化专业版控制区信息分组

### 主要文件

- `src/features/studio-pro/*`
- `src/features/studio/AdvancedSettingsPanel.tsx`
- `src/features/studio/PromptComposer.tsx`
- `src/features/studio/ParameterPanel.tsx`
- `src/features/provider/useProviderConfig.ts`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 专业版可见性更强
- Prompt、参数、Provider 信息更系统
- 结果回到重跑与复用更顺

## 7. E24 模板系统升级

### 目标

让模板页从 Prompt 存档页更进一步，成为真正更像模板库的前台页面。

### 主要任务

- T24.1 强化模板分类表达
- T24.2 增加模板适用说明与推荐入口
- T24.3 打通模板到普通版任务入口
- T24.4 打通模板到专业版控制面板
- T24.5 预留结构模板元信息展示位

### 主要文件

- `src/pages/app/TemplatesPage.tsx`
- `src/features/prompt-templates/*`
- `src/pages/app/StudioPage.tsx`

### 验收标准

- 模板更像模板库，不只是内容列表
- 模板和工作台关系更明确
- 为后续结构模板升级留出位置

## 8. E25 轻量追问与版本表达增强

### 目标

为 2 到 3 个高频场景接入轻量追问，并让版本来源更容易理解。

### 主要任务

- T25.1 定义首批高频场景
- T25.2 设计轻量按钮式追问
- T25.3 接入普通版输入流程
- T25.4 增强结果来源与继续这一版的表达
- T25.5 增强作品和任务中的版本来源提示

### 主要文件

- `src/features/studio-consumer/*`
- `src/features/studio-home/*`
- `src/features/works/workReplay.ts`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`

### 验收标准

- 至少 2 到 3 个场景有轻量追问
- 用户更容易理解“这是从哪一版来的”
- 继续创作路径更清晰

## 9. 第二阶段推荐多 Agent 拆分

建议继续按 5 个 Agent 拆。

| Agent | 负责 Epic | 核心目标 |
|---|---|---|
| Agent A2 | E21 | 普通版输入体验增强 |
| Agent B2 | E22 | 普通版结果动作与衔接增强 |
| Agent C2 | E23 | 专业版控制链增强 |
| Agent D2 | E24 | 模板系统升级 |
| Agent E2 | E25 | 轻量追问与版本表达增强 |

## 10. 第二阶段建议启动顺序

建议按以下顺序启动：

1. Agent A2
2. Agent B2
3. Agent C2
4. Agent D2
5. Agent E2

原因：

- 先把普通版体验进一步收口
- 再补专业版控制力
- 模板和追问在输入层更稳定后接入更合适

## 11. 第二阶段集成验收建议

第二阶段每轮集成后，至少检查：

- 普通版工作台是否更轻、更顺
- 专业版控制区是否更完整
- 模板页是否更像模板库
- 轻量追问是否不打断主流程
- 作品和任务的来源表达是否更清楚

继续保持：

- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

## 12. 第二阶段总结

第二阶段不会像第一阶段那样看起来“变化巨大”，但它决定的是产品最终是不是像产品。

所以第二阶段最重要的不是做更多，而是把以下四条线都往前再推进一层：

- 普通版更轻
- 专业版更强
- 模板更有角色
- 追问和版本表达更自然

如果你继续沿用多 Agent 方式，下一步就可以继续生成：

- 第二阶段 Agent 说明书
- 第二阶段可复制任务提示词
