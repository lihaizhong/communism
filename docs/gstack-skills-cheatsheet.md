# gstack 技能速查表

这是一份给日常使用准备的中文版速查表。

如果你只想先记住最重要的 7 个技能，请先记这一行：

`新东西用 /office-hours，定方案用 /autoplan，出问题用 /investigate，写完后用 /review，验收用 /qa，要发版用 /ship，上线后用 /canary。`

相关文档：
- [快速使用指南](./gstack-quickstart.md)
- [完整使用指南](./gstack-complete-guide.md)

## 一句话判断法

| 你现在的情况 | 优先用哪个 skill |
| --- | --- |
| 我有个新想法，但还没想清楚 | `/office-hours` |
| 我已经有方向，想把计划做扎实 | `/autoplan` |
| 我想单独做战略/架构/设计/DX 审查 | `/plan-ceo-review` / `/plan-eng-review` / `/plan-design-review` / `/plan-devex-review` |
| 这东西坏了，我想先查根因 | `/investigate` |
| 我想看这次改动有没有坑 | `/review` |
| 我想在真实浏览器里测一遍 | `/qa` |
| 我只想拿到 bug 报告，不自动修 | `/qa-only` |
| 我准备提 PR / 发版 | `/ship` |
| PR 已经批了，准备合并并部署 | `/land-and-deploy` |
| 我刚上线，想盯一会儿生产环境 | `/canary` |
| 我想看一周做了什么 | `/retro` |

## 按阶段查找

### 1. 想清楚做什么

| Skill | 作用 | 什么时候用 |
| --- | --- | --- |
| `/office-hours` | 把模糊想法问清楚，重新定义问题 | 新产品、模糊需求、功能 brainstorming |
| `/plan-ceo-review` | 从产品和范围角度重审方案 | 你怀疑方案不够“对” |
| `/plan-eng-review` | 锁定架构、数据流、边界和测试 | 你要开始实现前 |
| `/plan-design-review` | 在写代码前把设计和交互补完整 | 有 UI/UX 的功能 |
| `/plan-devex-review` | 审查 API/CLI/SDK/文档的开发者体验 | 面向开发者的产品 |
| `/autoplan` | 自动串起多种 plan review | 不想一个个手动跑 |

### 2. 设计和体验

| Skill | 作用 | 什么时候用 |
| --- | --- | --- |
| `/design-consultation` | 从零设计风格系统和 `DESIGN.md` | 新项目还没有设计语言 |
| `/design-shotgun` | 批量出多套视觉方案给你挑 | 你知道要做什么，但不知道长什么样 |
| `/design-html` | 把设计稿或方案落成真实页面 | 设计方向已经定了 |
| `/design-review` | 对现有页面做视觉审计并修复 | 页面已经实现，想 polish |
| `/devex-review` | 真测 onboarding、文档、CLI 体验 | 已上线的开发者产品 |

### 3. 调试和审查

| Skill | 作用 | 什么时候用 |
| --- | --- | --- |
| `/investigate` | 先调查根因，再决定怎么修 | bug、500、奇怪行为 |
| `/review` | 代码审查，找 CI 不一定能抓到的问题 | 功能写完、提 PR 前 |
| `/codex` | 让另一个模型给第二意见 | 需要交叉验证时 |
| `/cso` | 安全审计，偏 OWASP / STRIDE | 发布前安全检查、定期审计 |
| `/health` | 跑项目健康度、类型检查、测试、lint 等 | 想看代码库总体状态 |

### 4. 浏览器、QA 和线上验证

| Skill | 作用 | 什么时候用 |
| --- | --- | --- |
| `/browse` | 给 agent 一个真实浏览器 | 浏览、截图、交互、取证 |
| `/open-gstack-browser` | 打开可视化 GStack Browser | 你想亲眼看 agent 怎么操作页面 |
| `/setup-browser-cookies` | 导入本机浏览器 cookies | 要测登录后页面 |
| `/qa` | 系统化测试并自动修 bug | 回归、验收、提测 |
| `/qa-only` | 只出问题报告，不改代码 | 先盘点问题再决定是否修 |
| `/benchmark` | 性能基准和前后对比 | 看 Web Vitals、资源体积、速度 |
| `/canary` | 部署后持续盯线上 | 刚发版，担心有回归 |

### 5. 发布和文档

| Skill | 作用 | 什么时候用 |
| --- | --- | --- |
| `/ship` | 同步分支、跑检查、建 PR | 代码准备提交 |
| `/setup-deploy` | 配置部署信息 | 第一次接入部署流程 |
| `/land-and-deploy` | 合并 PR 并验证上线 | PR 已通过审批 |
| `/document-release` | 根据 diff 自动补文档 | 代码发出去后同步 README/架构/说明 |

### 6. 协作、记忆和安全

| Skill | 作用 | 什么时候用 |
| --- | --- | --- |
| `/pair-agent` | 把浏览器会话共享给别的 agent | 多 agent 协作 |
| `/learn` | 查看和管理 gstack 的项目记忆 | 回看经验、偏好、旧坑 |
| `/checkpoint` | 保存和恢复工作现场 | 切分任务、跨会话恢复 |
| `/careful` | 危险命令预警 | 生产环境、共享环境 |
| `/freeze` | 把编辑范围锁到一个目录 | 调试时防止误改 |
| `/guard` | 同时开启 careful + freeze | 高风险操作 |
| `/unfreeze` | 解除编辑范围限制 | 工作范围要放大时 |
| `/gstack-upgrade` | 升级 gstack | 发现技能过旧或缺失时 |

## 三条常用工作流

### 新功能

`/office-hours` → `/autoplan` → 实现 → `/review` → `/qa` → `/ship`

### 修 bug

`/investigate` → 修复 → `/review` → `/qa`

### 上线

`/ship` → `/land-and-deploy` → `/canary`

## 最容易踩的坑

- 不要一上来就 `/review`。如果问题是“为什么坏了”，先 `/investigate`。
- 不要把 `/qa` 当成 `/browse`。`/browse` 是浏览器能力，`/qa` 是完整测试流程。
- 不要只跑 plan review 里的一个，除非你明确知道自己只缺哪一类审查。
- 不要把 `/ship` 理解成“git push”。它是完整发布前流程。

## 推荐记忆法

- 想法不清楚：`/office-hours`
- 方案不扎实：`/autoplan`
- 行为不正常：`/investigate`
- 改动不放心：`/review`
- 页面要验收：`/qa`
- 代码要发出：`/ship`
- 线上要观察：`/canary`
