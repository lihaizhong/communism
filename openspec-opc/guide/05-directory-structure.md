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
│   └── skills/
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

## 安装相关文件

- `install.md`
  AI 安装入口。
- `install-reference/stages/*.yaml`
  阶段定义。
- `install-reference/stage.schema.json`
  阶段结构约束。
