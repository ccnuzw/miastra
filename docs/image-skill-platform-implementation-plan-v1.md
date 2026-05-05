# 图像 Skill 平台 V1 · 第一阶段开发实施方案

## 文档说明

- 文档目标：把当前产品文档体系转成可执行的第一阶段开发方案，明确开发顺序、代码落点、里程碑和验收标准。
- 文档定位：承接 [image-skill-platform-product-map-v1.md](./image-skill-platform-product-map-v1.md) 的实施级文档。
- 当前状态：开发实施方案主文档。
- 更新时间：2026-05-05。

## 1. 实施结论先行

这次开发不应采用“推翻重做”的方式，而应采用：

- 保留现有路由骨架
- 重构 `StudioPage` 为统一创作主入口
- 利用 `WorksPage` 和 `TasksPage` 承接结果回流与任务追踪
- 逐步把现有 Prompt、参数、作品、Provider、任务能力重新组织成普通版与专业版双模式

一句话总结：

先重构前台入口和视图层，再逐步接入 Skill 化能力，而不是先重写底层。

## 2. 当前代码现状映射

## 2.1 前端现有主页面

| 路由 | 页面 | 当前角色 | 在新方案中的目标角色 |
|---|---|---|---|
| `/app/studio` | [StudioPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/StudioPage.tsx) | 单一工作台页，集合 Prompt、参数、生成状态和作品列 | 升级为双模式统一创作页 |
| `/app/templates` | [TemplatesPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TemplatesPage.tsx) | Prompt 模板资产页 | 逐步升级为模板资产与模板管理页 |
| `/app/works` | [WorksPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/WorksPage.tsx) | 作品墙与批量导出页 | 升级为结果资产页与继续创作入口 |
| `/app/tasks` | `src/pages/app/TasksPage.tsx` | 任务列表与状态页 | 升级为任务追踪、失败恢复与专业追溯页 |
| `/app/providers` | `src/pages/app/ProviderConfigPage.tsx` | Provider 配置页 | 保持为执行配置页，供专业版深度使用 |
| `/app/billing` | `src/pages/app/BillingPage.tsx` | 额度与支付页 | 保持为统一权益页 |

## 2.2 前端现有核心模块

| 模块 | 当前文件 | 当前职责 | 第一阶段建议 |
|---|---|---|---|
| 工作台参数与输入 | `src/features/studio/*` | Prompt、参数、高级设置、风格 token | 重组为普通版输入层和专业版控制层 |
| 生成与状态 | `src/features/generation/*` | 发起生成、展示进度与响应 | 保持为执行主链，新增模式适配 |
| 参考图 | `src/features/references/*` | 上传与管理参考图 | 继续复用，补普通版动作表达 |
| 作品 | `src/features/works/*` | 作品列表、查看器、重放 | 扩展为结果回流与版本继续创作主层 |
| Prompt 模板 | `src/features/prompt-templates/*` | 模板保存、使用、刷新 | 先保留，后续逐步升级为模板系统基础版 |
| Provider | `src/features/provider/*` | Provider 配置与测试 | 保留为专业版高级配置能力 |
| 抽卡与多图 | `src/features/draw-card/*` | 多图候选与批次逻辑 | 第一阶段继续保留，但收进专业控制层 |

## 2.3 服务端现有核心接口

第一阶段优先复用已有接口：

- `/api/generation-tasks`
- `/api/works`
- `/api/prompt-templates`
- `/api/provider-config`
- `/api/billing/*`

结论：

- 第一阶段不需要先新增大批接口才能启动前端改造。
- 服务端更多是补字段、补上下文、补版本关联，而不是推翻重写。

## 3. 实施原则

- 保持现有登录、路由和应用壳稳定。
- 以 `StudioPage` 为第一主战场，不先新建第二套工作台。
- 以“用户主流程打通”为优先，不以“高级功能铺满”为优先。
- 以“可渐进重构”为原则，不做一次性大爆破改动。
- 普通版先跑通，专业版同步预留，但第一阶段只做关键能力。
- 服务端优先补上下文字段，不急着抽象完整 Skill Engine。

## 4. 第一阶段目标

第一阶段不是做完整 Skill 平台，而是完成下面这条真实可用链路：

1. 用户进入工作台
2. 选择普通版或进入专业版
3. 发起一次文生图或图生图
4. 看结果
5. 基于结果继续创作一次
6. 结果进入作品与任务系统
7. 用户可从作品或任务中回到工作台继续

如果这条链路打通，就说明前台骨架已经成立。

