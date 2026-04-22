# OpenSpec OPC

> A personal AI dev harness built on OpenSpec, with runtime enforcement that blocks code changes until spec and test gates are ready.

OpenSpec OPC 是一个基于 OpenSpec 的个人 AI 开发 Harness。

它不只负责生成 `proposal.md`、`design.md`、`test-contract.md`、`tasks.md` 这类 planning 工件。它还会在执行期把关，防止 AI 跳过流程直接修改业务代码。

如果你想要的不是“让 AI 随便写点代码试试”，而是“让 AI 在一个可追溯、可约束、可验证的流程里工作”，这就是它的目标。

人类文档请先看 [`docs/README.md`](docs/README.md)，按顺序阅读。
AI 安装入口是 [`install.md`](install.md)，它的扩展说明书在 [`install-manual/README.md`](install-manual/README.md)。

## 它解决的不是写代码，而是管住 AI 什么时候能写代码

大多数同类工具主要做 planning：

- 帮你整理需求
- 生成设计文档
- 拆分任务
- 给 AI 更多上下文

这些都重要。但真正容易失控的地方在后面：

- spec 还没写清楚，AI 就开始改代码
- 测试还没立住，AI 就把实现写进去了
- 会话压缩后，AI 忘了当前 work item，开始乱改别的文件
- 文档看起来走了流程，执行时却没有硬约束

OpenSpec OPC 的核心差异就在这里：

**它把 spec-first 和 test-first 从“建议”变成“执行期约束”。**

## 三个核心能力

### 1. Spec-first planning

围绕 work item 生成和维护结构化工件：

- `proposal.md`
- `design.md`
- `test-contract.md`
- `specs/`
- `tasks.md`

目标很简单，先把要做什么讲清楚，再进入实现。

### 2. Test-gated execution

不是写完再补测试，而是把验证路径提前纳入流程。

你可以把它理解成：

- spec 定义“要做什么”
- test 定义“怎样才算对”
- code 只是让前两者落地

### 3. Runtime enforcement

这是 OpenSpec OPC 最重要的能力。

在没有进入 `apply-ready` 前，AI 不应该直接改业务代码。即使已经 `apply-ready`，没有当前 session 的显式 `/opsx-apply` 锁，也不能直接写。在 `red / green / verify` 不同阶段，写入边界也不同。

这不是提示词约束，是执行期治理。

## 典型工作流

### 新功能

1. `/opsx-propose add-dark-mode`
2. 生成并完善：
   - `proposal.md`
   - `design.md`
   - `test-contract.md`
   - `specs/`
   - `tasks.md`
3. 进入 `/opsx-apply`
4. 按 `red -> green -> verify` 推进
5. 验证完成后归档

### Bug 修复

1. `/opsx-bugfix button-not-working`
2. 记录 bug 描述、复现步骤、根因分析
3. 建立修复方案和回归验证路径
4. 进入执行阶段
5. 完成验证和留痕

### 技术调研

1. `/opsx-spike evaluate-state-management`
2. 明确问题、约束、候选方案
3. 记录实验、对比和结论
4. 再决定是否进入变更流程

## 适合谁

适合：

- 单人项目
- 与 AI 高频协作的仓库
- 希望把“设计 -> 实现 -> 验证”固定成套路的人
- 不想靠记忆和自觉维持流程纪律的人

不适合：

- 只想快速 vibe coding，不想要流程约束
- 不愿意写 spec、任务和测试的人
- 需要完整项目管理平台的人

## 系统组成

OpenSpec OPC 由三层组成：

### 1. Planning Layer

定义 `change`、`bugfix`、`spike` 等工作流，以及对应工件。

### 2. Execution Layer

把 planning 工件转成 AI 可执行命令和阶段化流程。

### 3. Enforcement Layer

在执行期检查：

- 当前 work item 是否有效
- 是否达到 `apply-ready`
- 是否存在当前 session 的显式 apply 锁
- 当前 phase 是否允许这类写操作

## 仓库结构

如果你是在维护 `openspec-opc` 本身，而不是只把它安装到目标项目里，可以把当前仓库理解成三块：

