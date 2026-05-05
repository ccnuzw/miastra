# 图像 Skill 平台 V1 · 第一阶段开发任务清单

## 文档说明

- 文档目标：把第一阶段开发实施方案进一步拆成可执行、可分配、可并行推进的开发任务清单。
- 文档定位：承接 [image-skill-platform-implementation-plan-v1.md](./image-skill-platform-implementation-plan-v1.md) 的开发排期与任务分配文档。
- 当前状态：第一阶段 backlog 主文档。
- 更新时间：2026-05-05。

## 1. 文档结论先行

第一阶段开发不建议按“页面一张张做完再接下一张”的线性方式推进，而建议按下面两条主线并行：

- 主线 A：统一工作台重构
- 主线 B：资产回流与继续创作链路强化

同时再挂两条侧线：

- 侧线 C：专业版最小控制视图
- 侧线 D：模板 / Provider / 文案与状态抛光

一句话总结：

先做统一工作台壳层和主链路，再由多个 Agent 按文件边界并行补普通版、专业版和回流链路。

## 2. 推荐分支策略

## 2.1 是否应该新开分支

建议：**要开，而且现在就开。**

原因：

- 当前你在 `dev` 分支上。
- 当前工作区已经有未提交的产品文档改动。
- 后面你要启用多会话、多 Agent 并行开发，如果继续直接在 `dev` 上推进，合并与回滚成本都会明显变高。

## 2.2 推荐分支模型

推荐至少使用两层分支：

- 一条总集成分支
- 多条功能子分支

建议命名：

- 总分支：`feature/image-skill-platform-v1`
- 子分支 1：`feature/studio-shell-dual-mode`
- 子分支 2：`feature/studio-consumer-flow`
- 子分支 3：`feature/studio-pro-controls`
- 子分支 4：`feature/works-tasks-replay`
- 子分支 5：`feature/templates-provider-polish`

## 2.3 推荐使用方式

最稳妥的方式是：

1. 先从当前 `dev` 切出一条总分支 `feature/image-skill-platform-v1`
2. 先把现有产品文档改动落到这条总分支
3. 后续每个 Agent 再从这条总分支切自己的功能子分支
4. 功能子分支先合回总分支
5. 总分支验证稳定后，再统一合回 `dev`

这样做的好处：

- `dev` 保持相对干净
- 多 Agent 之间不直接互相踩 `dev`
- 集成点明确
- 某个子任务失败时容易单独回退

## 2.4 不建议的做法

不建议：

- 多个 Agent 直接都往 `dev` 推
- 普通版、专业版、回流链路都在一条长分支里混改
- 一边重构工作台，一边顺手改大量无关页面

## 3. 第一阶段目标再确认

第一阶段完成的标志，不是“所有文档里的能力都做完”，而是打通这条最小闭环：

1. 用户进入工作台
2. 工作台能区分普通版和专业版
3. 普通版用户能快速完成一次文生图或图生图
4. 结果页能继续修改
5. 作品和任务都能回流到工作台继续创作
6. 专业版至少能看到并控制最关键的参数与 Prompt

## 4. 任务分层

建议把第一阶段任务分成 5 个 Epic。

| Epic | 名称 | 目标 | 优先级 | 可并行程度 |
|---|---|---|---|---|
| E1 | 统一工作台壳层 | 让 `StudioPage` 成为双模式统一入口 | P0 | 低，必须优先 |
| E2 | 普通版主链路 | 让普通用户快速开始、生成、继续改 | P0 | 中 |
| E3 | 结果回流与资产链路 | 让作品和任务都能回到工作台继续做 | P0 | 中高 |
| E4 | 专业版最小控制视图 | 让专业版具备基本控制力 | P1 | 中 |
| E5 | 模板 / Provider / 细节抛光 | 补模板和配置中心的第一阶段支撑 | P1 | 高 |

## 5. Epic 详细任务

## 5.1 E1 统一工作台壳层

### 目标

把 [StudioPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/StudioPage.tsx) 从“现有单一工作台页”升级为“双模式统一容器页”。

### 主要任务

- T1.1 梳理 `StudioPage` 当前状态依赖和数据流
- T1.2 增加工作台模式状态：普通版 / 专业版
- T1.3 保留现有三栏骨架，但改造成模式感知容器
- T1.4 抽出工作台公共上下文与共用适配层
- T1.5 保证现有生成、取消、预览、回放逻辑不被破坏

