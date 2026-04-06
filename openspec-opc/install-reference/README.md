# Install Reference

本目录包含 OpenSpec OPC 安装流程的阶段定义、任务账本模板和校验工具。

## 文件说明

- `stages/*.yaml`
  - 安装阶段定义
  - 保持 YAML 作为主编辑格式，便于编写多行提示和 AI 指令
- `stage.schema.json`
  - 阶段 YAML 的结构约定
  - 约束公共元字段和各阶段专有字段
- `validate-stages.mjs`
  - Node 校验脚本
  - 读取 `stage.schema.json` 和 `stages/*.yaml`
  - 校验阶段文件是否满足当前约定

## 使用方式

在仓库根目录运行：

```bash
npm --prefix openspec-opc run validate:stages
```

成功时会输出：

```text
Validated 8 stage files against stage.schema.json.
```

失败时会输出逐条错误，包含文件路径和字段位置。
