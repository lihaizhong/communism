# opencode-spec-opc

`opencode-spec-opc` 是 OpenSpec OPC 在 OpenCode 里的 runtime enforcement 插件。

它不负责初始化脚手架，也不负责帮你生成 planning 工件。它只负责一件事：

**在执行期阻止 AI 绕过 OpenSpec OPC 流程，直接修改业务代码。**

如果说 OpenSpec 负责 planning，OpenSpec OPC 负责 execution discipline，那么这个插件就是把 execution discipline 真正落到工具层的那一层。

## 它现在在整体结构里的位置

当前仓库已经拆成三层：

- `packages/opc-guard-core`
  - 平台无关的 guard 核心
- `plugins/opencode-spec-opc`
  - OpenCode 运行时接线
- `plugins/codex-spec-opc`
  - Codex 运行时接线

也就是说，`opencode-spec-opc` 现在故意只保留 OpenCode 侧 glue code。
质量门、phase 规则、workflow 扫描、state 读写这些共享逻辑，已经不再堆在这个目录里。

## 它解决什么问题

只靠提示词和文档约束，AI 很容易在下面这些时候失控：

- `proposal.md`、`design.md`、`tasks.md` 还没准备好，就直接开始改代码
- 测试还没立住，就先把实现写进去了
- 会话压缩后，AI 忘了当前 work item，开始写错文件
- 文档上看起来走了流程，执行时却没有硬约束
- 已经进入实现阶段，但没有当前 session 的明确授权，AI 还是继续写业务代码

这个插件的目标就是把这些风险压下去。

## 它做什么

### 1. 识别当前 work item

插件会扫描：

- `openspec/changes/*/.openspec.yaml`
- `openspec/bugs/*/.openspec.yaml`

并据此识别当前活跃 work item。

它还会从这些操作里推断当前 session 正在处理哪个 work item：

- `bash` 中的 `openspec --change ...` / `--bugfix ...`
- 读取或修改 `openspec/changes/<name>/...`
- 读取或修改 `openspec/bugs/<name>/...`

### 2. 判定是否 `apply-ready`

当前实现不再只看“文件是否存在”，而是做一层最低质量门。

`change` 默认会检查：

- `proposal.md` 是否达到最小长度
- `proposal.md` 是否包含至少 2 个关键 section
- `design.md` 是否达到最小长度
- `design.md` 是否包含 `Affected Modules`、`Constraints` 等设计信号
- `specs/` 下是否至少存在一个带 Requirement/Scenario 结构的 spec
- `tasks.md` 是否至少包含 2 个 checklist item
- `tasks.md` 是否仍有未完成任务
- `tasks.md` 是否不是 `todo`、`fix` 这类占位任务

`bugfix` 默认会检查：

- `bug-report.md` 是否达到最小长度
- `bug-report.md` 是否包含复现、现象、预期/实际、环境等结构信号
- `fix.md` 是否达到最小长度
- `fix.md` 是否包含根因、修复方案、验证等结构信号

只有通过这些最低质量门，才允许进入业务代码变更阶段。

### 3. 阻止绕过流程的写操作

如果 AI 试图直接使用这些工具改业务代码：

- `edit`
- `write`
- `apply_patch`
- 明显带副作用的 `bash`

插件会在执行前检查：

- 当前 session 是否已经选中了 work item
- 该 work item 是否 `apply-ready`
- `openspec/.openspec-opc-state.json` 是否由当前 session 的 `/opsx-apply` 刷新
- 显式锁是否仍在 TTL 内
- 如果存在 `tasks.md`，其中是否仍有未完成任务
- 当前 phase 是否使用了对应的独立 session id
- `red` 是否只写测试，`green` 是否只写实现，`verify` 是否停止业务代码写入
- 当前 phase 是否已经满足进入下一步所需的最小证据

任一条件不满足，就直接拦截。

### 4. 允许文档和规则层继续推进

以下路径默认不拦：

- `openspec/**`
- `.opencode/**`
- `AGENTS.md`
- `CLAUDE.md`
- `opencode.json`

原因很简单，proposal、design、tasks、规则配置本来就应该继续写，不应该和业务代码混在一起管。

## 为什么这和普通 planning 工具不同

大多数 planning 工具做到这里就停了：

- 生成 proposal
- 生成 design
- 生成 tasks
- 给 AI 更多上下文

但它们通常不负责真正拦住 AI 写代码。

`opencode-spec-opc` 的价值不在于“再生成一份文档”，而在于：

**把 spec-first 和 test-first 从文档约定变成 runtime enforcement。**

这才是它存在的理由。

## 当前 enforcement 模型

### Work item selection

session 必须先进入明确的 work item 上下文。

### Apply-ready gate

没有达到最基本的 planning 条件，不能进入业务代码修改阶段。

