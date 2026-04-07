# 05 目录结构

## 典型结构

```text
project-root/
├── AGENTS.md
├── openspec/
│   ├── config.yaml
│   ├── schemas/
│   ├── changes/
│   └── bugs/
├── .opencode/
│   ├── commands/
│   ├── skills/
│   └── opencode.json
├── .claude/ 或其他 AI 目录
│   ├── commands/
│   └── skills/
└── harness-install-tasks.md
```

这是**安装到目标项目之后**的结构。

如果你是在维护 `openspec-opc` 仓库本身，当前仓库还额外包含：

```text
openspec-opc/
├── packages/
│   └── opc-guard-core/
├── plugins/
│   ├── opencode-spec-opc/
│   └── codex-spec-opc/
├── guide/
├── install-reference/
└── .template/
```

## 关键目录说明

- `openspec/config.yaml`
  项目配置中心。
- `openspec/schemas/`
  工作流定义。
- `openspec/changes/`
  每个变更的产物沉淀位置。
- `openspec/bugs/`
  每个 bugfix 工作项的产物沉淀位置。
- `commands/`
  执行器命令入口。
- `skills/`
  AI 任务能力封装。
- `.opencode/opencode.json`
  OpenCode 的插件注册入口；字段合法性以 `https://opencode.ai/config.json` 为准，当前通过 `plugin` 数组引用 `@openspec-opc/opencode-plugin`。
- `plugins/codex-spec-opc/`
  这是仓库里的 Codex 本地插件 scaffold，不是默认安装后目标项目一定会出现的目录。

## 当前仓库里的关键目录

- `packages/opc-guard-core/`
  `@openspec-opc/guard-core`，平台无关的 runtime guard 核心。
- `plugins/opencode-spec-opc/`
  `@openspec-opc/opencode-plugin`，OpenCode 适配层，只保留 OpenCode glue code。
- `plugins/codex-spec-opc/`
  `@openspec-opc/codex-plugin`，Codex 适配层和本地插件 scaffold。
- `.template/`
  安装到目标项目时会被投放的模板内容。

## 安装相关文件

- `install.md`
  AI 安装入口。
- `install-reference/stages/*.yaml`
  阶段定义。
- `install-reference/stage.schema.json`
  阶段结构约束。
