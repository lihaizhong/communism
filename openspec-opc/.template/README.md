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
├── custom/                     # AI 助手配置模板
│   ├── commands/               # 斜杠命令定义（6 个）
│   └── skills/                 # 技能定义（6 个）
├── ci-templates/               # CI/CD 配置模板（可选）
│   ├── github-workflows/       # GitHub Actions 模板
│   ├── gitlab-ci/              # GitLab CI 模板
│   └── hooks/                  # Git hooks 模板
└── AGENTS.md                   # AI 行为指南模板
```

各目录详细结构见：
- `openspec/schemas/` → 各 schema 目录下的 `schema.yaml` 和 `templates/`
- `custom/commands/` → 6 个命令文件（opsx-explore, opsx-spike, opsx-propose, opsx-bugfix, opsx-apply, opsx-archive）
- `custom/skills/` → 6 个技能目录（与命令对应）
- `ci-templates/` → 各平台的 CI 配置模板


## 使用方法

### 1. 复制模板

```bash
# 复制 OpenSpec 核心配置
cp -r .template/openspec ./

# 复制 AI 行为指南
cp .template/AGENTS.md ./

# 复制 AI 助手配置（根据你使用的 AI 工具选择目标目录）
cp -r .template/custom/commands/* .opencode/commands/     # OpenCode
# 或
cp -r .template/custom/commands/* .claude/commands/       # Claude Code
# 或
cp -r .template/custom/commands/* .cursor/commands/      # Cursor

cp -r .template/custom/skills/* .opencode/skills/        # OpenCode
# 或其他 AI 工具对应的目录

# 复制 CI/CD 配置（可选，如需要）
cp -r .template/ci-templates/github-workflows/* .github/workflows/  # GitHub Actions
# 或
cp -r .template/ci-templates/gitlab-ci/* ./                          # GitLab CI
# 或
cp -r .template/ci-templates/hooks/* .git/hooks/                     # Git hooks
```

### 2. 编辑配置文件

根据你的项目情况，编辑以下文件中的占位符（如 PROJECT_NAME, PACKAGE_MANAGER 等）：

- `openspec/config.yaml` - 项目配置
- `AGENTS.md` - AI 行为指南
- `custom/commands/*.md` - AI 命令定义（可选，根据需要修改）
- `custom/skills/*/SKILL.md` - AI 技能定义（可选，根据需要修改）

### 3. 验证配置

```bash
openspec validate
```

## 占位符说明

模板中使用以下占位符，需要替换为实际值：

| 占位符              | 说明         | 示例                     |
| ------------------- | ------------ | ------------------------ |
| PROJECT_NAME        | 项目名称     | MyApp                    |
| PROJECT_DESCRIPTION | 项目描述     | A web application for... |
| LANGUAGE            | 编程语言     | TypeScript               |
| RUNTIME             | 运行时       | Node.js >=22.0.0         |
| PACKAGE_MANAGER     | 包管理器     | pnpm                     |
| TEST_FRAMEWORK      | 测试框架     | vitest                   |
| WEB_FRAMEWORK       | Web 框架     | Next.js 15               |
| UI_FRAMEWORK        | UI 框架      | React 19 + Tailwind CSS  |
| MODULE_NAME         | 模块名称     | src, lib                 |
| MODULE_PURPOSE      | 模块用途     | Core implementation      |
| MODULE_SCOPE        | 模块范围     | Business logic           |
| MODULE_TESTS_PATH   | 模块测试路径 | src/tests/               |
| TEST_DIR            | 测试目录     | src/tests/               |
| SRC_DIR             | 源码目录     | src/                     |
| AI_CONFIG_DIR       | AI 配置目录  | .opencode / .claude / .cursor |

## 文件说明

### openspec/config.yaml

项目主配置文件，定义：

- 默认 schema
- 技术栈信息
- 项目模块结构
- 开发约定
- 常用命令

### openspec/schemas/\*/schema.yaml

工作流定义文件，描述：

- 工作流的 artifacts（产物）
- 依赖关系
- 验证规则

### openspec/schemas/\_/templates/\_.md

Markdown 模板文件，用于生成各阶段文档。

### AGENTS.md

AI 助手行为指南，定义角色、工作流程和约束。

### custom/

AI 助手配置目录模板，包含命令定义和技能定义。安装时根据使用的 AI 工具复制到对应目录：

| AI 工具       | 目标目录        |
|--------------|----------------|
| OpenCode     | `.opencode/`   |
| Claude Code  | `.claude/`     |
| Cursor       | `.cursor/`     |
| GitHub Copilot | `.github/copilot/` |
| 其他工具      | 按工具文档配置  |

#### custom/commands/

斜杠命令定义文件（如 `opsx-propose.md`），描述命令的用途和基本流程。

#### custom/skills/

技能定义目录，包含 AI 执行命令的具体逻辑（如 `openspec-propose/SKILL.md`）。

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