这一步现在不只是“文件齐了”，而是“文档至少有最低有效内容”。

### Explicit apply lock

即使已经 `apply-ready`，没有当前 session 的 `/opsx-apply` 显式锁，仍然不能直接改业务代码。

### Phase isolation

当前 phase 约束：

- `red`
  - 必须使用 `redSessionId`
  - 只允许测试相关文件写入
  - 必须先写过至少一个测试文件，才能继续 doc-only 更新
- `green`
  - 必须使用 `greenSessionId`
  - 只允许实现代码写入，不允许继续改测试
  - 必须先有 red 阶段的测试写入证据
  - 第一次进入时必须先写过至少一个实现文件
- `verify`
  - 必须使用 `verifySessionId`
  - 不允许继续写业务代码，只负责验证和总结
  - 必须先有 green 阶段的实现写入证据
  - 必须先跑过至少一个验证命令，才能继续写总结类文档

### Phase evidence

插件会把阶段证据写回 `openspec/.openspec-opc-state.json`。

当前会记录：

- `redTouchedTestFiles`
  - red 阶段真正写过的测试文件
- `greenTouchedImplFiles`
  - green 阶段真正写过的实现文件
- `verifyCommands`
  - verify 阶段跑过的验证命令

当前会识别的 verify 命令包括：

- `npm test` / `pnpm test` / `yarn test` / `bun test`
- `pytest` / `vitest` / `jest`
- `go test` / `cargo test`
- `eslint` / `ruff check` / `tsc` / `biome check`
- `make test` / `make check` / `just test` / `just check`

### Session continuity

在会话压缩后保留当前选中的 work item，减少上下文折叠后“失忆绕流程”的情况。

## 已知边界

这个插件解决的是“执行期硬约束”，不是“模型永远不会胡来”。

它能做的是：

- 阻止未到阶段就落盘
- 阻止没有显式 apply 锁就直接写业务代码
- 阻止拿着过期锁继续写业务代码
- 在 `tasks.md` 已经全部完成后，使旧锁自动失效
- 阻止会话失焦后直接改业务文件
- 保证流程最少要经过 OpenSpec 工件准备
- 保证 `red -> green -> verify` 至少留下基础阶段证据
- 保证 verify 不是空转状态，而是真的跑过验证命令

它不能完全解决的是：

- 模型在回复文本里胡说
- 用户明确要求跳过流程时的组织策略
- 对所有 `bash` 写操作做 100% 精准静态判定

当前版本对 `bash` 采用的是保守启发式拦截，不是 shell parser。

## 运行时实现

当前 OpenCode 插件运行时代码主要在：

- `src/index.ts`
- `dist/index.js`

共享 guard 逻辑来自：

- `../../packages/opc-guard-core/dist/guard-engine.js`
- `../../packages/opc-guard-core/dist/state-io.js`
- `../../packages/opc-guard-core/dist/tooling.js`
- `../../packages/opc-guard-core/dist/workflow-state.js`

这一步的目的是让 OpenCode 适配层保持薄，不再承担多运行时共享核心。

## 依据的 OpenCode 插件机制

根据 OpenCode 官方文档，插件通过 JavaScript/TypeScript 模块导出函数工作，主要使用这些点：

- npm 插件入口：`.opencode/opencode.json` 里的 `plugin` 数组
- 运行时 hook：`tool.execute.before`
- 运行时 hook：`tool.execute.after`
- 压缩期 hook：`experimental.session.compacting`

参考：

- https://opencode.ai/docs/plugins/
- https://opencode.ai/docs/tools/

## 安装方式

这个目录里放的是一个可复用插件包。当前推荐的消费边界就是包本身，而不是目标项目里的桥接 loader 文件。

如果后面你把这个包发布到 npm，那么在 `opencode.json` 里加：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@openspec-opc/opencode-plugin"]
}
```

这里的字段合法性以官方 schema `https://opencode.ai/config.json` 为准。

如果是 workspace 或本地源码消费，也应该直接引用：

```text
plugins/opencode-spec-opc/dist/index.js
```

## 可调项

如果你想自定义行为，可以改成工厂函数形式：

```js
import { createOpenSpecOPCPlugin } from "/absolute/path/to/index.js"

export const OpenSpecOPCPlugin = createOpenSpecOPCPlugin({
  failClosed: true,
  allowDocWrites: true,
  allowConfigWrites: true
})
```

当前支持的选项：

- `failClosed`
  - `true`：没有 `apply-ready` 工作项时直接拦截业务代码写入
  - `false`：没有工作项时先放行，只对已识别会话做约束
- `allowDocWrites`
  - 是否允许继续写 `openspec/` 与规则文档
- `allowConfigWrites`
  - 预留位，当前实现保守保留
- `applyLockTtlMs`
  - 显式 apply 锁的有效期，默认 `1800000` 毫秒，也就是 30 分钟
