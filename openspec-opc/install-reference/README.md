# Install Reference

本目录包含 OpenSpec OPC 安装流程的阶段定义、lane contract、canonical result/rendering contract，以及对应校验工具。

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
- `lanes/registry.json`
  - 安装 lane registry / manifest
  - 当前首发 lane 为 `node-ts`
- `lane-registry.mjs`
  - 加载 lane registry
  - 执行 lane 检测、Node/TS profile 解析、conformance gate 规划
- `conformance-contract.mjs`
  - canonical result model
  - 固定结果态、固定 gate 顺序、`partial_install` 推导规则
- `render-contract.mjs`
  - terminal result card / human report / plain-text export 的共享渲染 contract
- `stop-points.mjs`
  - `recommended / custom / abort` 共享 stop-point interaction contract
- `*.test.mjs`
  - 对 lane 检测、canonical result、rendering、stop-point 顺序做 contract tests

## 使用方式

在仓库根目录运行：

```bash
npm --prefix openspec-opc run validate:stages
npm --prefix openspec-opc run test:install-reference
```

成功时会输出：

```text
Validated 8 stage files against stage.schema.json.
```

失败时会输出逐条错误，包含文件路径和字段位置。`test:install-reference` 还会把 gate 顺序、结果态、stop-point 动作顺序这类 contract drift 当成测试失败处理。