- `packages/opc-guard-core`
  - `@openspec-opc/guard-core`，平台无关的 runtime guard 核心
- `plugins/opencode-spec-opc`
  - `@openspec-opc/opencode-plugin`，当前正式安装路径对应的 OpenCode 适配层
- `plugins/codex-spec-opc`
  - `@openspec-opc/codex-plugin`，实验性的 Codex scaffold / 适配层

也就是说：

- planning 和 workflow 定义仍然在 `openspec/` 模板体系里
- 共享 enforcement 规则在 `opc-guard-core`
- 不同执行器只保留各自的 runtime glue

多运行时并行维护时，建议使用 workspace 聚合脚本和统一检查清单：

- `npm run build:plugins`
- `npm run test:plugins`
- `plugins/CHANGE-CHECKLIST.md`

## 为什么不是只用 OpenSpec

OpenSpec 很适合做 planning layer。OpenSpec OPC 做的是再往前走一步：

- 不只生成工件
- 不只沉淀上下文
- 还要在执行期约束 AI 的写入权限

可以把它理解成：

**OpenSpec 提供 planning foundation，OpenSpec OPC 提供 execution discipline。**

## 快速开始

最简单的方式，是把当前版本对应的 `install.md` 交给 AI 执行器：

```text
openspec-opc/install.md
```

For AI Agents:
Read and follow the instructions in `install.md`.
The `.template` directory is located in the same directory as `install.md`.

如果你是从 GitHub 某个分支、tag 或提交阅读本仓库，请使用同一 ref 下的 `openspec-opc/install.md`，不要跳回 `main`。

安装过程会自动完成：

- 检查前置依赖
- 收集项目信息
- 创建目录结构
- 填充配置文件
- 验证安装结果
- 如果目标是 OpenCode，写入符合 `https://opencode.ai/config.json` 的 `.opencode/opencode.json`，并在 `plugin` 数组里注册 `@openspec-opc/opencode-plugin`

当前 Codex 侧仍然是实验性的本地插件 scaffold，不属于 `install.md` 默认落地的正式安装路径。

## 先看效果：Zero-Install Preview

如果你还没决定要不要把 OpenSpec OPC 接进自己的仓库，可以先直接看安装成功后的结果卡，不需要跑真实安装流。

在 `openspec-opc/` 目录执行：

```bash
node ./scripts/preview-demo.mjs
```

如果你已经装好了 workspace 依赖，也可以执行：

```bash
npm run preview:demo
```

默认会依次展示 `library / app / service` 三种 `Node/TS` profile 的真实预期结果卡；如果你只想看其中一种：

```bash
node ./scripts/preview-demo.mjs --profile app
```

这个 preview 直接重放 `install-manual/fixtures/*/expected/install-result.txt`，所以它和当前 contract tests 锁定的是同一份 first-success 输出，而不是单独维护一套 marketing 文案。

## 核心概念

### SDD + TDD 双驱动流程

```text
想法/需求
    ↓
SDD: 编写规格 (Specs) -> 定义"做什么"
    ↓
TDD: 编写测试 -> 定义"期望的行为"
    ↓
AI 辅助实现代码 -> 让测试通过
    ↓
验证与归档
```

核心原则：没有规格的代码不编码，没有测试的实现不提交。

### 安装到目标项目后的分层

| 文件/目录             | 作用 |
| --------------------- | ---- |
| `AGENTS.md`           | 定义 AI 如何协作、有哪些行为边界 |
| `openspec/config.yaml`| 定义项目元数据、技术栈、常用命令 |
| `openspec/schemas/`   | 定义工作流阶段、产物、检查点 |
| AI 工具 commands/skills | 把工作流暴露成可执行命令 |

## Template Upgrade Runtime

OpenSpec OPC now includes a template upgrade system that manages the lifecycle of installed templates. Instead of re-running the installer and hoping nothing breaks, you can now:

- **Check** current state against the template
- **Preview** changes before applying them
- **Adopt** legacy projects that were installed without a lock file
- **Apply** upgrades with rollback safety
- **Rollback** to previous state if something goes wrong

