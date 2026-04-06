# OpenSpec 项目模板

本目录包含一个完整的 OpenSpec Harness 配置模板，可直接复制到新项目中使用。

## 模板结构

```
.template/
├── openspec/                    # OpenSpec 核心配置
│   ├── config.yaml              # 项目主配置
│   └── schemas/                # 工作流定义
│       ├── spec-driven/        # 新功能开发工作流
│       ├── bugfix/             # Bug 修复工作流
│       └── spike/              # 技术调研工作流
├── agent-config/               # AI 助手配置模板
│   ├── commands/               # 斜杠命令定义（6 个）
│   └── skills/                 # 技能定义（6 个）
├── opencode-runtime/           # OpenCode 运行时守卫插件模板
│   ├── plugins/                # OpenCode 本地插件入口
│   └── vendor/                 # vendored 插件实现
├── ci-templates/               # CI/CD 配置模板（可选）
│   ├── github-workflows/       # GitHub Actions 模板
│   ├── gitlab-ci/              # GitLab CI 模板
│   └── hooks/                  # Git hooks 模板
└── AGENTS.md                   # AI 行为指南模板
```

各目录详细结构见：
- `openspec/schemas/` → 各 schema 目录下的 `schema.yaml` 和 `templates/`
- `agent-config/commands/` → 6 个命令文件（opsx-explore, opsx-spike, opsx-propose, opsx-bugfix, opsx-apply, opsx-archive）
- `agent-config/skills/` → 6 个技能目录（与命令对应）
- `opencode-runtime/` → OpenCode 专用运行时插件（安装到 `.opencode/plugins/` 和 `.opencode/vendor/`）
- `ci-templates/` → 各平台的 CI 配置模板


## 使用方法

### 1. 复制模板

```bash
# 复制 OpenSpec 核心配置
cp -r .template/openspec ./

# 复制 AI 行为指南
cp .template/AGENTS.md ./

# 复制 AI 助手配置（根据你使用的 AI 工具选择目标目录）
cp -r .template/agent-config/commands/* .opencode/commands/     # OpenCode
# 或
cp -r .template/agent-config/commands/* .claude/commands/       # Claude Code
# 或
cp -r .template/agent-config/commands/* .cursor/commands/      # Cursor

cp -r .template/agent-config/skills/* .opencode/skills/        # OpenCode
# 或其他 AI 工具对应的目录

# 如果使用 OpenCode，额外复制运行时守卫插件
cp -r .template/opencode-runtime/plugins/* .opencode/plugins/
cp -r .template/opencode-runtime/vendor/* .opencode/vendor/

# 复制 CI/CD 配置（可选，如需要）
cp -r .template/ci-templates/github-workflows/* .github/workflows/  # GitHub Actions
# 或
cp -r .template/ci-templates/gitlab-ci/* ./                          # GitLab CI
# 或
cp -r .template/ci-templates/hooks/* .git/hooks/                     # Git hooks
```

### 2. 编辑配置文件

根据你的项目情况，编辑以下文件中的占位符（如 `PROJECT_NAME`, `TEST_COMMAND` 等）：

- `openspec/config.yaml` - 项目配置
- `AGENTS.md` - AI 行为指南
- `agent-config/commands/*.md` - AI 命令定义（可选，根据需要修改）
- `agent-config/skills/*/SKILL.md` - AI 技能定义（可选，根据需要修改）

### 3. 验证配置

```bash
openspec validate
```

## 占位符说明

模板中使用以下占位符，需要替换为实际值：

