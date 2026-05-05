# 图像 Skill 平台 V1 · 最终合并前检查与发布前收口建议

## 文档说明

- 文档目标：基于 `feature/image-skill-platform-v1` 当前代码状态、文档状态和发布门禁，给出“是否可以合回 `dev`”以及“发布前还应执行哪些收口动作”的明确建议。
- 文档定位：承接 [image-skill-platform-phase9-review-v1.md](./image-skill-platform-phase9-review-v1.md)、[deployment-runbook.md](./deployment-runbook.md)、[release-regression.md](./release-regression.md) 与 [image-skill-platform-phase9-release-execution-v1.md](./image-skill-platform-phase9-release-execution-v1.md) 的最终收口文档。
- 当前状态：最终合并前检查与发布前收口建议文档。
- 更新时间：2026-05-05。

## 1. 结论先行

当前这条分支已经**具备进入最终手工验收与合回 `dev` 准备阶段的条件**。

更直接一点说：

- 不需要再开“第十阶段多 Agent 大开发”
- 也不建议继续扩结构或扩新功能
- 现在最合理的动作已经变成：
  1. 最终手工验收
  2. 最终回归执行
  3. 合回 `dev`
  4. 按发布手册进入上线准备

一句话收口：

这条分支现在不是“继续开发态”，而是“发布收口态”。

## 2. 当前状态判断

### 2.1 Git 状态

当前分支：

- `feature/image-skill-platform-v1`

当前工作区：

- 干净

相对 `dev`：

- `dev...feature/image-skill-platform-v1` 为 `0 13`
- 即：当前特性分支领先 `dev` 共 `13` 个提交，`dev` 没有额外领先提交

这意味着：

- 分支合并路径清晰
- 当前不存在“先同步 `dev` 再判断”的前置阻塞

### 2.2 最近提交序列

当前主链最近关键提交包括：

- `14a560b` `feat: integrate phase1 studio dual-mode flows`
- `4365bd2` `feat: refine phase2 studio experience and template flows`
- `75585a5` `feat: add phase3 structured template and replay flows`
- `1005b3b` `feat: refine phase4 schema and skill entry flows`
- `2a2dcdb` `feat: add phase5 runtime contracts and compare flows`
- `702950f` `feat: deepen phase6 contract runtime and replay flows`
- `490b651` `feat: harden phase7 release-readiness flows`
- `aa7384e` `feat: finalize phase8 runtime and release prep flows`
- `29742de` `feat: finalize phase9 release execution readiness`

可以看出：

- 第 1 到第 9 阶段的主线已经完整沉淀为连续提交链
- 当前分支历史足够清晰，可用于合回 `dev`

## 3. 当前门禁状态

本次最终检查确认以下门禁已通过：

- `git diff --check`
- `npm run typecheck`
- `npm run test:smoke:client`
- `npm run build`

另外从 [package.json](/Users/apple/Progame/newfeng/miastra/package.json) 可以确认，标准发布门禁仍是：

```bash
npm run release:check
```

它会顺序执行：

```bash
test:smoke -> test:regression -> build -> build:server
```

这意味着：

- 当前前端层已经没有阻塞性问题
- 真正进入发布前，还应再按标准执行一轮 `release:check`

## 4. 文档与执行准备状态

当前与发布直接相关的文档已经成型：

- [deployment-runbook.md](./deployment-runbook.md)
- [release-regression.md](./release-regression.md)
- [image-skill-platform-phase9-release-execution-v1.md](./image-skill-platform-phase9-release-execution-v1.md)

这 3 份文档已经分别覆盖：

- 环境、部署和启动边界
- 自动化门禁和基础手工 smoke
- 第九阶段双模式、模板入口、版本回流、专业版连续链的最终验收与上线执行清单

所以从文档准备角度看：

- 发布前收口材料已经够用

## 5. 是否可以合回 `dev`

## 5.1 结论

**可以准备合回 `dev`，但建议在合回前先完成最后一轮人工收口动作。**

这里的“最后一轮人工收口动作”不是再做开发，而是：