## 5. 第一阶段范围拆分

## 5.1 P0 必做

- `StudioPage` 重构为模式感知页面
- 普通版首屏入口与引导式创作流程
- 结果页动作化继续创作入口
- 专业版最小可用控制视图
- 作品回流到工作台
- 任务回流到工作台
- 模式切换状态保持

## 5.2 P1 建议做

- 模板视图增强
- Prompt 可见与复制
- 参数重跑
- 任务详情信息增强
- Provider 状态提示优化

## 5.3 P2 后续做

- 模板 DSL 真正配置化
- 动态追问引擎
- Prompt 顾问模式
- 完整版本图谱
- 多 Provider 降级策略

## 6. 开发路径总览

建议按 6 个阶段推进。

## 6.1 阶段 0：开发准备与基线冻结

目标：

- 在改主工作台前先确认当前功能基线可回归

前端动作：

- 记录现有 `StudioPage`、`WorksPage`、`TasksPage` 的关键交互
- 补齐必要截图或操作说明

服务端动作：

- 确认 `/api/generation-tasks`、`/api/works`、`/api/provider-config` 本地可联调

验收：

- `npm run typecheck`
- `npm run test:smoke:client`
- 现有工作台能正常生成、查看作品、回放参数

## 6.2 阶段 1：统一工作台壳层重构

目标：

- 不改变主路由，先把 `StudioPage` 从单一专业面板重构成“双模式容器页”

核心页面：

- [StudioPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/StudioPage.tsx)
- [AppShell.tsx](/Users/apple/Progame/newfeng/miastra/src/layouts/AppShell.tsx)

建议改造：

- 在 `StudioPage` 增加模式状态，支持普通版 / 专业版切换
- 把现有三栏骨架保留，但根据模式显示不同内容
- 顶部文案从“提示词、参数、参考图都集中在这里”调整为更中性的统一工作台表述

建议新增模块：

- `src/features/studio-home/`
- `src/features/studio-consumer/`
- `src/features/studio-pro/`
- `src/features/studio-shared/`

阶段产出：

- 双模式容器存在
- 当前生成逻辑不丢
- 能在同一页面内切换两种视图

## 6.3 阶段 2：普通版主链路落地

目标：

- 让普通用户先能顺手完成一次任务

前端重点：

- 在 `StudioPage` 中新增普通版首页/引导态
- 把原 `PromptComposer`、`ParameterPanel` 里的部分能力重组为普通版输入流程
- 把专业术语折叠或隐藏

重点文件：

- [PromptComposer.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio/PromptComposer.tsx)
- [ParameterPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio/ParameterPanel.tsx)
- `src/features/studio/AdvancedSettingsPanel.tsx`
- `src/features/generation/PreviewStage.tsx`

建议做法：

- 保留现有状态 hook，不先推翻 `useStudioSettings`
- 先做普通版专用 UI 包装层
- 通过包装层调用原有参数与生成逻辑

阶段验收：

- 普通用户能完成文生图
- 普通用户能上传图进行图生图
- 普通用户能在结果后触发一次继续创作动作

## 6.4 阶段 3：结果回流与资产链路落地

目标：

- 打通“结果 -> 作品 -> 再创作”和“任务 -> 追踪 -> 回到工作台”

前端重点：

- 强化 `WorksPage` 的“继续做 / 再做一版”
- 强化 `TasksPage` 的“失败恢复 / 查看结果 / 参数回放”
- 强化 `ImageViewerModal` 和 `workReplay` 的角色

重点文件：

- [WorksPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/WorksPage.tsx)
- `src/pages/app/TasksPage.tsx`
- `src/features/works/workReplay.ts`
- `src/features/works/ImageViewerModal.tsx`

服务端补充建议：

- 确保任务记录中保留足够的参数快照
- 确保作品与任务之间能稳定回溯

阶段验收：

- 从作品能回到工作台继续做
- 从任务能回到工作台重跑
- 失败任务可以清晰恢复

## 6.5 阶段 4：专业版关键能力落地

目标：

- 在不破坏普通版流程的前提下，把专业版最关键的控制力补齐

前端重点：

- Prompt 可见
- 参数可见
- Provider 可见
- 模板与结果重跑可见

建议优先级：

1. Prompt 查看与复制
2. 参数快照查看
3. 模板选择与快速套用
4. Provider 状态与入口强化

阶段验收：

- 专业用户能理解当前任务如何生成
- 专业用户能基于结果重跑
- 普通版主路径不被污染

