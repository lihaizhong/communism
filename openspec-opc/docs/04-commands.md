# 04 命令参考

## 常用命令

### `/opsx-propose <name>`

用于创建新功能或较大变更的方案和任务拆解，默认产出 proposal、specs、test-contract、design、tasks。

### `/opsx-apply`

用于进入实现阶段，按已有 proposal/specs/test-contract/design/tasks 执行变更。

### `/opsx-bugfix <id>`

用于缺陷修复，从问题描述到修复验证形成完整闭环。

### `/opsx-spike <topic>`

用于技术调研、方案比较和结论输出。

### `/opsx-explore`

用于自由讨论、需求澄清和方向探索。

### `/opsx-archive`

用于把已完成变更归档，保留可追溯记录，并在 spec-driven 变更里连同 test-contract 一起保留工作项证据。

## 使用建议

- 先定问题类型，再选命令
- 不确定是否值得做时，先 `explore`
- 一旦进入正式变更，优先产出可归档文档
