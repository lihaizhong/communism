# OpenSpec Harness 安装指南

> **AI 指令**：本文档指导你完成 Harness 环境搭建。**逐阶段执行，不要跳过任何步骤。**

---

## ⚠️ 前置要求（必须）

**MUST: 全局安装 OpenSpec CLI**

> 📖 **OpenSpec CLI 安装文档**: https://github.com/Fission-AI/OpenSpec/

### 检查安装状态

首先检查是否已安装 OpenSpec CLI：

```bash
openspec --version
```

### 未安装？选择安装方式

如果未安装，向用户询问：

```
未检测到 OpenSpec CLI，这是运行本指南的必需工具。

是否自动全局安装？
[是] npm install -g @fission-ai/openspec@latest
[否] 稍后手动安装
```

#### 选项 A：自动全局安装

如果用户选择「是」，执行：

```bash
npm install -g @fission-ai/openspec@latest
openspec --version  # 验证安装
```

✅ 安装成功 → 继续执行后续步骤

#### 选项 B：手动安装

如果用户选择「否」或自动安装失败：

```
请手动安装 OpenSpec CLI：

📖 官方安装指南：https://github.com/Fission-AI/OpenSpec/

安装完成后，请重新运行本指南：
🔗 <当前文档的完整地址>
```

> **注意**：`<当前文档的完整地址>` 是用户获取本 install.md 的完整 URL，例如：
> `https://github.com/lihaizhong/communism/blob/main/openspec-opc/install.md`

---

❌ **如果用户拒绝安装且未手动完成安装，则立即停止执行。**

---

## 🎯 安装流程速览

```
┌──────────────────────────────────────────────────────────────┐
│  1. 检查 openspec CLI 安装                                   │
├──────────────────────────────────────────────────────────────┤
│  2. 收集项目信息（新项目/老项目 + 项目类型）                  │
├──────────────────────────────────────────────────────────────┤
│  3. 执行 openspec init（仅创建目录结构）                     │
├──────────────────────────────────────────────────────────────┤
│  4. AI 从 .template 拷贝并填充配置                           │
├──────────────────────────────────────────────────────────────┤
│  5. 完成验证                                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 阶段 1：收集项目信息

### Step 1.1 新项目 or 老项目？

向用户展示：

```
你好！我来帮你搭建 OpenSpec Harness 环境。

请告诉我你的情况：
A) 从零创建新项目
B) 已有项目，想引入 Harness
```

### Step 1.2 项目类型

**如果选 A（新项目）：**

```
请选择项目类型：
1) Web 前端项目（React/Vue/Angular 等）
2) 客户端项目（Electron/Tauri/React Native 等）
3) 服务端项目（Node.js/Go/Java 等）
4) 全栈项目（Next.js/Nuxt 等）
```

**如果选 B（老项目）：**

> 🎯 **ACTION**: 自动检测技术栈 → 展示报告 → 用户确认

---

## 阶段 2：项目类型专属问题

根据项目类型询问：

| 项目类型     | 必问问题                                                                     |
| ------------ | ---------------------------------------------------------------------------- |
| **Web 前端** | 框架(React/Vue/Angular)、构建工具、包管理器、测试框架、TypeScript?、项目名称 |
| **客户端**   | 平台(桌面/移动/跨平台)、框架(Electron/Tauri/Flutter)、包管理器、项目名称     |
| **服务端**   | 语言/运行时、Web框架、数据库、ORM、认证方案、部署目标、项目名称              |
| **全栈**     | 全栈框架(Next.js/Nuxt等)、渲染模式、数据库、ORM、认证、部署平台、项目名称    |

---

## 阶段 3：老项目自动检测

> 🎯 **ACTION**: 仅对老项目执行

### 检测清单

> ⚠️ **以下检测清单仅为示例**（针对 Node.js/Web 前端项目）。实际使用时，请根据阶段 2 确定的项目类型（Web 前端/客户端/服务端/全栈），采用对应技术栈的检测逻辑。

**示例：Node.js/Web 前端项目检测项**

```
□ 检查 package.json → Node.js 项目确认
  □ 解析 dependencies: next→Next.js, react→React, vue→Vue
  □ 解析 devDependencies: vitest→Vitest, jest→Jest
