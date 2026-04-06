# 05 目录结构

## 典型结构

```text
project-root/
├── AGENTS.md
├── openspec/
│   ├── config.yaml
│   ├── schemas/
│   └── changes/
├── .opencode/ 或其他 AI 目录
│   ├── commands/
│   ├── skills/
│   ├── plugins/
│   └── vendor/
└── harness-install-tasks.md
```

## 关键目录说明

- `openspec/config.yaml`
  项目配置中心。
- `openspec/schemas/`
  工作流定义。
- `openspec/changes/`
  每个变更的产物沉淀位置。
- `commands/`
  执行器命令入口。
- `skills/`
  AI 任务能力封装。
- `plugins/`
  OpenCode 本地插件入口，负责加载运行时守卫。
- `vendor/`
  vendored OpenCode runtime 插件实现，避免安装后依赖外部绝对路径。

## 安装相关文件

- `install.md`
  AI 安装入口。
- `install-reference/stages/*.yaml`
  阶段定义。
- `install-reference/stage.schema.json`
  阶段结构约束。
