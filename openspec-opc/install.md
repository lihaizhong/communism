# OpenSpec Harness 安装指南

> **AI 指令**：本文档指导你完成 Harness 环境搭建。**逐阶段执行，不要跳过任何步骤。**

## 📂 模板文件位置

> **AI 指令**：模板文件始终位于本文档（install.md）所在目录的 `.template/` 子目录下。

```
install.md 所在目录/
├── install.md              ← 本文档
└── .template/              ← 模板文件（必须）
    ├── README.md            ← 模板详细结构说明
    ├── AGENTS.md
    ├── openspec/
    ├── custom/
    └── ci-templates/
```

> **AI 指令**：完整模板结构请参考 `.template/README.md`，安装时需要复制所有内容。

**推导规则**：
- 若本文档 URL 为 `https://github.com/xxx/yyy/blob/main/openspec-opc/install.md`
- 则模板目录为 `https://github.com/xxx/yyy/tree/main/openspec-opc/.template`

---

## 📦 版本兼容性

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| **OpenSpec CLI** | 0.1.0 | latest |
| **Node.js** | 18.0.0 | 22.x LTS |
| **Git** | 2.0.0 | latest |

**支持的 AI 工具**：OpenCode、Claude Code、Cursor、GitHub Copilot、VS Code

**支持的项目类型**：
- Web 前端：React、Vue、Angular、Svelte、Next.js、Nuxt、Remix、SvelteKit
- 客户端：Electron、Tauri、React Native、Flutter
- 服务端：Node.js、Go、Python、Rust、Java、.NET
- 全栈：Next.js、Nuxt、Remix、SvelteKit

---

## ⚡ 快速启动（经验用户）

> 已熟悉安装流程？使用快速路径跳过解释性内容。

**已有项目（推荐路径）**：

```bash
# 1. 前置检查
openspec --version              # 未安装则：npm install -g @fission-ai/openspec@latest
ls package.json go.mod Cargo.toml pyproject.toml .git  # 确认项目根目录

# 2. 执行安装
openspec init

# 3. 复制 Harness 模板（.template/ 目录与本文件同目录）
cp -r .template/openspec ./openspec/
cp .template/AGENTS.md ./AGENTS.md
cp -r .template/custom/commands/* .opencode/commands/
cp -r .template/custom/skills/* .opencode/skills/

# 4. 填充变量（参考 variables.md）
# 搜索 {{变量名}} 并替换为实际值

# 5. 验证
grep -E '\{\{[A-Z_]+\}\}' openspec/config.yaml AGENTS.md  # 应无输出
ls .opencode/commands/*.md | wc -l                        # 应输出 6
```

**新项目（从零开始）**：

```bash
# 1. 创建项目
npx create-next-app@latest my-app && cd my-app

# 2. 安装 Harness
openspec init

# 3. 后续步骤同上
```

**遇到问题？** 查看 [故障排查 FAQ](./install-reference/troubleshooting.md)

---

## 📑 目录（快速导航）

> **AI 阅读提示**：先理解目录结构，再根据用户当前状态跳转到对应阶段。

| 阶段 | 说明 | 执行条件 |
|------|------|----------|
| **前置要求** | OpenSpec CLI 安装 + 项目目录检查 | **必须执行** |
| **阶段 0** | 项目初始化 | 仅项目目录不存在时执行 |
| **阶段 1** | 确认项目状态（新项目/老项目） | 项目目录存在时执行 |
| **阶段 2** | 收集项目信息 | **所有项目必须执行** |
| **阶段 3** | 技术栈检测与确认 | 新项目=确认用户输入；老项目=自动检测 |
| **阶段 4** | AI 配置目录选择 + 原有文档检测 | **所有项目必须执行** |
| **阶段 5** | 执行安装（核心流程） | **所有项目必须执行** |
| **阶段 6** | 完成验证 | **所有项目必须执行** |

