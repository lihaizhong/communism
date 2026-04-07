# 09 发布说明

## 当前发布策略

当前 workspace 里的三个包按同一版本发布：

- `@openspec-opc/guard-core`
- `@openspec-opc/opencode-plugin`
- `@openspec-opc/codex-plugin`

也就是说，目前采用的是：

- 单仓库
- 多包
- 锁步版本

这样做的原因很简单：

- `opencode-plugin` 和 `codex-plugin` 都依赖 `guard-core`
- 当前阶段还在快速演进结构和 API
- 锁步版本比独立版本更不容易漂

## 发布前检查

在 `openspec-opc/` 根目录执行：

```bash
npm run release:check
```

它会做三件事：

1. 检查三个包的版本号是否一致
2. 跑完整 workspace 测试
3. 对三个包执行 `npm pack --dry-run`

版本一致性检查脚本位于：

- `scripts/check-workspace-versions.mjs`

打包 dry-run 脚本位于：

- `scripts/pack-dry-run.mjs`

## 版本修改规则

如果要发布新版本：

1. 同时修改这三个文件里的 `version`
   - `packages/opc-guard-core/package.json`
   - `plugins/opencode-spec-opc/package.json`
   - `plugins/codex-spec-opc/package.json`
2. 如果插件依赖 `@openspec-opc/guard-core`
   - 同步更新依赖版本
3. 运行 `npm run release:check`

如果你只想先看打包内容，不跑完整检查，也可以单独执行：

```bash
npm run pack:dry-run
```

## 发布产物边界

真正面向消费方的内容是：

- `packages/*/dist`
- `plugins/*/dist`
- `plugins/codex-spec-opc/hooks`
- `plugins/codex-spec-opc/.codex-plugin`

不要把源码目录 `src/` 当成稳定消费边界。

具体以各包 `package.json` 的 `files` / `exports` 为准：

- `@openspec-opc/opencode-plugin`
  当前只发布 `dist/`
- `@openspec-opc/codex-plugin`
  当前发布 `dist/`、`hooks/`、`.codex-plugin/`、`hooks.json`

## 当前注意事项

- `codex-spec-opc/hooks.json` 仍然是 provisional contract
- `opencode-spec-opc` 不再依赖目标项目里的桥接 loader 文件；目标项目安装时应优先通过符合 `https://opencode.ai/config.json` 的 `.opencode/opencode.json` 引用包名，`dist/index.js` 只应视为 workspace 或本地源码开发阶段的消费边界
- 发布前应至少确保 `npm install` 已在 workspace 根执行过一次，以建立 workspace 链接
- 截至 2026-04-06，官方 OpenAI 文档可验证到 Codex 总览、Docs MCP、local shell/tool 模式，但没有看到公开稳定的 Codex 本地插件 manifest 规范；因此 `codex-spec-opc` 的 hook 形状仍应视为仓库内约定，不应对外宣称为官方格式