## 6.6 阶段 5：Skill 化准备层

目标：

- 为下一阶段真正的模板系统、动态追问和 Prompt 归档做数据与结构预留

建议动作：

- 把工作台内部“任务输入”与“最终请求参数”分层
- 逐步记录更多生成快照上下文
- 为模板来源、模式来源、父版本 ID 预留字段

这一阶段可以不全部暴露到 UI，但需要为后续架构留口子。

## 7. 推荐代码落点

## 7.1 建议保留不动的主骨架

- `src/routes/AppRouter.tsx`
- `src/layouts/AppShell.tsx`
- `server/src/server.ts`

原因：

- 登录态、导航壳和主路由已经稳定
- 第一阶段应减少无收益的路由级重构

## 7.2 建议重点重构的前端文件

- `src/pages/app/StudioPage.tsx`
- `src/pages/app/studio/StudioEditorColumn.tsx`
- `src/pages/app/studio/StudioGenerationColumn.tsx`
- `src/pages/app/studio/StudioWorksColumn.tsx`
- `src/features/studio/PromptComposer.tsx`
- `src/features/studio/ParameterPanel.tsx`
- `src/features/works/ImageViewerModal.tsx`
- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`

## 7.3 建议新增的前端目录

- `src/features/studio-home/`
- `src/features/studio-consumer/`
- `src/features/studio-pro/`
- `src/features/studio-shared/`

建议职责：

- `studio-home`：任务入口、最近继续创作、场景卡
- `studio-consumer`：普通版输入流、结果动作流
- `studio-pro`：专业版控制面板、Prompt 与参数视图
- `studio-shared`：模式切换、共用数据适配器、共用卡片

## 7.4 服务端第一阶段建议

第一阶段服务端优先做轻改造：

- 复核任务快照字段是否足够
- 复核作品与任务回放链路是否稳定
- 复核 Provider 解析信息是否能回传到前端

不建议第一阶段先做：

- 全新模板系统后端
- 全新 Skill Engine 路由
- 大范围数据迁移

## 8. 联调与测试策略

## 8.1 每阶段最少检查项

- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

服务端有改动时补：

- `npm run typecheck:server`
- `npm run test:smoke:server`

## 8.2 每阶段手工回归最少覆盖

- 登录后进入工作台
- 发起一次文生图
- 发起一次图生图
- 生成完成后查看结果
- 从作品继续做
- 从任务重跑
- 打开 Provider 配置

## 9. 第一阶段完成定义

满足以下条件，即可认为第一阶段开发完成：

- `StudioPage` 已成为普通版和专业版的统一入口
- 普通版主链路可用
- 专业版最小控制视图可用
- 作品和任务都能回流到工作台继续创作
- 现有生成、作品、任务和 Provider 能力没有被重构破坏

## 10. 开发顺序建议

最务实的实际开发顺序如下：

1. 重构 `StudioPage` 为双模式容器
2. 做普通版首屏和引导式输入层
3. 保持现有生成逻辑接通
4. 做普通版结果动作层
5. 加强 `WorksPage` 的继续做能力
6. 加强 `TasksPage` 的回放与失败恢复
7. 补专业版 Prompt / 参数 / Provider 控制
8. 最后再补模板增强和 Skill 化预留

这条顺序的核心逻辑是：

- 先打通用户主路径
- 再补控制力
- 最后再做更深的能力抽象

## 11. 风险与控制点

风险 1：

把工作台当成全新页面重写，导致现有生成和回放能力断掉。

控制：

- 保留现有 hook 和生成主链，先重构外层视图。

风险 2：

普通版做成“旧专业版删参数”，体验依然重。

控制：

- 普通版必须重新组织输入，不是简单隐藏面板。

风险 3：

专业版被拖到后面，最后普通版不断加补丁，重新变复杂。

控制：

- 第一阶段就保留专业版模式入口，并做最小可用控制面板。

风险 4：

作品和任务没有真正回流，导致继续创作仍然割裂。

控制：

- 阶段 3 必须作为硬阶段执行，不能省略。

## 12. 这份实施方案的本质

这份方案不是单纯的页面改版计划，而是：

- 用现有 React + Vite 工作台为壳
- 用现有 generation / works / templates / provider / tasks 能力为底
- 分阶段把它重构成“普通版快速上手 + 专业版深度控制”的统一图像 Skill 平台前台

下一步如果要真正开工，最直接的动作就是：

- 先把 `StudioPage` 的双模式容器做出来
- 然后按本文件第 10 节顺序推进
