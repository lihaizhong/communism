# OpenSpec 项目模板

本目录包含 OpenSpec OPC 安装时会投放到目标项目的模板文件。

## 模板结构

```text
.template/
├── openspec/
│   ├── config.yaml
│   └── schemas/
│       ├── spec-driven/
│       ├── bugfix/
│       └── spike/
├── agent-config/
│   ├── commands/
│   └── skills/
├── ci-templates/
│   ├── github-workflows/
│   ├── gitlab-ci/
│   └── hooks/
├── harness-install-tasks.md
├── AGENTS.md
└── README.md
```

当前 `.template/` 只包含：

- OpenSpec 核心配置
- AI 工具目录下的 commands / skills 模板
- CI / pre-commit 模板
- 安装任务账本模板

当前 `.template/` **不再包含**旧版 `opencode-runtime/`、`.opencode/plugins/` 或 `.opencode/vendor/` runtime 文件。

## 与插件安装的关系

OpenCode 的运行时守卫插件不再通过复制 vendored 文件接入。

当前正式安装边界是：

1. 复制 `openspec/`、`AGENTS.md`、`commands/`、`skills/`
2. 如果目标执行器是 OpenCode，创建或合并 `.opencode/opencode.json`
3. 确保其 `plugin` 数组包含 `@openspec-opc/opencode-plugin`

Codex 侧目前仍是仓库内的本地插件 scaffold，不属于 `.template/` 默认安装内容。

## 手工安装边界

如果你不是走 `install.md`，而是手工使用模板，至少需要：

```bash
cp -r .template/openspec ./
cp .template/AGENTS.md ./
cp -r .template/agent-config/commands/* <your-ai-config-dir>/commands/
cp -r .template/agent-config/skills/* <your-ai-config-dir>/skills/
```

如果目标是 OpenCode，还需要手工维护 `.opencode/opencode.json`，把 `@openspec-opc/opencode-plugin` 注册到 `plugin` 数组。

推荐最小配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@openspec-opc/opencode-plugin"]
}
```

字段合法性以官方 schema `https://opencode.ai/config.json` 为准。

## 占位符

安装阶段会替换 `{{UPPER_SNAKE_CASE}}` 占位符，主要分布在：

- `openspec/config.yaml`
- `AGENTS.md`
- `harness-install-tasks.md`
- CI / hook 模板

如果手工复制模板，也需要把这些占位符替换成目标项目的实际值。

## 说明

- `agent-config/commands/` 和 `agent-config/skills/` 提供的是流程模板，不保证绑定某个特定 agent runtime 的专有工具名。
- 这些 markdown 模板现在包含显式的 `Repository Overrides` preserve block；如果目标项目需要仓库级补充规则，优先写在该块内，后续 template upgrade 会保留这部分内容。
- 不同 AI 工具的实际接线方式，应该由安装流程或目标工具自己的配置机制决定。
- 运行时守卫状态文件仍然是 `openspec/.opencode-spec-opc-state.json`，由 `/opsx-apply` 或 `/opsx-bugfix` 的执行阶段刷新。