For downstream projects, keep using `openspec-opc/install.md` as the AI executor entrypoint. The upgrade runtime is the execution engine behind the existing-project upgrade path, and the CLI is mainly for local debugging, fixture work, or direct runtime verification.

Current upgrade semantics:
- Canonical lock path is `.openspec-opc/.openspec-opc-template-lock.json` and the older `.openspec-opc/template-lock.json` path is only kept for read compatibility.
- `AGENTS.md` upgrades preserve the repository-specific constraints block instead of hard-overwriting the whole file.
- Supported CI assets (`.github/workflows/openspec-archive.yml` and `.gitlab-ci.yml`) upgrade with job-level merge so unrelated user jobs are not deleted.
- Managed markdown commands and `SKILL.md` files preserve user-added frontmatter keys, while local body edits remain conflict-protected.
- Commands and `SKILL.md` templates now also expose a `Repository Overrides` preserve block for repository-specific body guidance that should survive template upgrades.

### Quick Usage

```bash
# Check if project needs updates
cd install-manual/upgrade
./cli.mjs check --project /path/to/project --bundle /path/to/template-bundle

# Preview what would change (shows top 50 by default)
./cli.mjs dry-run --project /path/to/project --bundle /path/to/template-bundle
./cli.mjs dry-run --full --project /path/to/project --bundle /path/to/template-bundle  # Show all
./cli.mjs dry-run --project /path/to/project --bundle /path/to/template-bundle --plan-out /path/to/project/.openspec-opc/install-upgrade-plan.txt

# Adopt a legacy project (no lock file)
./cli.mjs adopt --project /path/to/project --bundle /path/to/template-bundle
./cli.mjs adopt --project /path/to/project --bundle /path/to/template-bundle --confirm-suspected

# Apply upgrade (creates rollback package automatically)
./cli.mjs apply --project /path/to/project --bundle /path/to/template-bundle

# Rollback if needed
./cli.mjs rollback --project /path/to/project
./cli.mjs list-rollbacks --project /path/to/project
```

See [`install-manual/upgrade/README.md`](install-manual/upgrade/README.md) for full documentation.

## 文档导航

### 入门必读

| 文档 | 内容 | 建议顺序 |
| ---- | ---- | -------- |
| [00-快速开始](docs/00-quick-start.md) | 5 分钟入门教程 | 第 1 步 |
| [01-概览](docs/01-overview.md) | 系统整体介绍、核心概念 | 第 2 步 |
| [02-配置体系](docs/02-config-system.md) | `AGENTS.md`、`config.yaml`、`schemas` 详解 | 第 3 步 |
| [03-工作流](docs/03-workflows.md) | `spec-driven`、`bugfix`、`spike` 详解 | 第 4 步 |

### 使用参考

| 文档 | 内容 | 使用时机 |
| ---- | ---- | -------- |
| [04-命令参考](docs/04-commands.md) | 所有 `/opsx-*` 命令速查 | 日常使用 |
| [05-目录结构](docs/05-directory-structure.md) | 完整目录说明 | 需要了解组织方式 |
| [06-最佳实践](docs/06-best-practices.md) | 模式与反模式 | 进阶使用 |
| [07-示例演示](docs/07-examples.md) | 端到端完整示例 | 需要完整流程参考 |
| [08-Workspace 开发](docs/08-workspace-development.md) | workspace 包结构、build/test、dist 消费方式 | 维护这个仓库本身时 |
| [09-发布说明](docs/09-release.md) | 版本策略、发布前检查、消费边界 | 准备发布这些包时 |
| [CHANGELOG.md](CHANGELOG.md) | 已发布版本的摘要与手动发布顺序 | 准备发版或回看变更时 |
| [DESIGN.md](DESIGN.md) | 安装器、结果卡、报告和 stop-point 的设计基线 | 扩展新 lane 或调整输出语言前 |

### 扩展阅读

| 文档 | 内容 | 适用场景 |
| ---- | ---- | -------- |
| [03-工作流](docs/03-workflows.md) | Schema 选择和决策树 | 不确定用哪个工作流 |
| [03-工作流](docs/03-workflows.md) | Spike 与 Explore 的使用边界 | 不确定用 `spike` 还是 `explore` |
