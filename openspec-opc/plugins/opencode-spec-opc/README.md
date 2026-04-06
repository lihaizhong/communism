# opencode-spec-opc

`opencode-spec-opc` 是一个给 OpenCode 用的运行时治理插件，不负责初始化脚手架，只负责在执行期把关 OpenSpec OPC 流程。

它的目标很直接：

- 允许 AI 继续读代码、读文档、写 `openspec/` 工件
- 允许 AI 调整 `.opencode/`、`AGENTS.md`、`CLAUDE.md` 这类规则与配置
- 在没有进入 apply-ready 状态前，阻止 AI 直接改业务代码
- 即使已经 apply-ready，没有当前 session 的 `/opsx-apply` 显式锁文件，也阻止 AI 直接改业务代码
- 在会话压缩后保留当前选中的 work item，避免上下文折叠后“失忆”绕流程

## 依据的 OpenCode 插件机制

根据 OpenCode 官方文档，插件通过 JavaScript/TypeScript 模块导出函数工作，主要使用这些点：

- 项目级插件目录：`.opencode/plugins/`
- npm 插件入口：`opencode.json` 里的 `plugin` 数组
- 运行时 hook：`tool.execute.before`
- 运行时 hook：`tool.execute.after`
- 压缩期 hook：`experimental.session.compacting`

参考：

- https://opencode.ai/docs/plugins/
- https://opencode.ai/docs/tools/

## 当前插件做了什么

### 1. 识别 OpenSpec 工作项

插件会扫描：

- `openspec/changes/*/.openspec.yaml`
- `openspec/bugs/*/.openspec.yaml`

并据此识别当前活跃 work item。

### 2. 判定 apply-ready

当前实现采用保守规则：

- `change` 需要同时存在 `proposal.md`、`design.md`、`tasks.md`
- `bugfix` 需要同时存在 `bug-report.md`、`fix.md`

只有满足这些条件，才视为可以进入业务代码变更阶段。

### 3. 记录当前会话选中的 work item

插件会从这些操作里推断会话当前在处理哪个 work item：

- `bash` 中的 `openspec --change ...` / `--bugfix ...`
- 读取或修改 `openspec/changes/<name>/...`
- 读取或修改 `openspec/bugs/<name>/...`

### 4. 阻止绕过流程的写操作

如果 AI 尝试使用这些工具直接改业务代码：

- `edit`
- `write`
- `apply_patch`
- 明显带副作用的 `bash`

插件会先检查：

- 当前 session 是否已经选中了 work item
- 该 work item 是否 apply-ready
- `openspec/.opencode-spec-opc-state.json` 是否由当前 session 的 `/opsx-apply` 刷新
- 显式锁是否仍在 TTL 内
- 如果存在 `tasks.md`，其中是否仍有未完成任务
- 当前 phase 是否使用了对应的独立 session id
- `red` 是否只写测试、`green` 是否只写实现、`verify` 是否停止业务代码写入

任一条件不满足，就直接抛错阻止执行。

### 5. 允许文档与配置层修改

以下路径默认不拦：

- `openspec/**`
- `.opencode/**`
- `AGENTS.md`
- `CLAUDE.md`
- `opencode.json`

这是为了不阻塞 proposal/design/tasks 的生成与规则本身的维护。

## 接入模板

仓库里现在已经自带“目标项目接入模板”生成器，可以直接产出目标项目中的 `.opencode/plugins/opencode-spec-opc.js`。

执行：

```bash
node /absolute/path/to/openspec-opc/plugins/opencode-spec-opc/scripts/render-loader.js /path/to/target-project
```

输出文件：

```text
/path/to/target-project/.opencode/plugins/opencode-spec-opc.js
```

生成后的文件内容非常薄，只负责把目标项目的 OpenCode 插件入口转发到这个仓库里的插件实现：

```js
export { OpenSpecOPCPlugin } from "/absolute/path/to/openspec-opc/plugins/opencode-spec-opc/index.js"
```

## 安装方式

这个目录里放的是一个可复用插件包，不会被 OpenCode 自动加载。实际使用时有两种接法。

### 方式 A：作为项目本地插件文件引入

推荐直接用上面的生成器。如果你要手工接，也可以在目标项目的 `.opencode/plugins/opencode-spec-opc.js` 写：

```js
export { OpenSpecOPCPlugin } from "/absolute/path/to/openspec-opc/plugins/opencode-spec-opc/index.js"
```

适合你现在这类“先在仓库里固化插件源码，再让其他项目引用”的场景。

### 方式 B：作为 npm 包引入

如果后面你把这个包发布到 npm，那么在 `opencode.json` 里加：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-spec-opc"]
}
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
  - `true`：没有 apply-ready 工作项时直接拦截业务代码写入
  - `false`：没有工作项时先放行，只对已识别会话做约束
- `allowDocWrites`
  - 是否允许继续写 `openspec/` 与规则文档
- `allowConfigWrites`
  - 预留位，当前实现保守保留
- `applyLockTtlMs`
  - 显式 apply 锁的有效期，默认 `1800000` 毫秒，也就是 30 分钟

当前 phase 约束：

- `red`
  - 必须使用 `redSessionId`
  - 只允许测试相关文件写入
- `green`
  - 必须使用 `greenSessionId`
  - 只允许实现代码写入，不允许继续改测试
- `verify`
  - 必须使用 `verifySessionId`
  - 不允许继续写业务代码，只负责验证和总结

## 已知边界

这个插件解决的是“执行期硬约束”，不是“模型绝不会想绕规则”。

也就是说它能做的是：

- 阻止未到阶段就落盘
- 阻止没有显式 apply 锁就直接写业务代码
- 阻止拿着过期锁继续写业务代码
- 在 `tasks.md` 已经全部完成后，使旧锁自动失效
- 阻止会话失焦后直接改业务文件
- 保证流程最少要经过 OpenSpec 工件准备

它不能完全解决的是：

- 模型在回复文本里胡说
- 用户明确要求跳过流程时的组织策略
- 对所有 `bash` 写操作做 100% 精准静态判定

当前版本对 `bash` 采用的是保守启发式拦截，不是 shell parser。
