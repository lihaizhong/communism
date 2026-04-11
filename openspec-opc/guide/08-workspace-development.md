# 08 Workspace 开发

## 适用对象

这一页不是给“安装 OpenSpec OPC 到目标项目”的使用者看的，而是给维护 `openspec-opc` 仓库本身的人看的。

如果你只是在目标项目里使用 Harness，优先看：

- [00-quick-start.md](00-quick-start.md)
- [05-directory-structure.md](05-directory-structure.md)

## 当前 workspace 结构

```text
openspec-opc/
├── package.json
├── tsconfig.base.json
├── packages/
│   └── opc-guard-core/
├── plugins/
│   ├── opencode-spec-opc/
│   └── codex-spec-opc/
├── guide/
├── install-reference/
└── .template/
```

### `packages/opc-guard-core`

包名：`@openspec-opc/guard-core`

职责：

- 平台无关的 guard 规则
- `apply-ready` 质量门
- phase 约束
- workflow 扫描
- apply state 读写

源码入口：

- `src/*.ts`

构建产物：

- `dist/*.js`
- `dist/*.d.ts`

### `plugins/opencode-spec-opc`

包名：`@openspec-opc/opencode-plugin`

职责：

- OpenCode runtime glue

源码入口：

- `src/index.ts`
- `src/index.test.ts`

构建产物：

- `dist/index.js`
- `dist/index.d.ts`
- `dist/index.test.js`

目标项目消费时，应引用：

- `plugins/opencode-spec-opc/dist/index.js`

### `plugins/codex-spec-opc`

包名：`@openspec-opc/codex-plugin`

职责：

- Codex adapter/runtime/plugin
- Codex 本地插件 scaffold

源码入口：

- `src/*.ts`

构建产物：

- `dist/*.js`
- `dist/*.d.ts`

Codex 本地插件 hook bridge 当前位于：

- `plugins/codex-spec-opc/hooks/index.mjs`

## 常用命令

在 `openspec-opc/` 根目录执行：

```bash
npm install
```

用于建立 workspace 依赖链接。

### 构建

```bash
npm run build
```

当前等价于：

```bash
npm run build:core
npm run build:opencode
npm run build:codex
```

这里已经**包含** OpenCode 插件构建。

单独构建 OpenCode 插件：

```bash
npm run build:opencode
```

### 测试

```bash
npm test
```

等价于：

```bash
npm run test:install-reference
npm run test:core
npm --prefix plugins/codex-spec-opc run test
npm --prefix plugins/opencode-spec-opc run test
```

单独跑某一层：

```bash
npm run test:install-reference
npm run test:core
npm run test:codex
npm run test:opencode
```

### Benchmark

```bash
npm run benchmark:guard
```

这个命令会先执行 `npm run build`，然后运行 `scripts/benchmark-guard.mjs`，测量两条 runtime guard 关键路径在 `10 / 100 / 500` 个活跃 work items 下的延迟：

- `collectWorkflowState()`
- `codex beforeMutation()`

用途是给后续是否要做 workflow-state caching 提供真实基线，而不是凭感觉优化。

注意：

- 这是信息性 benchmark，不属于 release gate。
- 如果你刚改了 `packages/opc-guard-core/src` 或 `plugins/codex-spec-opc/src`，优先先跑一次这个命令确认延迟没有明显恶化。
- benchmark 使用的是构建后的 `dist/` 产物，因此不要跳过前面的 build。

## 源码和产物边界

维护时只改：

- `packages/*/src`
- `plugins/*/src`
- `install-reference/*.mjs`
- `install-reference/*.test.mjs`
- `install-reference/stages/*.yaml`
- `hooks/`
- `scripts/`
- `.template/`

不要手改：

- `dist/`

`dist/` 是构建产物，应该由 TypeScript 编译生成。

## 目标项目如何消费产物

### OpenCode

推荐直接按包名消费：

```bash
npm install @openspec-opc/opencode-plugin
```

然后在 OpenCode 配置里引用：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@openspec-opc/opencode-plugin"]
}
```

这里的字段合法性以官方 schema `https://opencode.ai/config.json` 为准。

如果是 workspace 或未发布阶段的源码消费，稳定边界是：

- `plugins/opencode-spec-opc/dist/index.js`

如果你已经在 workspace 根执行了 `npm run build`，OpenCode 产物也会一起更新。
只有在你想单独重建 OpenCode 插件时，才需要单跑 `npm run build:opencode`。

### Codex

当前本地插件 scaffold 位于：

- `plugins/codex-spec-opc/.codex-plugin/plugin.json`
- `plugins/codex-spec-opc/hooks/index.mjs`

注意：`hooks.json` 仍然是 provisional contract，后续需要继续对齐真实 Codex 本地插件运行时约定。
因此当前不应把它当成 `install.md` 的正式安装目标；默认安装流只会处理 OpenCode 的插件注册。

## 当前推荐修改顺序

如果你在改 runtime enforcement：

1. 先改 `packages/opc-guard-core/src`
2. 再改对应插件的 `src`
3. 跑 `npm test`
4. 最后同步插件 README 和仓库文档

如果你在改 installer contract / stage flow：

1. 先改 `install-reference/*.mjs`、`install-reference/*.test.mjs` 或 `install-reference/stages/*.yaml`
2. 先跑 `npm run test:install-reference`
3. 再跑 `npm test`
4. 最后同步 `install-reference/README.md` 和相关 guide 文档

如果你在改 Node/TS profile 级 runtime smoke contract：

1. 先改 `install-reference/profile-smoke-contract.mjs`
2. 再改对应 fixture 的 `scripts/smoke.mjs`
3. 先跑 `npm run test:install-reference`
4. 再跑 `npm test`

如果你在改目标项目接入方式：

1. 先改包的导出边界
2. 再验证 OpenCode 是否仍然指向 `dist/` 产物
