# Install Manual

本目录是 [`install.md`](../install.md) 的扩展说明书。
它包含 OpenSpec OPC 安装流程的阶段定义、lane contract、canonical result/rendering contract，以及对应校验工具。
它服务的是 AI 驱动、文档驱动、文本反馈优先的安装器，不假设浏览器页面或图形安装界面。
如果你要看 `spec-driven` 变更从 proposal 到 test-contract 再到 design/tasks 的完整示例，先看 [`docs/07-examples.md`](../docs/07-examples.md)。

## 文件说明

- `stages/*.yaml`
  - 安装阶段定义
  - 保持 YAML 作为主编辑格式，便于编写多行提示和 AI 指令
- `stage.schema.json`
  - 阶段 YAML 的结构约定
  - 约束公共元字段和各阶段专有字段
- `validate-stages.mjs`
  - Node 校验脚本
  - 读取 `stage.schema.json` 和 `stages/*.yaml`
  - 校验阶段文件是否满足当前约定
- `lanes/registry.json`
  - 安装 lane registry / manifest
  - 当前首发 lane 为 `node-ts`
- `lane-registry.mjs`
  - 加载 lane registry
  - 执行 lane 检测、Node/TS profile 解析、conformance gate 规划
- `profile-smoke-contract.mjs`
  - 为 `app / service` profile 定义最小 runtime smoke contract
  - 负责 smoke 命令发现、成功/失败语义、以及结果报告字段约定
- `conformance-contract.mjs`
  - canonical result model
  - 固定结果态、固定 gate 顺序、`partial_install` 推导规则
- `render-contract.mjs`
  - terminal result card / human report / plain-text export 的共享渲染 contract
- `stop-points.mjs`
  - `recommended / custom / abort` 共享 stop-point interaction contract
- `fixtures/node-ts-minimal/`
  - 文档驱动安装器的最小 first-success fixture
  - 同时承担 `library` profile proof
- `fixtures/node-ts-app/`
  - `app` profile fixture
  - 提供真实的 `lint / test / typecheck` 命令和期望结果产物
- `fixtures/node-ts-service/`
  - `service` profile fixture
  - 提供真实的 `lint / test / typecheck` 命令和期望结果产物
- `*.test.mjs`
  - 对 lane 检测、profile smoke contract、canonical result、rendering、stop-point 顺序做 contract tests
  - fixture walkthrough tests 还会真实执行 fixture 自己的 conformance gates 和 smoke 命令
- `upgrade/`
  - 模板升级运行时
  - 管理已安装模板的生命周期（check、dry-run、adopt、apply、rollback）
  - `stage5-upgrade-driver.mjs` 会把 stage 变量渲染成固定命令序列，也能输出 machine-readable 执行计划 JSON，避免 AI 执行器手工拼接 upgrade 命令
  - existing-project 路径的推荐顺序是 `check --plan-out` → `adopt --confirm-suspected`（仅缺 lock 时）→ `dry-run --plan-out` → 用户确认 → `apply`
  - 供 `install.md` 的 existing-project/template-upgrade 路径调用；不是下游用户的主入口
  - 详细说明见 [`upgrade/README.md`](upgrade/README.md)

## 使用方式

在仓库根目录运行：

```bash
npm --prefix openspec-opc run validate:stages
npm --prefix openspec-opc run test:install-manual
```

成功时会输出：

```text
Validated 8 stage files against stage.schema.json.
```

失败时会输出逐条错误，包含文件路径和字段位置。`test:install-manual` 还会把 gate 顺序、结果态、stop-point 动作顺序这类 contract drift 当成测试失败处理。