□ 检查 lock 文件: pnpm-lock.yaml→pnpm, yarn.lock→yarn
□ 检查配置文件: next.config.js→Next.js, tailwind.config.js→Tailwind
```

**其他项目类型的检测思路：**

| 项目类型 | 关键检测文件/特征 | 示例 |
|---------|------------------|------|
| **Go 服务端** | `go.mod` | 模块名、Go 版本、依赖 |
| **Java 服务端** | `pom.xml` / `build.gradle` | 构建工具、Spring 版本 |
| **Python 服务端** | `requirements.txt` / `pyproject.toml` | 依赖包、Python 版本 |
| **Rust 客户端** | `Cargo.toml` | 包名、依赖、特性 |
| **Flutter 客户端** | `pubspec.yaml` | SDK 版本、依赖 |
| **Tauri 客户端** | `src-tauri/Cargo.toml` + `package.json` | 混合技术栈 |

### 检测报告模板

```
🔍 技术栈检测报告

📋 检测结果：
├─ 项目类型: Web 前端（Next.js 全栈）
├─ 框架: Next.js 15
├─ 渲染模式: [未检测，请确认]
├─ 语言: TypeScript
├─ 包管理器: pnpm
├─ 测试框架: Vitest
└─ 运行时: Node.js >=18.0.0

⚠️ 需要确认：渲染模式、数据库
[确认无误] [修改配置]
```

---

## 阶段 3.5：AI 配置目录检测与选择

### Step 3.5.1 扫描已存在的 AI 配置

检测以下目录：

| AI 工具     | 配置目录           | 检测标志          |
| ----------- | ------------------ | ----------------- |
| OpenCode    | `.opencode/`       | `opencode.json`   |
| Claude Code | `.claude/`         | `settings.json`   |
| Cursor      | `.cursor/`         | `rules/`          |
| Copilot     | `.github/copilot/` | `instructions.md` |
| VS Code     | `.vscode/`         | `settings.json`   |

**决策分支：**

- **0 个目录** → 进入 Step 3.5.2
- **1 个目录** → 询问："检测到 [工具] 配置，是否在此更新？"
- **2+ 个目录** → 多选界面："选择要更新的目录"

### Step 3.5.2 检测当前运行的 AI

通过以下信号检测：

- `OPENCODE_SESSION_ID` → OpenCode
- `CLAUDE_CODE_VERSION` → Claude Code
- `CURSOR_VERSION` → Cursor

> 🎯 **ACTION**: 如果检测到新工具，询问是否创建配置目录。

### Step 3.5.3 确认目标目录

显示并确认：

```
📁 目标 AI 配置目录：[路径]

将创建：
├── commands/ (6 个命令文件)
└── skills/ (6 个技能目录)

[确认安装] [更换目录] [取消]
```

### Step 3.5.4 检测已存在的 AI 文档（老项目）

> 🎯 **ACTION**: 仅对老项目执行 —— 检测根目录下是否已有 AI 指导文档

**检测文件列表：**

| 文件名 | 说明 |
|--------|------|
| `AGENTS.md` | OpenCode / 通用 AI 指南 |
| `CLAUDE.md` | Claude Code 项目文档 |
| `IFLOW.md` | iFlow 或其他框架文档 |
| `CURSOR_RULES.md` | Cursor 规则文件 |
| `.cursorrules` | Cursor 规则（无扩展名） |
| `copilot-instructions.md` | GitHub Copilot 指令 |
| `.github/copilot-instructions.md` | Copilot 组织级指令 |

**决策分支：**

- **0 个文件** → 直接进入阶段 4，使用模板全新生成
- **1+ 个文件** → 进入阶段 4.2.3「信息提取与整合」流程

> 💡 **说明**：检测到已有 AI 文档时，AI 将自动提取其中的技术栈、项目结构、编码规范等信息，询问用户是否整合到 OpenSpec 配置中，而非简单覆盖。

---

## 阶段 4：执行安装

### Step 4.1 创建目录结构

> ⚠️ **CRITICAL**: 执行 `openspec init` 仅创建空目录结构

```
openspec/
├── schemas/
└── changes/

