# Harness 安装任务清单

> **生成规则**：本文件由安装指南阶段 1-4 在目标项目根目录生成。
> **执行规则**：阶段 5 读取本文件，逐项执行。完成一个任务将 `[ ]` 改为 `[x]`，直到全部完成。

## 配置变量

| 变量 | 值 | 来源 |
|------|-----|------|
| `PROJECT_NAME` | | 阶段 2 用户输入 / package.json |
| `PROJECT_DESCRIPTION` | | 阶段 2 用户输入 / 现有项目文档摘要 |
| `PROJECT_TYPE` | | 阶段 1 用户选择 (new/existing) |
| `PACKAGE_MANAGER` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `LANGUAGE` | | 阶段 3 检测 |
| `RUNTIME` | | 阶段 3 检测 |
| `PRIMARY_FRAMEWORK` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `TEST_FRAMEWORK` | | 阶段 3 检测 / 用户选择 |
| `TEST_INSTALL_CMD` | | 阶段 3 记录的测试框架安装命令 |
| `TEST_STATUS` | | 阶段 3 记录 (`ready`/`pending`) |
| `TEST_BLOCKER_REASON` | | 阶段 3 记录未完成原因 |
| `BUILD_TOOL` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `DEPLOY_PLATFORM` | | 阶段 2 用户输入 |
| `SRC_DIR` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `TEST_DIR` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `INSTALL_COMMAND` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `DEV_COMMAND` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `BUILD_COMMAND` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `TEST_COMMAND` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `TEST_UNIT_COMMAND` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `LINT_COMMAND` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `TYPE_CHECK_COMMAND` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `FORMAT_COMMAND` | | 阶段 3 检测 / 阶段 2 用户输入 |
| `AI_TOOL_NAME` | | 阶段 4 用户选择 (opencode/claude/cursor/copilot) |
| `AI_CONFIG_DIR` | | 阶段 4 用户选择 (如 .opencode/) |
| `CONFIG_CONFLICT` | | 阶段 4 是否检测到目标目录冲突 (yes/no) |
| `CONFIG_CONFLICT_STRATEGY` | | 阶段 5 用户选择 (backup_overwrite/merge/coexist) |
| `CI_TYPE` | | 阶段 5 用户选择 (github/gitlab/other) |
| `CI_CONFIG_PATH` | | 阶段 5 生成并记录的 CI 配置文件路径 |
| `GENERATE_PRE_COMMIT` | | 阶段 5 用户选择是否安装 `.template/ci-templates/hooks/pre-commit` (yes/no) |
| `INTEGRATE_AI_DOCS` | | 阶段 4 用户选择 (yes/no) |
| `EXISTING_AI_DOCS` | | 阶段 4 检测到的已有 AI 文档列表 |
| `GIT_INITIALIZED` | | 前置检查 (yes/no) |
| `TECH_CATEGORY` | | 阶段 1 用户选择 |
| `INSTALL_TARGET_CONFIRMED` | | 前置检查确认 (yes/no) |
| `USER_REQUESTED_PROJECT_INIT` | | 前置检查记录 (yes/no) |
| `INSTALL_RESULT` | | 阶段 5/6 记录 (`success`/`success_with_pending`/`failed`) |

## 变量约定

- 任务账本中的变量名一律使用 `UPPER_SNAKE_CASE`
- 收集阶段的问题标识可以使用 `lower_snake_case`
- 写入任务账本前，必须完成从问题字段到任务变量的映射
- 自动检测结果优先于猜测；用户明确确认优先于自动检测

## 完成与失败判定

- 只有在产物真实存在、内容非空、且通过对应验证时，任务才可从 `[ ]` 改为 `[x]`
- 不允许通过写入 `TODO`、`TBD`、`placeholder`、`stub`、`mock`、`待补充`、`未实现` 等占位内容冒充完成
- 若文件已创建但仍包含占位内容、模板残留、空文件、空目录或缺失关键子文件，必须标记为 `[!]`，不得标记为 `[x]`
- 若任务因用户明确选择暂不完成，或因外部条件阻塞无法继续，可标记为 `pending`，但必须写明阻塞原因和下一步
- `INSTALL_RESULT = success` 或 `success_with_pending` 的前提是：所有核心任务均为 `[x]`，或存在已记录原因的 `pending`；只要存在伪完成或关键校验失败，就必须记录为 `failed`

## 执行任务

> **状态**：`[ ]` 待执行 | `[x]` 已完成 | `[-]` 跳过 | `[!]` 失败

### 核心任务（必须执行）

- [-] **T0**: 初始化 Git 仓库
  - 触发：`GIT_INITIALIZED == no`
  - 命令：`git init`

- [ ] **T1**: 执行 `openspec init`
- [ ] **T2**: 复制 Harness 模板文件
  - `.template/openspec/config.yaml` → `openspec/config.yaml`
  - `.template/openspec/schemas/*` → `openspec/schemas/*`
  - `.template/AGENTS.md` → `AGENTS.md`
  - `.template/agent-config/` → `{{AI_CONFIG_DIR}}/`（重命名 agent-config 为目标目录名）
  - 若目标已存在，先选择 `CONFIG_CONFLICT_STRATEGY`
- [ ] **T3**: 安装测试框架
  - 框架：`{{TEST_FRAMEWORK}}`
  - 命令：`{{TEST_INSTALL_CMD}}`
  - 若 `TEST_STATUS = pending`，记录阻塞原因并跳过执行
- [ ] **T4**: 清理旧版兼容性目录（如存在 `{{AI_CONFIG_DIR}}/../command/` 单数目录）
- [ ] **T5**: 填充技术栈变量
  - 替换 `openspec/config.yaml` 和 `AGENTS.md` 中的所有 `{{变量名}}`
  - 验证：`grep -E '\{\{[A-Z_]+\}\}' openspec/config.yaml AGENTS.md` 无输出
- [ ] **T6**: 验证安装清单
  - `openspec/config.yaml` 存在且格式正确
  - `openspec/schemas/` 包含 spec-driven、bugfix、spike
  - `AGENTS.md` 存在
  - `{{AI_CONFIG_DIR}}/commands/` 包含 6 个命令文件
  - `{{AI_CONFIG_DIR}}/skills/` 包含 6 个技能目录
  - `{{AI_CONFIG_DIR}}/commands/*.md` 均为非空文件
  - `{{AI_CONFIG_DIR}}/skills/*/SKILL.md` 均存在且非空
  - 关键安装文件中不得出现 `TODO`、`TBD`、`placeholder`、`stub`、`mock`、`待补充`、`未实现`
  - 不存在旧的 `command/`（单数）目录
  - CI/CD 配置文件存在
  - 若 `TEST_STATUS = pending`，在完成摘要中展示后续动作

### 条件任务（根据用户选择执行）

- [-] **T7**: 整合非技术类信息到 AGENTS.md
  - 触发：`INTEGRATE_AI_DOCS == yes`

- [-] **T8**: 生成 pre-commit hook
  - 触发：`GENERATE_PRE_COMMIT == yes`
  - 模板来源：`.template/ci-templates/hooks/pre-commit`
  - 安装位置：`.git/hooks/pre-commit` 或 `.husky/pre-commit`
