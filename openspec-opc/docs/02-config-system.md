# 02 配置体系

## 安装到目标项目后的四层配置

### 1. `AGENTS.md`

定义 AI 助手的角色、工作方式、协作约束和输出偏好。

### 2. `openspec/config.yaml`

定义项目元数据和技术事实，例如：

- 项目名称
- 语言与运行时
- 框架与模块
- 常用命令

### 3. `openspec/schemas/`

定义工作流结构，例如：

- 阶段
- 输入输出
- 必要产物
- 检查点

### 4. AI 工具目录

例如 `.opencode/`、`.claude/`、`.cursor/`。

这里负责：

- 暴露命令入口
- 组织技能
- 把 schema 驱动的流程接到具体执行器

## 配置边界

- 行为规则放 `AGENTS.md`
- 项目事实放 `config.yaml`
- 流程逻辑放 `schemas/`
- 工具适配放 AI 配置目录

边界清晰的好处是：改协作方式不影响项目事实，改工作流不必重写命令。

## 仓库维护视角

如果你维护的是 `openspec-opc` 仓库本身，而不是目标项目，当前实现已经进一步拆成：

- `packages/opc-guard-core`
  `@openspec-opc/guard-core`，平台无关的 enforcement 核心
- `plugins/opencode-spec-opc`
  `@openspec-opc/opencode-plugin`，OpenCode 适配层
- `plugins/codex-spec-opc`
  `@openspec-opc/codex-plugin`，Codex 适配层

这层拆分是仓库实现结构，不是安装后目标项目必须长成这样。