{{AI_CONFIG_DIR}}/
├── commands/
└── skills/
```

### Step 4.2 从模板拷贝配置

> 🎯 **ACTION**: 从 `docs/openspec/.template/` 复制以下文件：

| 源文件                           | 目标文件                       |
| -------------------------------- | ------------------------------ |
| `.template/openspec/config.yaml` | `openspec/config.yaml`         |
| `.template/openspec/schemas/*`   | `openspec/schemas/*`           |
| `.template/AGENTS.md`            | `AGENTS.md`                    |
| `.template/custom/commands/*`    | `{{AI_CONFIG_DIR}}/commands/*` |
| `.template/custom/skills/*`      | `{{AI_CONFIG_DIR}}/skills/*`   |

> ⚠️ **CRITICAL**: Commands 和 Skills **必须**从 `.template/custom/` 复制，**禁止使用** `openspec init` 生成的默认内容！

#### 4.2.1 Commands 清单（必须全部复制）

```
□ opsx-explore.md
□ opsx-propose.md
□ opsx-apply.md
□ opsx-archive.md
□ opsx-bugfix.md
□ opsx-spike.md
```

#### 4.2.2 Skills 清单（必须全部复制）

```
□ openspec-explore/
□ openspec-propose/
□ openspec-apply-change/
□ openspec-archive-change/
□ openspec-bugfix/
□ openspec-spike/
```

#### 4.2.3 已有 AI 文档信息提取与整合

> 🎯 **ACTION**: 当检测到已存在的 AI 文档（AGENTS.md、CLAUDE.md、IFLOW.md 等）时执行

**Step 4.2.3.1 扫描已存在的 AI 文档**

检测以下常见 AI 文档：

| 文件名 | 典型来源 | 内容类型 |
|--------|----------|----------|
| `AGENTS.md` | OpenCode / 通用 | AI 角色、工作流、约束 |
| `CLAUDE.md` | Claude Code | 项目上下文、编码规范 |
| `IFLOW.md` | iFlow / 其他框架 | 交互流程、角色定义 |
| `CURSOR_RULES.md` | Cursor | 编码规则、项目结构 |
| `.cursorrules` | Cursor | 规则文件 |
| `copilot-instructions.md` | GitHub Copilot | 指令、上下文 |

**Step 4.2.3.2 信息提取映射**

根据四层配置体系，将提取的信息映射到对应目标文件：

| 提取来源 | 信息类型 | 目标文件 | 映射说明 |
|----------|----------|----------|----------|
| **AGENTS.md** | AI 角色定义 | `AGENTS.md` | 提取角色描述，合并到 Harness 角色体系 |
| **AGENTS.md** | 工作流描述 | `AGENTS.md` | 提取现有工作流，询问是否替换为 OpenSpec 工作流 |
| **CLAUDE.md** | 项目技术栈 | `openspec/config.yaml` | 提取语言、框架、工具链信息 |
| **CLAUDE.md** | 项目结构 | `openspec/config.yaml` | 提取 src/ 目录、测试目录位置 |
| **CLAUDE.md** | 编码规范 | `AGENTS.md` | 提取代码风格、命名规范 |
| **IFLOW.md** | 交互模式 | `AGENTS.md` | 提取人机协作模式 |
| **CURSOR_RULES.md** | 代码规则 | `AGENTS.md` | 提取代码约束、最佳实践 |
| **任意文件** | 常用命令 | `openspec/config.yaml` | 提取 dev/build/test/lint 等命令 |

**Step 4.2.3.3 整合决策流程**

```
检测到已有 AI 文档？
├─ 否 → 直接使用模板生成
└─ 是 → 逐个文档处理：
    ├─ 提取信息（按上述映射表）
    ├─ 向用户展示提取摘要：
    │   "从 CLAUDE.md 提取到以下信息：
    │    - 技术栈: TypeScript + Next.js
    │    - 测试目录: src/__tests__/
    │    - 编码规范: Airbnb ESLint
    │    是否整合到 OpenSpec 配置？"
    ├─ 用户确认整合
    │   ├─ 是 → 合并到对应目标文件
    │   └─ 否 → 保留原文件，单独生成新配置
    └─ 询问是否保留原文件作为备份
```

**Step 4.2.3.4 AGENTS.md 生成（含整合逻辑）**

**标准流程：**

1. 读取模板 `.template/AGENTS.md`
2. 如果有已提取的 AI 角色/规范信息 → 整合到对应章节
3. 替换变量占位符
4. **冲突检测**：检查目标文件是否存在

**冲突处理决策树（更新版）：**

```
目标文件已存在？
├─ 是 → 有 OpenSpec 标识？
│   ├─ 是 → 询问是否更新
│   └─ 否 → 是专属 AI 文档？(CLAUDE.md, IFLOW.md 等)
│       ├─ 是 → 进入「信息提取与整合」流程
│       │       (提取信息 → 展示摘要 → 用户确认 → 合并生成)
│       └─ 否 → 备份后创建
└─ 否 → 直接写入
```

**整合示例：**

假设从 `CLAUDE.md` 提取到：
```markdown
## 项目结构
- 源代码位于 `src/`
- 测试使用 Vitest，位于 `src/__tests__/`  
- 使用 pnpm 作为包管理器

## 编码规范
- 使用 Airbnb TypeScript 规范
- 所有函数必须有 JSDoc 注释
```

整合后生成：
```yaml
# openspec/config.yaml
src:
  purpose: Main source code
  scope: Application logic
  tests: src/__tests__/

commands:
  test: pnpm test
  test_unit: pnpm vitest

conventions:
  - Airbnb TypeScript ESLint
  - JSDoc required for all functions
```

### Step 4.3 配置变量填充

> 💡 **提示**：以下变量优先从 **Step 4.2.3 信息提取**中获得（如果用户已有 AI 文档）。否则通过用户交互或自动检测填充。

#### AGENTS.md 变量

| 占位符                | 替换为   | 示例                       | 提取来源 |
| --------------------- | -------- | -------------------------- | -------- |
| `PROJECT_NAME`        | 项目名称 | `MyApp`                    | 用户输入 / package.json |
| `PROJECT_DESCRIPTION` | 项目描述 | `A web application for...` | CLAUDE.md / 用户输入 |
| `TEST_DIR`            | 测试目录 | `src/tests/`               | CLAUDE.md / 自动检测 |
| `SRC_DIR`             | 源码目录 | `src/`                     | CLAUDE.md / 自动检测 |
| `PACKAGE_MANAGER`     | 包管理器 | `pnpm`                     | lock 文件 / 用户输入 |

#### config.yaml 变量

**基础变量（直接替换）：**

| 占位符                    | 替换为     | 示例                | 提取来源 |
| ------------------------- | ---------- | ------------------- | -------- |
| `{{PROJECT_NAME}}`        | 项目名称   | `MyApp`             | package.json / 用户输入 |
| `{{PROJECT_DESCRIPTION}}` | 项目描述   | `A web application` | CLAUDE.md / 用户输入 |
| `{{LANGUAGE}}`            | 编程语言   | `TypeScript`        | 文件扩展名 / CLAUDE.md |
| `{{RUNTIME}}`             | 运行时     | `Node.js >=22.0.0`  | package.json engines / CLAUDE.md |
| `{{PACKAGE_MANAGER}}`     | 包管理器   | `pnpm`              | lock 文件 / CLAUDE.md |
| `{{LANGUAGE_VERSION}}`    | 语言版本   | `TypeScript 5.9+`   | package.json / CLAUDE.md |
| `{{TEST_FRAMEWORK}}`      | 测试框架   | `vitest`            | devDependencies / CLAUDE.md |
| `{{RUNTIME_VERSION}}`     | 运行时版本 | `Node.js >=22.0.0`  | package.json engines / CLAUDE.md |

**条件变量（根据项目类型生成整行）：**

| 占位符                      | 生成逻辑                                                  | 示例输出                      |
| --------------------------- | --------------------------------------------------------- | ----------------------------- |
| `{{WEB_FRAMEWORK_LINE}}`    | Web项目 → `web_framework: Next.js 15`<br>非Web项目 → 空行 | `web_framework: Next.js 15`   |
| `{{UI_FRAMEWORK_LINE}}`     | 有UI框架 → `ui: React 19 + Tailwind CSS`<br>无 → 空行     | `ui: React 19 + Tailwind CSS` |
| `{{BUILD_TOOL_LINE}}`       | 指定构建工具 → `build_tool: Vite`<br>未指定 → 空行        | `build_tool: Vite`            |
| `{{TYPESCRIPT_CONVENTION}}` | TypeScript项目 → `- Strict TypeScript`<br>非TS → 空行     | `- Strict TypeScript`         |

**模块配置（动态生成多行）：**

`{{MODULES_SECTION}}` 根据项目类型生成：

```yaml
# Web/全栈项目示例
src:
  purpose: Next.js web service
  scope: Web UI, API routes, components
  tests: src/tests/

# 服务端项目示例
src:
  purpose: API service
  scope: Routes, controllers, services
  tests: src/tests/
```

**命令配置（条件生成）：**

| 占位符                        | 生成逻辑                                     | 示例                          |
| ----------------------------- | -------------------------------------------- | ----------------------------- |
| `{{DEV_COMMAND_LINE}}`        | 有dev命令 → `dev: pnpm dev`                  | `dev: pnpm dev`               |
| `{{BUILD_COMMAND_LINE}}`      | 有build命令 → `build: pnpm build`            | `build: pnpm build`           |
| `{{TEST_COMMAND_LINE}}`       | 有test命令 → `test: pnpm test`               | `test: pnpm test`             |
| `{{TEST_UNIT_COMMAND_LINE}}`  | 有unit test → `test_unit: pnpm test:unit`    | `test_unit: pnpm test:unit`   |
| `{{LINT_COMMAND_LINE}}`       | 有lint命令 → `lint: pnpm lint`               | `lint: pnpm lint`             |
| `{{TYPE_CHECK_COMMAND_LINE}}` | 有type-check → `type_check: pnpm type-check` | `type_check: pnpm type-check` |

> ⚠️ **CRITICAL**: 所有占位符**必须**替换，不能原样复制到目标文件！

**验证方法：**

```bash
# 替换完成后检查是否还有未替换的占位符
grep -E '\{\{[A-Z_]+\}\}' openspec/config.yaml AGENTS.md
# 应该无输出
```

---

## 阶段 5：合并规则

> 🎯 **ACTION**: 如果目标文件已存在，按以下规则处理：

### 决策流程

```
文件是否存在？
├─ 否 → 使用模板版本
└─ 是 → 与 openspec 相关？
    ├─ 否 → 保留现有版本（用户自定义）
    └─ 是 → 使用模板版本（覆盖）
```

### "与 openspec 相关" 的文件清单

**必须覆盖（标准组件）：**

```
✓ openspec/ 目录下所有文件
✓ AGENTS.md
✓ {{AI_CONFIG_DIR}}/commands/opsx-{explore,propose,apply,archive}.md
✓ {{AI_CONFIG_DIR}}/skills/openspec-{explore,propose,apply-change,archive-change}/
```

**保留用户自定义：**

```
✗ {{AI_CONFIG_DIR}}/commands/opsx-{bugfix,spike}.md
✗ {{AI_CONFIG_DIR}}/skills/openspec-{bugfix,spike}/
✗ 用户自己的其他配置文件
```

---

## 阶段 6：完成验证

> 🎯 **ACTION**: 安装完成后逐项验证：

```
□ openspec/config.yaml 存在且格式正确
□ openspec/schemas/ 包含 spec-driven、bugfix、spike
□ AGENTS.md 存在
□ {{AI_CONFIG_DIR}}/commands/ 包含 6 个命令文件
□ {{AI_CONFIG_DIR}}/skills/ 包含 6 个技能目录
```

**全部通过 → 提示用户：**

```
🎉 OpenSpec Harness 环境搭建完成！

下一步：
1. 查看 openspec/config.yaml 确认配置
2. 阅读 AGENTS.md 了解 AI 助手的工作方式
3. 创建第一个变更：

   新功能：/opsx-propose my-first-feature
   Bug 修复：/opsx-bugfix some-bug
   技术调研：/opsx-spike evaluate-options
```

---

## 附录：模板目录结构

```
docs/openspec/.template/
├── README.md                    # 模板使用说明
├── AGENTS.md                    # AI 行为指南模板
├── openspec/
│   ├── config.yaml              # 配置模板
│   └── schemas/
│       ├── spec-driven/         # 新功能开发
│       ├── bugfix/              # Bug 修复
│       └── spike/               # 技术调研
└── custom/                      # AI 配置模板
    ├── commands/                # 6 个命令文件
    └── skills/                  # 6 个技能目录
```

---

## 参考文档

| 文档                  | 说明           |
| --------------------- | -------------- |
| `00-quick-start.md`   | 5 分钟快速入门 |
| `01-overview.md`      | 系统概览       |
| `02-config-system.md` | 配置体系详解   |
| `03-workflows.md`     | 工作流详解     |
| `.template/README.md` | 模板使用说明   |