### 主要文件

- [StudioPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/StudioPage.tsx)
- [StudioEditorColumn.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/studio/StudioEditorColumn.tsx)
- [StudioGenerationColumn.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/studio/StudioGenerationColumn.tsx)
- [StudioWorksColumn.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/studio/StudioWorksColumn.tsx)

### 建议新增目录

- `src/features/studio-home/`
- `src/features/studio-consumer/`
- `src/features/studio-pro/`
- `src/features/studio-shared/`

### 依赖关系

- E2、E4 都依赖 E1 的壳层完成后才能顺畅落地。

### 验收标准

- 同一路由下可切换普通版 / 专业版
- 切换时不丢当前输入和已上传图片
- 原有生成功能仍可用

## 5.2 E2 普通版主链路

### 目标

让普通用户在新工作台中完成“开始 -> 生成 -> 继续改”的主路径。

### 主要任务

- T2.1 新增普通版任务入口区
- T2.2 新增普通版引导式输入区
- T2.3 把现有 Prompt、参数、参考图能力重新包装成普通版话术和流程
- T2.4 新增普通版结果动作区
- T2.5 打通普通版从结果继续修改的链路

### 主要文件

- [PromptComposer.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio/PromptComposer.tsx)
- [ParameterPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio/ParameterPanel.tsx)
- `src/features/studio/AdvancedSettingsPanel.tsx`
- `src/features/generation/PreviewStage.tsx`
- `src/features/generation/ResponsePanel.tsx`

### 推荐拆分

- 普通版入口与空态
- 普通版输入流程
- 普通版结果动作层

### 依赖关系

- 依赖 E1 提供模式壳层
- 可与 E3 并行，但最终要接回统一回流链路

### 验收标准

- 用户可从普通版开始一次文生图
- 用户可从普通版开始一次图生图
- 用户可从结果继续发起下一轮修改

## 5.3 E3 结果回流与资产链路

### 目标

强化“作品 -> 工作台”和“任务 -> 工作台”的再创作闭环。

### 主要任务

- T3.1 强化 `WorksPage` 中的继续做 / 再做一版入口
- T3.2 强化 `ImageViewerModal` 的回流动作
- T3.3 强化 `workReplay` 的上下文恢复能力
- T3.4 强化 `TasksPage` 的失败恢复和参数回放入口
- T3.5 统一作品回流和任务回流的用户提示

### 主要文件

- [WorksPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/WorksPage.tsx)
- `src/pages/app/TasksPage.tsx`
- `src/features/works/ImageViewerModal.tsx`
- `src/features/works/workReplay.ts`
- `src/features/works/useWorksGallery.ts`

### 服务端配合检查

- `/api/generation-tasks` 返回的快照是否够完整
- `/api/works` 中的生成快照字段是否稳定
- 任务与作品的关联是否足够清晰

### 依赖关系

- 可与 E2 并行推进
- 最终需要和 E1 集成验证

### 验收标准

- 从作品可回到工作台继续创作
- 从任务可回到工作台重跑
- 失败任务能给出明确恢复路径

## 5.4 E4 专业版最小控制视图

### 目标

在不破坏普通版体验的前提下，让专业版具备最小可用控制力。

### 主要任务

- T4.1 新增专业版控制面板容器
- T4.2 保留并整理现有高级参数区
- T4.3 新增 Prompt 查看与复制入口
- T4.4 新增参数快照摘要区
- T4.5 明确 Provider 和当前模型信息展示

### 主要文件

- [StudioEditorColumn.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/studio/StudioEditorColumn.tsx)
- [PromptComposer.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio/PromptComposer.tsx)
- [ParameterPanel.tsx](/Users/apple/Progame/newfeng/miastra/src/features/studio/ParameterPanel.tsx)
- `src/features/studio/AdvancedSettingsPanel.tsx`
- `src/features/provider/useProviderConfig.ts`

### 依赖关系

- 依赖 E1 的双模式容器
- 与 E2 在 UI 上需要明确写边界，避免互相污染

### 验收标准

- 专业版中可看到完整 Prompt
- 专业版中可看到更完整参数
- 专业版中可识别当前 Provider / model