1. 执行标准自动化门禁 `npm run release:check`
2. 执行基础手工 smoke
3. 执行第九阶段最终验收清单
4. 若发现少量问题，只做小修复
5. 若无问题，再合回 `dev`

## 5.2 为什么不建议现在直接盲合

不是因为系统还不稳，而是因为：

- 当前已经进入最终收口区
- 这时最重要的是把“最后一轮最终验收”做完
- 如果直接合回，后续仍大概率要在 `dev` 上做最后几处小修，会让收口动作分散

所以更稳的做法是：

- 在当前特性分支完成最后一轮最终验收
- 把必要的小修补掉
- 然后再合回 `dev`

## 6. 合回前建议执行的最终检查

建议固定按以下顺序执行，不要打乱。

### 6.1 自动化门禁

```bash
npm run release:check
```

结论要求：

- 任何一步失败，都不进入合回 `dev`

### 6.2 基础手工 smoke

执行 [release-regression.md](./release-regression.md) 的基础手工 smoke：

- 认证
- Provider
- 任务
- 作品
- 导出

### 6.3 第九阶段最终验收

执行 [image-skill-platform-phase9-release-execution-v1.md](./image-skill-platform-phase9-release-execution-v1.md)：

- 普通版最短起手链
- 模板入口到工作台
- 版本回流主链
- 专业版连续链
- 异常态与恢复态
- 上线前最小闭环

### 6.4 最终差异确认

建议合回前再做一次：

```bash
git diff --stat dev...feature/image-skill-platform-v1
```

目的不是再审全部代码，而是确认：

- 本轮合并的范围与预期一致
- 没有夹带不该进本次上线的杂项

## 7. 合回 `dev` 的建议方式

建议走非破坏性、可追溯方式。

推荐流程：

1. 保持当前分支完成最终验收
2. 切到 `dev`
3. 拉取最新 `dev`（如果你们远端有新提交）
4. 执行普通 merge
5. 在 `dev` 上再跑一次最低限度检查

建议命令顺序：

```bash
git checkout dev
git merge --no-ff feature/image-skill-platform-v1
npm run release:check
```

如果 `release:check` 和手工 smoke 都通过，再进入发布阶段。

不建议：

- 用 `reset --hard`
- 用破坏式覆盖
- 在未做最终手工验收前就匆忙合回

## 8. 合回后建议做的最小检查

合回 `dev` 后，至少再确认这几件事：

- `npm run release:check` 再跑一遍
- `/app/studio` 双模式能打开
- `/app/templates` 能进入普通版和专业版
- `/app/tasks` 与 `/app/works` 回流正常
- 专业版连续链仍可执行至少一轮

这一步是为了避免：

- 合并本身带来隐藏冲突
- `dev` 上的最终状态与特性分支不一致

## 9. 发布前最后收口建议

如果你问我“现在还缺什么”，答案已经不是功能，而是这 4 个动作：

1. 跑 `release:check`
2. 做最终手工验收
3. 合回 `dev`
4. 按运行手册做发布前准备

不建议再做的事：

- 不建议开启第十阶段产品开发
- 不建议继续大改 UI
- 不建议继续补新模板体系能力
- 不建议继续引入新的结构抽象

因为现在最重要的是：

- 把已经成型的 V1 稳定落地

## 10. 最终建议

### 10.1 如果目标是“尽快进入上线准备”

建议你下一步直接做：

1. 在当前分支执行 `npm run release:check`
2. 执行 [release-regression.md](./release-regression.md)
3. 执行 [image-skill-platform-phase9-release-execution-v1.md](./image-skill-platform-phase9-release-execution-v1.md)
4. 若无问题，合回 `dev`

### 10.2 如果目标是“先做最后一轮谨慎验收”

建议你：

1. 按第九阶段最终验收清单完整走一轮
2. 只修真正阻塞上线的问题
3. 然后合回 `dev`

## 11. 一句话结论

当前 `feature/image-skill-platform-v1` 已经具备进入最终手工验收、合回 `dev` 和发布准备的条件。  
现在最需要的不是继续开发，而是把最终验收和上线执行动作做扎实。