**详细参考文档**：`install-reference/` 目录包含详细的变量表、检测逻辑、CI/CD 模板等。

---

## 🛑 强制停止点（MANDATORY STOP POINTS）

> **AI 指令**：以下位置**必须停止执行并等待用户确认**，禁止自动继续。

| 停止点 | 位置 | 必须执行的动作 | 详细清单 |
|--------|------|----------------|----------|
| **停止点 1** | 阶段 4.1 扫描配置目录后 | 展示检测结果，询问用户选择目标目录 | [checklist.md](./install-reference/checklist.md#停止点-1ai-配置目录选择) |
| **停止点 2** | 阶段 4.4 检测 AI 文档后 | 展示检测到的文件，询问是否整合 | [checklist.md](./install-reference/checklist.md#停止点-2已有-ai-文档整合) |
| **停止点 3** | 阶段 5.3 覆盖文件前 | 展示即将覆盖的内容，要求用户明确确认 | [checklist.md](./install-reference/checklist.md#停止点-3文件覆盖确认) |

**验证规则**：
- 每个停止点必须收到用户的明确选择（点击按钮、输入确认等）
- 如果用户未选择，必须保持在当前位置等待
- 禁止假设用户意图或跳过确认

---

## ⚠️ 前置要求（必须）

### 检查 OpenSpec CLI 安装

```bash
openspec --version
```

**未安装？选择安装方式**：

```
未检测到 OpenSpec CLI，这是运行本指南的必需工具。

是否自动全局安装？
[是] npm install -g @fission-ai/openspec@latest
[否] 稍后手动安装
```

- **选项 A（自动安装）**：执行 `npm install -g @fission-ai/openspec@latest && openspec --version`
- **选项 B（手动安装）**：引导用户访问官方文档，完成后重新运行本指南

❌ **如果用户拒绝安装且未手动完成安装，则立即停止执行。**

### 检查项目目录

```bash
pwd
ls -la
```

**判断标准**（至少存在一项）：
- 项目配置文件：`package.json` / `go.mod` / `Cargo.toml` / `pyproject.toml`
- Git 仓库标志：`.git/` 目录存在
- 框架脚手架标志：`next.config.js` / `nuxt.config.ts` / `vite.config.ts` 等

**状态判断**：
- ✅ 已在项目根目录 → 继续执行阶段 1
- ⬜ 需要创建新项目 → 执行阶段 0
- ⬜ 项目在其他位置 → 引导用户切换目录

---

## 阶段 0：项目初始化（仅新项目需要）

> 🎯 **ACTION**: 仅在用户需要创建新项目时执行

向用户展示：

```
检测到你需要创建新项目。OpenSpec Harness 需要在项目根目录安装。

请选择项目初始化方式：

【选项 A】使用框架脚手架（推荐）
  适合：想快速搭建框架基础结构
  示例：
  - Next.js: npx create-next-app@latest my-app
  - Nuxt: npx nuxi@latest init my-app
  - Vite (React/Vue): npm create vite@latest my-app

【选项 B】创建空项目目录
  适合：已有代码仓库，或手动搭建技术栈
  命令：mkdir my-project && cd my-project && git init

【选项 C】已有项目目录
  适合：项目目录已存在，只需引入 Harness
  操作：请切换到项目根目录后告知 AI

【选项 D】跳过项目初始化
  适合：稍后手动创建项目
  操作：终止安装流程，等待用户完成项目初始化后重新运行

请选择（A/B/C/D）：
```

**验证完成**：
```bash
pwd && ls -la
# 确认项目根目录标志存在
```

✅ 项目目录验证通过后，继续执行阶段 1。

---

## 阶段 1：确认项目状态（新项目/老项目）

### Step 1.1 新项目 or 老项目？

```
你好！我来帮你搭建 OpenSpec Harness 环境。

请告诉我你的情况：
A) 从零创建新项目
B) 已有项目，想引入 Harness
```

### Step 1.2 项目类型

**如果选 A（新项目）**：

```
请选择项目类型：
1) Web 前端项目（React/Vue/Angular 等）
2) 客户端项目（Electron/Tauri/React Native 等）
3) 服务端项目（Node.js/Go/Java 等）
4) 全栈项目（Next.js/Nuxt 等）
```

**如果选 B（老项目）**：

> 🎯 **ACTION**: 自动检测技术栈 → 展示报告 → 用户确认

---

## 阶段 2：收集项目信息（信息采集关键点）

> ⚠️ **IMPORTANT**: 本阶段是**配置变量的主要数据来源**，无论新项目还是老项目都必须执行。

根据项目类型询问：

| 项目类型 | 必问问题 |
|---------|---------|
| **Web 前端** | 框架(React/Vue/Angular)、构建工具、包管理器、测试框架、TypeScript?、项目名称 |
| **客户端** | 平台(桌面/移动/跨平台)、框架(Electron/Tauri/Flutter)、包管理器、项目名称 |
| **服务端** | 语言/运行时、Web框架、数据库、ORM、认证方案、部署目标、项目名称 |
| **全栈** | 全栈框架(Next.js/Nuxt等)、渲染模式、数据库、ORM、认证、部署平台、项目名称 |

### 项目状态分支处理

**新项目**：
- 用户回答后，将信息**暂存到内存**
- 暂存信息将**直接用于填充配置变量**（阶段 5.3）

**老项目**：
- 用户回答后，将信息标记为**"用户预期描述"**
- 这些信息**不直接用于配置变量**
- 在阶段 3 检测完成后，AI 需对比：「用户预期」 vs 「检测结果」
  - 一致 → 直接使用检测结果填充变量
  - 不一致 → 向用户确认以哪个为准

> 🎯 **ACTION - 老项目**: 清晰告知用户"我会在阶段 3 自动检测技术栈，您刚才提供的信息会作为我理解项目预期的参考，最终配置以检测结果为准"。

---

## 阶段 3：技术栈检测与确认

> 🎯 **ACTION**: 根据项目状态执行不同的技术栈确认方式

### 项目类型分支

**情况 A：新项目**
- 跳过自动检测，直接使用**阶段 2 用户输入的信息**
- AI 询问："确认你的技术栈配置：[展示收集的信息]"

**情况 B：老项目**
- 执行自动技术栈检测
- 展示检测报告，询问用户确认

### 检测逻辑

> ⚠️ **参考**：详细的各语言/框架检测逻辑见 [install-reference/tech-detection.md](./install-reference/tech-detection.md)

**快速检测示例（Node.js 项目）**：

```bash
# 框架检测
grep '"next"' package.json && echo "框架：Next.js"
grep '"react"' package.json && echo "UI：React"

# 包管理器
[ -f pnpm-lock.yaml ] && echo "包管理器：pnpm"
[ -f yarn.lock ] && echo "包管理器：yarn"

# 测试框架
grep '"vitest"' package.json && echo "测试：Vitest"

# TypeScript
[ -f tsconfig.json ] && echo "TypeScript：是"
```

**检测报告模板**：

```
🔍 技术栈检测报告

📋 检测结果：
├─ 项目类型: Web 前端（Next.js 全栈）
├─ 框架: Next.js 15
├─ 语言: TypeScript
├─ 包管理器: pnpm
├─ 测试框架: Vitest
└─ 运行时: Node.js >=18.0.0

⚠️ 需要确认：渲染模式、数据库
[确认无误] [修改配置]
```

---

## 阶段 4：AI 配置目录选择与原有文档检测

### 4.1 扫描已存在的 AI 配置

> ⚠️ **MUST STOP HERE** - 必须暂停并等待用户选择，禁止直接继续到下一步

**检测以下目录**：

| AI 工具 | 配置目录 | 检测标志 |
|---------|----------|----------|
| OpenCode | `.opencode/` | `opencode.json` |
| Claude Code | `.claude/` | `settings.json` |
| Cursor | `.cursor/` | `rules/` |
| Copilot | `.github/copilot/` | `instructions.md` |

**向用户展示**：

```
📁 检测到 AI 配置目录：

已有配置：
├─ .opencode/    (OpenCode)
├─ .claude/      (Claude Code)
└─ ...

请选择目标目录：
[ ] 使用 .opencode/ （推荐）
[ ] 使用 .claude/
[ ] 创建新目录：___

⚠️ 覆盖警告：
如果选择更新已有目录，以下内容将被完全替换：
• commands/ 目录（所有 .md 命令文件）
• skills/ 目录（所有技能目录）
• 已有自定义配置将丢失

建议：如有自定义配置，请先备份或选择创建新目录。
```

### 4.2 检测当前运行的 AI

通过环境变量检测：
- `OPENCODE_SESSION_ID` → OpenCode
- `CLAUDE_CODE_VERSION` → Claude Code

### 4.3 确认目标目录

```
📁 目标 AI 配置目录：[路径]

将创建：
├── commands/ (6 个命令文件)
└── skills/ (6 个技能目录)

[确认安装] [更换目录] [取消]
```

### 4.4 检测已存在的 AI 文档（老项目）

> ⚠️ **MUST STOP HERE** - 检测到文件后必须暂停并询问用户

**检测文件列表**：

| 文件名 | 说明 |
|--------|------|
| `AGENTS.md` | OpenCode / 通用 AI 指南 |
| `CLAUDE.md` | Claude Code 项目文档 |
| `CURSOR_RULES.md` | Cursor 规则文件 |
| `.cursorrules` | Cursor 规则（无扩展名） |

**向用户展示**：

```
📄 检测到已有 AI 文档：

检测到的文件：
└─ AGENTS.md
└─ CLAUDE.md

从上述文件中可提取：
├─ 技术栈信息 → 用于填充配置变量
├─ 编码规范 → 可整合到 AGENTS.md
└─ AI 角色定义 → 可整合到 AGENTS.md

请选择：
[ ] 整合非技术类信息到新配置
[ ] 不整合，使用 OpenSpec 默认模板
[ ] 取消安装
```

---

## 阶段 5：执行安装

> ⚠️ **CRITICAL**: 本阶段是信息流整合的核心，请严格按照顺序执行。

### 5.1 执行 openspec init

```bash
openspec init
```

这会创建默认配置：
- `openspec/config.yaml`
- `openspec/schemas/`
- `{{AI_CONFIG_DIR}}/commands/`
- `{{AI_CONFIG_DIR}}/skills/`

### 5.2 信息提取（老项目专属）

> 🎯 **ACTION**: 仅在阶段 4.4 检测到已有 AI 文档时执行

从原有文档提取信息，并校验：

| 信息类型 | 校验规则 | 处理方式 |
|----------|----------|----------|
| **技术栈信息** | 与阶段 3 检测结果比对 | 不一致 → 丢弃，以检测结果为准 |
| **编码规范** | 无需校验 | 保留，整合到 AGENTS.md |
| **AI 角色/工作流** | 无需校验 | 保留，整合到 AGENTS.md |

### 5.3 替换为 Harness 模板并填充变量

> ⚠️ **MUST STOP HERE - 覆盖前二次确认**

**向用户展示**：

```
⚠️ 文件覆盖确认

目标目录：[用户在步骤 4 选择的目录]

即将执行以下覆盖操作：
├─ openspec/config.yaml        （覆盖）
├─ openspec/schemas/           （覆盖）
├─ AGENTS.md                   （覆盖，如存在）
├─ commands/ 目录              （覆盖）
└─ skills/ 目录                （覆盖）

⚠️ 已有配置将被完全替换，无法恢复。

[确认继续] [取消] [备份后继续]
```

#### 步骤 5.3.1：复制模板文件

**模板文件来源**：
- 模板位于 **OpenSpec Harness 安装包根目录** 的 `.template/` 目录下
- **`.template` 目录与本文档 `install.md` 位于同一目录**

执行复制：

| 源文件 | 目标文件 |
|--------|----------|
| `${OPENSPEC_HARNESS_ROOT}/.template/openspec/config.yaml` | `openspec/config.yaml` |
| `${OPENSPEC_HARNESS_ROOT}/.template/openspec/schemas/*` | `openspec/schemas/*` |
| `${OPENSPEC_HARNESS_ROOT}/.template/AGENTS.md` | `AGENTS.md` |
| `${OPENSPEC_HARNESS_ROOT}/.template/custom/commands/*` | `{{AI_CONFIG_DIR}}/commands/*` |
| `${OPENSPEC_HARNESS_ROOT}/.template/custom/skills/*` | `{{AI_CONFIG_DIR}}/skills/*` |

**必须复制的 Commands**：
- `opsx-explore.md`
- `opsx-propose.md`
- `opsx-apply.md`
- `opsx-archive.md`
- `opsx-bugfix.md`
- `opsx-spike.md`

**必须复制的 Skills**：
- `openspec-explore/`
- `openspec-propose/`
- `openspec-apply-change/`
- `openspec-archive-change/`
- `openspec-bugfix/`
- `openspec-spike/`

#### 步骤 5.3.2：清理旧版兼容性目录

```bash
# 检查并清理旧版错误目录
if [ -d "{{AI_CONFIG_DIR}}/command" ]; then
  echo "⚠️  检测到旧版 OpenSpec 生成的 'command/' 目录（单数）"
  rm -rf "{{AI_CONFIG_DIR}}/command"
  echo "✅ 已清理旧版兼容性目录"
fi
```

#### 步骤 5.3.3：填充技术栈变量

> 📖 **详细参考**：[install-reference/variables.md](./install-reference/variables.md)

**核心变量**：

| 占位符 | 数据来源 |
|--------|----------|
| `{{PROJECT_NAME}}` | 阶段 2 用户输入 / package.json |
| `{{PACKAGE_MANAGER}}` | 阶段 3 检测 / 阶段 2 用户输入 |
| `{{LANGUAGE}}` | 阶段 3 检测 / 阶段 2 用户输入 |
| `{{RUNTIME}}` | 阶段 3 检测 / package.json engines |

**填充流程**：

```
📝 变量填充预览：

config.yaml:
- PROJECT_NAME: MyApp ✓
- PACKAGE_MANAGER: pnpm ✓
- WEB_FRAMEWORK: Next.js 15 ✓

以下变量需要确认：
- TEST_FRAMEWORK: [未检测] 请输入测试框架名称
- BUILD_TOOL: [未检测] 请输入构建工具名称（留空跳过）

[确认并填充] [修改配置]
```

**验证填充结果**：

```bash
grep -E '\{\{[A-Z_]+\}\}' openspec/config.yaml AGENTS.md
# 应该无输出
```

### 5.4 整合非技术类信息（仅选择「整合」时执行）

如果用户在停止点 2 选择「整合」：
- 将暂存的编码规范、AI 角色等信息 → 合并到 `AGENTS.md`
- 将暂存的项目约定/最佳实践 → 合并到 `AGENTS.md`

如果选择「不整合」：
- 跳过此步骤，保持 Harness 模板原样

### 5.5 CI/CD 配置生成（可选）

> 📖 **详细参考**：[install-reference/ci-templates.md](./install-reference/ci-templates.md)

**询问用户**：

```
🤖 是否生成 CI/CD 和 pre-commit hook 配置？

【选项 1】GitHub Actions
   创建 .github/workflows/openspec-archive.yml

【选项 2】GitLab CI
   创建 .gitlab-ci.yml（或追加到现有配置）

【选项 3】其他平台
   提供通用配置模板作为参考

【选项 4】跳过
   不生成配置，阶段 6 改为 Manual 模式

是否生成 pre-commit hook？
[是] [否]

请选择（1/2/3/4 + Y/N）：
```

执行用户选择的配置生成（参考 [ci-templates.md](./install-reference/ci-templates.md)）。

---

## 阶段 6：完成验证

### 6.1 更新 AGENTS.md 触发方式标记（如需要）

根据阶段 5.5 的用户选择，更新 AGENTS.md：

- **选项 1/2（完整 CI/CD）**：保持原样
- **选项 4（跳过）**：将 Validate 和 Archive 改为 Manual

### 6.2 验证清单

```
□ openspec/config.yaml 存在且格式正确
□ openspec/schemas/ 包含 spec-driven、bugfix、spike
□ AGENTS.md 存在
□ {{AI_CONFIG_DIR}}/commands/ 包含 6 个命令文件（commands 复数）
□ {{AI_CONFIG_DIR}}/skills/ 包含 6 个技能目录
□ 不存在旧的 command/（单数）目录
□ CI/CD 配置（如选择生成）存在且格式正确
□ pre-commit hook（如选择生成）存在且可执行
```

**全部通过 → 提示用户**：

```
🎉 OpenSpec Harness 环境搭建完成！

配置摘要：
├─ openspec/config.yaml         ✅ 已配置
├─ openspec/schemas/            ✅ 已创建
├─ AGENTS.md                    ✅ 已配置
├─ {{AI_CONFIG_DIR}}/commands/  ✅ 6 个命令
├─ {{AI_CONFIG_DIR}}/skills/    ✅ 6 个技能
{{- if 生成 CI/CD }}
├─ CI/CD 配置                   ✅ 已配置
{{- endif }}
{{- if 生成 pre-commit }}
├─ pre-commit hook              ✅ 已配置
{{- endif }}

下一步：
1. 查看 openspec/config.yaml 确认配置
2. 阅读 AGENTS.md 了解 AI 助手的工作方式
3. 创建第一个变更：

   新功能：/opsx-propose my-first-feature
   Bug 修复：/opsx-bugfix some-bug
   技术调研：/opsx-spike evaluate-options

{{- if Manual 模式 }}
💡 提示：Validate 和 Archive 步骤已设为手动执行。
   如需自动化，可重新运行安装或手动配置 CI/CD。
{{- endif }}
```

---

## 附录：模板目录结构

```
openspec-opc/.template/
├── README.md                    # 模板使用说明
├── AGENTS.md                    # AI 行为指南模板
├── openspec/
│   ├── config.yaml              # 配置模板
│   └── schemas/
│       ├── spec-driven/         # 新功能开发
│       ├── bugfix/              # Bug 修复
│       └── spike/               # 技术调研
├── custom/                      # AI 配置模板
│   ├── commands/                # 6 个命令文件
│   └── skills/                  # 6 个技能目录
└── ci-templates/                # CI/CD 配置模板（可选生成）
    ├── github-workflows/
    ├── gitlab-ci/
    └── hooks/
```

---

## 参考文档

安装过程中需要详细参考以下文档：

| 文档 | 说明 | 使用时机 |
|------|------|----------|
| [variables.md](./install-reference/variables.md) | 所有需要填充的变量 | 阶段 5.3 变量替换 |
| [tech-detection.md](./install-reference/tech-detection.md) | 各语言/框架的检测逻辑 | 阶段 3 技术栈检测 |
| [ci-templates.md](./install-reference/ci-templates.md) | CI/CD 配置模板 | 阶段 5.5 CI/CD 配置 |
| [checklist.md](./install-reference/checklist.md) | 强制停止点检查清单 | 每个停止点确认 |
| [error-recovery.md](./install-reference/error-recovery.md) | 错误恢复和回退指南 | 安装失败时 |

---

> **安装遇到问题？** 查看 [错误恢复指南](./install-reference/error-recovery.md)