## 5.5 E5 模板 / Provider / 细节抛光

### 目标

补足第一阶段对模板、配置中心和文案一致性的支撑。

### 主要任务

- T5.1 调整模板页文案与定位，使其更接近模板资产页
- T5.2 调整 Provider 配置页与工作台状态提示的一致性
- T5.3 补普通版 / 专业版模式相关文案
- T5.4 补更多空态、错误态、加载态

### 主要文件

- [TemplatesPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/TemplatesPage.tsx)
- `src/pages/app/ProviderConfigPage.tsx`
- [AppShell.tsx](/Users/apple/Progame/newfeng/miastra/src/layouts/AppShell.tsx)

### 依赖关系

- 可在 E1 之后较高并行度推进

### 验收标准

- 工作台、模板、配置中心文案一致
- 模式切换文案一致
- 状态反馈不打架

## 6. 适合多 Agent 的拆分方式

如果你要多会话、多 Agent 并行开发，我建议按“写入文件边界”拆，而不是按“功能名称”拆。

## 6.1 推荐 Agent 分工

### Agent A：工作台壳层

负责：

- `StudioPage`
- `studio/*Column`
- `studio-shared`

目标：

- 先把双模式容器搭出来

### Agent B：普通版主链路

负责：

- `studio-consumer`
- 普通版输入流
- 普通版结果动作层

目标：

- 让普通版路径顺手可用

### Agent C：专业版控制视图

负责：

- `studio-pro`
- Prompt / 参数 / Provider 控制层

目标：

- 让专业版最小可用

### Agent D：资产回流链路

负责：

- `WorksPage`
- `TasksPage`
- `ImageViewerModal`
- `workReplay`

目标：

- 打通继续创作与重跑闭环

### Agent E：模板 / Provider / 文案抛光

负责：

- `TemplatesPage`
- `ProviderConfigPage`
- 全局文案与状态提示

目标：

- 统一体验，减少边角割裂

## 6.2 不建议的并行方式

不建议：

- 两个 Agent 同时改 `StudioPage.tsx`
- 两个 Agent 同时改 `PromptComposer.tsx`
- 两个 Agent 同时改 `TasksPage.tsx`

因为这些文件会成为第一阶段的高冲突点。

## 6.3 并行顺序建议

最稳的顺序是：

1. Agent A 先完成 `StudioPage` 双模式壳层骨架
2. Agent B、C、D 再并行进入各自子任务
3. Agent E 可以稍晚并行，避免被反复改文案
4. 最后由一条集成分支统一验证

## 7. 第一阶段建议里程碑

## M1：双模式壳层就位

完成标志：

- `StudioPage` 已支持普通版 / 专业版切换
- 现有生成主链不坏

## M2：普通版主链路可跑

完成标志：

- 普通版文生图 / 图生图 / 结果继续改成立

## M3：回流链路打通

完成标志：

- 作品和任务都能回到工作台继续创作

## M4：专业版最小可用

完成标志：

- Prompt、参数、Provider 最小控制视图可用

## M5：集成稳定

完成标志：

- 关键手工回归通过
- smoke 通过
- 可准备进入下一阶段

## 8. 每个任务包的 DoD

每个 Agent 提交自己的任务包前，至少应满足：

- 类型检查通过
- 改动文件有清晰边界
- 不引入明显重复组件
- 文案与模式命名符合现有产品文档
- 自测过主链路

如果改到接口或状态恢复逻辑，还应补：

- 最基本的手工回归记录
- 是否影响 `WorksPage` / `TasksPage` 回流的说明

## 9. 建议的开发前动作

真正开始开发前，我建议你按这个顺序操作：

1. 先从当前 `dev` 切出总分支 `feature/image-skill-platform-v1`
2. 把当前文档改动提交到这条总分支
3. 再为每个 Agent 切子分支
4. 先让 Agent A 做双模式壳层
5. 再并行启动 B / C / D / E

## 10. 这份任务清单的作用

这份文档的价值不只是排任务，而是让后续多 Agent 开发时：

- 知道先后顺序
- 知道哪些可以并行
- 知道哪些文件不能多人同时改
- 知道集成分支该怎么收口

如果下一步要正式开工，最合理的动作就是：

- 先开总分支
- 再按这份文档把 Agent 任务拆出去