| 占位符              | 说明         | 示例                     |
| ------------------- | ------------ | ------------------------ |
| PROJECT_NAME        | 项目名称     | MyApp                    |
| PROJECT_DESCRIPTION | 项目描述     | Internal tools platform  |
| PROJECT_TYPE        | 项目类型     | frontend / backend / fullstack |
| LANGUAGE            | 编程语言     | TypeScript / Python / Go |
| RUNTIME             | 运行时       | Node.js 22 / Python 3.12 / Go 1.23 |
| PRIMARY_FRAMEWORK   | 主要框架     | Next.js / FastAPI / Gin  |
| TEST_FRAMEWORK      | 测试框架     | Vitest / Pytest / Go test |
| BUILD_TOOL          | 构建工具     | Vite / Turborepo / Maven |
| SRC_DIR             | 源码目录     | src / app / internal     |
| TEST_DIR            | 测试目录     | tests / src/tests        |
| AI_CONFIG_DIR       | AI 配置目录  | .opencode / .claude / .cursor |
| INSTALL_COMMAND     | 依赖安装命令 | pnpm install / pip install -r requirements.txt |
| DEV_COMMAND         | 开发命令     | pnpm dev / uvicorn app:app --reload |
| BUILD_COMMAND       | 构建命令     | pnpm build / go build ./... |
| TEST_COMMAND        | 测试命令     | pnpm test / pytest / go test ./... |
| TEST_UNIT_COMMAND   | 单元测试命令 | pnpm test:unit / pytest tests/unit |
| LINT_COMMAND        | 代码检查命令 | pnpm lint / ruff check . / golangci-lint run |
| TYPE_CHECK_COMMAND  | 类型或静态检查命令 | pnpm type-check / mypy . / cargo check |
| FORMAT_COMMAND      | 格式检查命令 | prettier --check . / ruff format --check . |

Schema 中的测试/源码路径描述默认使用中性占位写法，例如：

- `<tests>/<feature-test-file>`
- `<source>/<feature-source-file>`
- `<tests>/regression/<bug-id>-regression-test`

这些是文档级约定，不要求你在 `config.yaml` 里继续维护额外变量。

## 文件说明

### openspec/config.yaml

项目主配置文件，定义：

- 默认 schema
- 项目基础信息
- 技术栈和关键路径
- 开发约定
- 项目命令

### openspec/schemas/\*/schema.yaml

工作流定义文件，描述：

- 工作流的 artifacts（产物）
- 依赖关系
- 验证规则

### openspec/schemas/\_/templates/\_.md

Markdown 模板文件，用于生成各阶段文档。

### AGENTS.md

AI 助手行为指南，定义角色、工作流程和约束。

### agent-config/

AI 助手配置目录模板，包含命令定义和技能定义。安装时根据使用的 AI 工具复制到对应目录：

| AI 工具       | 目标目录        |
|--------------|----------------|
| OpenCode     | `.opencode/`   |
| Claude Code  | `.claude/`     |
| Cursor       | `.cursor/`     |
| GitHub Copilot | `.github/copilot/` |
| 其他工具      | 按工具文档配置  |

#### agent-config/commands/

斜杠命令定义文件（如 `opsx-propose.md`），描述命令的用途和基本流程。

#### agent-config/skills/

技能定义目录，包含 AI 执行命令的具体逻辑（如 `openspec-propose/SKILL.md`）。

### opencode-runtime/

OpenCode 专用运行时治理扩展。安装到目标项目后，典型结构如下：

```text
.opencode/
├── commands/
├── skills/
├── plugins/
│   └── opencode-spec-opc.js
└── vendor/
    └── opencode-spec-opc/
        └── index.js
```

作用是把 OpenSpec OPC 的流程约束从“提示词软规则”提升到“执行期硬拦截”。

当前守卫采用双门槛：

1. work item 必须 apply-ready
2. 当前 session 必须由 `/opsx-apply` 刷新 `openspec/.opencode-spec-opc-state.json`

并且还有两个自动失效条件：

1. 显式锁超过 TTL 默认 30 分钟
2. `tasks.md` 已经没有剩余未完成任务

另外还要求三相隔离：

1. `red`、`green`、`verify` 必须是不同 subagent session
2. `red` 只写测试
3. `green` 只写实现
4. `verify` 不写业务代码，只跑验证

### ci-templates/

CI/CD 配置模板目录（可选生成），包含：

- `github-workflows/` — GitHub Actions 工作流模板
- `gitlab-ci/` — GitLab CI 配置模板
- `hooks/` — Git hooks（如 pre-commit）

安装时可选择生成对应的 CI/CD 配置，详见 `ci-templates/README.md`。

## 快速开始

1. 复制模板
2. 搜索并替换所有占位符
3. 运行 `openspec validate` 验证配置
4. 开始创建你的第一个变更：
   ```bash
   openspec schema init my-change --artifacts "proposal,specs,design,tasks"
   ```
