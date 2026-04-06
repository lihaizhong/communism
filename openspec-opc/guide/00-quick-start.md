# 00 快速开始

## 目标

用最短路径把 OpenSpec OPC 接入你的项目，并开始第一次变更。

## 5 分钟路径

1. 把 [install.md](/Users/lihaizhong/Documents/Project/communism/openspec-opc/install.md) 交给 AI 执行器。
2. 让 AI 按阶段完成前置检查、项目识别、配置选择和安装。
3. 安装完成后，确认以下内容已经存在：
   - `openspec/config.yaml`
   - `openspec/schemas/`
   - `AGENTS.md`
   - 对应 AI 工具目录下的 `commands/` 和 `skills/`
   - 如果目标是 OpenCode，还应已经配置好对 `@openspec-opc/opencode-plugin` 或其 `dist/index.js` 产物的引用
4. 通过 `/opsx-propose <change-name>`、`/opsx-bugfix <bug-id>` 或 `/opsx-spike <topic>` 启动第一次流程。

## 推荐顺序

1. 阅读 [01-overview.md](/Users/lihaizhong/Documents/Project/communism/openspec-opc/guide/01-overview.md)
2. 阅读 [02-config-system.md](/Users/lihaizhong/Documents/Project/communism/openspec-opc/guide/02-config-system.md)
3. 阅读 [03-workflows.md](/Users/lihaizhong/Documents/Project/communism/openspec-opc/guide/03-workflows.md)
4. 需要命令细节时查 [04-commands.md](/Users/lihaizhong/Documents/Project/communism/openspec-opc/guide/04-commands.md)

## 最小心智模型

- `AGENTS.md` 定义 AI 怎么协作
- `openspec/config.yaml` 定义项目是什么
- `openspec/schemas/` 定义工作流怎么跑
- `{{AI_CONFIG_DIR}}/commands` 定义命令入口
- OpenCode 通过 `.opencode/opencode.json` 的 `plugin` 数组接入 runtime guard
- Codex 侧当前只有本地插件 scaffold，还不属于默认安装流

## 下一步

如果你已经完成安装，直接去看 [07-examples.md](/Users/lihaizhong/Documents/Project/communism/openspec-opc/guide/07-examples.md)。
