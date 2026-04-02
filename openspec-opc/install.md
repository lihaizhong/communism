# OpenSpec Harness 安装指南

> **AI 指令**：本文档指导你完成 Harness 环境搭建。**逐阶段执行，不要跳过任何步骤。**

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

**快速流程判断**：
```
开始
  ↓
前置要求检查
  ├─ CLI 未安装？→ 执行 CLI 安装
  └─ CLI 已安装？→ 继续
  ↓
项目目录检查
  ├─ 目录存在？→ 跳到阶段 1
  └─ 目录不存在？→ 执行阶段 0
      ↓
    阶段 0 完成？→ 进入阶段 1
  ↓
阶段 1：确认项目状态（新项目/老项目）
  ↓
阶段 2：收集项目信息
  ↓
阶段 3：技术栈检测
  ├─ 新项目？→ 确认用户输入
  └─ 老项目？→ 自动检测
  ↓
阶段 4：AI 配置目录选择
  ↓
阶段 5：执行安装（核心流程）
  ├─ 5.1 执行 openspec init
  ├─ 5.2 信息提取（老项目专属）
  ├─ 5.3 模板替换 + 变量填充
  └─ 5.4 整合非技术类信息（可选）
  ↓
阶段 6：完成验证
```

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

## ⚠️ 项目目录要求（重要）

**MUST: 项目目录必须存在**

> OpenSpec Harness 需要在项目根目录创建配置文件。在继续之前，请确保项目目录已创建。

### 检查项目目录

首先确认当前所在目录：

```bash
pwd
ls -la
```

### 项目目录状态判断

**情况 1：当前已在项目根目录**
- 存在 `package.json`、`go.mod`、`Cargo.toml` 等项目文件
- **操作**：直接继续执行后续步骤

**情况 2：需要创建新项目**
- 用户尚未创建项目目录
- **操作**：执行「步骤 0：项目初始化」（见下方）

**情况 3：项目目录在其他位置**
- 用户的项目不在当前目录
- **操作**：引导用户切换到项目目录

---

## 阶段 0：项目初始化（仅新项目需要）

> 🎯 **ACTION**: 仅在用户需要创建新项目时执行

### Step 0.1 确认项目初始化需求

如果用户需要创建新项目，询问：

```
检测到你需要创建新项目。OpenSpec Harness 需要在项目根目录安装。

请选择项目初始化方式：

【选项 A】使用框架脚手架（推荐）
  适合：想快速搭建框架基础结构
  示例：
  - Next.js: npx create-next-app@latest my-app
  - Nuxt: npx nuxi@latest init my-app
  - Vite (React/Vue): npm create vite@latest my-app
  - Tauri: npm create tauri-app@latest

【选项 B】创建空项目目录
  适合：已有代码仓库，或手动搭建技术栈
  命令：
  - mkdir my-project && cd my-project
  - git init

【选项 C】已有项目目录
  适合：项目目录已存在，只需引入 Harness
  操作：请切换到项目根目录后告知 AI

【选项 D】跳过项目初始化
  适合：稍后手动创建项目
  操作：终止安装流程，等待用户完成项目初始化后重新运行

请选择你的情况（A/B/C/D）：
```

### Step 0.2 执行项目初始化（根据用户选择）

#### 选项 A：使用框架脚手架

```
请告诉我你想使用的框架，我将提供相应的脚手架命令：

1. Next.js
2. Nuxt
3. Vite (React/Vue)
4. Tauri
5. 其他（请说明）

[用户选择后]

推荐命令：<对应框架的脚手架命令>

请执行此命令，完成后告诉我继续。AI 将等待你的确认。
```

> ⚠️ **IMPORTANT**: AI 应等待用户确认项目初始化完成，再继续后续步骤。

#### 选项 B：创建空项目目录

```bash
# 引导用户执行
mkdir <项目名称>
cd <项目名称>
git init

# 可选：初始化基础文件
npm init -y  # 如果需要 Node.js 项目
```

#### 选项 C：已有项目目录

```
请切换到你的项目根目录：

cd <你的项目路径>

确认项目根目录后，告诉我继续。
```

#### 选项 D：跳过项目初始化

```
⚠️ OpenSpec Harness 安装需要项目目录。

请完成项目初始化后，重新运行本指南：
🔗 <当前文档的完整地址>
```

### Step 0.3 验证项目目录

用户完成项目初始化后，验证：

```bash
# 检查项目根目录标志
pwd && ls -la
```

**验证标准**（至少存在一项）：
- 项目配置文件：`package.json` / `go.mod` / `Cargo.toml` / `pyproject.toml` / `requirements.txt`
- Git 仓库标志：`.git/` 目录存在
- 框架脚手架标志：`next.config.js` / `nuxt.config.ts` / `vite.config.ts` 等

**验证结果**:

- ✅ **检测到项目根目录标志**：
  ```
  📁 检测到项目目录：<项目名称>
  项目类型：<自动识别的类型>
  
  ✓ 可以继续安装 Harness
  ```

- ❌ **未检测到项目根目录标志**：
  ```
  ⚠️ 当前目录未检测到项目文件。
  
  请确认：
  1. 是否已执行项目初始化命令？
  2. 是否已切换到项目根目录？
  
  确认完成后告诉我继续。
  ```

### ✅ 项目目录验证通过后

继续执行「阶段 1：收集项目信息」。

## 🎯 安装流程速览

```
┌──────────────────────────────────────────────────────────────┐
│  前置：检查 openspec CLI 安装                                 │
├──────────────────────────────────────────────────────────────┤
│  前置：检查项目目录是否存在                                    │
├──────────────────────────────────────────────────────────────┤
│  阶段 0：项目初始化（仅项目目录不存在时）                      │
├──────────────────────────────────────────────────────────────┤
│  阶段 1：确认项目状态（新项目/老项目）                         │
├──────────────────────────────────────────────────────────────┤
│  阶段 2：收集项目信息（所有项目必须）                          │
├──────────────────────────────────────────────────────────────┤
│  阶段 3：技术栈检测（自动检测 or 人工确认）                    │
├──────────────────────────────────────────────────────────────┤
│  阶段 4：AI 配置目录选择与原有文档检测                        │
├──────────────────────────────────────────────────────────────┤
│  阶段 5：执行 openspec init 并应用 Harness 模板               │
├──────────────────────────────────────────────────────────────┤
│  阶段 6：完成验证                                             │
└──────────────────────────────────────────────────────────────┘
```

> 📝 **流程说明**：
> - **前置步骤**：在所有阶段之前执行，检查必要条件
> - **阶段 0**：仅当项目目录不存在时执行
> - **阶段 1**：确认项目状态（新项目/老项目），此时项目目录已存在
> - **阶段 3**：新项目使用阶段2的用户输入；老项目执行自动检测
> - 其他阶段对所有项目类型都必须执行

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

## 阶段 2：项目类型专属问题（信息采集关键点）

> ⚠️ **IMPORTANT**: 本阶段是**配置变量的主要数据来源**，无论新项目还是老项目都必须执行。

根据项目类型询问：

| 项目类型     | 必问问题                                                                     |
| ------------ | ---------------------------------------------------------------------------- |
| **Web 前端** | 框架(React/Vue/Angular)、构建工具、包管理器、测试框架、TypeScript?、项目名称 |
| **客户端**   | 平台(桌面/移动/跨平台)、框架(Electron/Tauri/Flutter)、包管理器、项目名称     |
| **服务端**   | 语言/运行时、Web框架、数据库、ORM、认证方案、部署目标、项目名称              |
| **全栈**     | 全栈框架(Next.js/Nuxt等)、渲染模式、数据库、ORM、认证、部署平台、项目名称    |

> 🎯 **ACTION - 新项目**: 用户回答后，将信息**暂存到内存**，用于后续填充配置变量。

> 🎯 **ACTION - 老项目**: 本阶段信息仅作为"用户预期"，实际以**阶段 3 检测结果为准**。

---

## 阶段 3：技术栈检测与确认

> 🎯 **ACTION**: 根据项目状态执行不同的技术栈确认方式

### 项目类型分支

**情况 A：新项目（刚通过阶段 0 初始化）**
- 跳过自动检测，直接使用**阶段 2 用户输入的信息**
- AI 询问："确认你的技术栈配置：[展示收集的信息]"

**情况 B：老项目（已有项目）**
- 执行自动技术栈检测
- 展示检测报告，询问用户确认

### 3.1 检测清单（老项目专属）

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

### 3.2 检测报告模板

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

## 阶段 4：AI 配置目录选择与原有文档检测

### 4.1 扫描已存在的 AI 配置

检测以下目录：

| AI 工具     | 配置目录           | 检测标志          |
| ----------- | ------------------ | ----------------- |
| OpenCode    | `.opencode/`       | `opencode.json`   |
| Claude Code | `.claude/`         | `settings.json`   |
| Cursor      | `.cursor/`         | `rules/`          |
| Copilot     | `.github/copilot/` | `instructions.md` |
| VS Code     | `.vscode/`         | `settings.json`   |

**决策分支**：

- **0 个目录** → 进入 Step 4.2
- **1 个目录** → 询问："检测到 [工具] 配置，是否在此更新？"
- **2+ 个目录** → 多选界面："选择要更新的目录"

> ⚠️ **覆盖警告**：如果选择更新已有目录，Harness 模板将**完全覆盖**目录中的以下内容：
> - `commands/` 目录（所有 `.md` 命令文件）
> - `skills/` 目录（所有技能目录）
> - 已有的自定义命令和技能将被替换
>
> **建议**：如果已有自定义配置，建议备份后再继续，或选择创建新的配置目录。

### 4.2 检测当前运行的 AI

通过以下信号检测：

- `OPENCODE_SESSION_ID` 环境变量 → OpenCode
- `CLAUDE_CODE_VERSION` 环境变量 → Claude Code
- `CURSOR_VERSION` 环境变量 → Cursor

> 📝 **说明**：
> - 以上环境变量为示例，实际可用性取决于各 AI 工具的实现
> - Copilot 和 VS Code 目前无标准环境变量检测方法，需手动确认

> 🎯 **ACTION**: 如果检测到当前运行的 AI 工具，建议创建对应的配置目录。

### 4.3 确认目标目录（新项目流程）

> ⚠️ **IMPORTANT**: 新项目默认创建 `.opencode/` 目录（OpenCode 标准）

显示并确认：

```
📁 目标 AI 配置目录：[路径]

将创建：
├── commands/ (6 个命令文件)
└── skills/ (6 个技能目录)

[确认安装] [更换目录] [取消]
```

**新项目决策流程**：
```
新项目 → 是否有现有 AI 配置？
  ├─ 否 → 推荐创建 .opencode/ → 用户确认
  └─ 是 → 进入步骤 4.1 的多选流程
```

**老项目决策流程**：
```
老项目 → 扫描现有 AI 配置（步骤 4.1）
  ├─ 0 个 → 进入步骤 4.2
  ├─ 1 个 → 询问："检测到 [工具] 配置，是否在此更新？"
  └─ 2+ 个 → 多选界面："选择要更新的目录"
```

### 4.4 检测已存在的 AI 文档（老项目）

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

- **0 个文件** → 直接进入阶段 5，使用模板全新生成
- **1+ 个文件** → 进入阶段 5.1「信息提取与整合」流程

> 💡 **说明**：检测到已有 AI 文档时，AI 将自动提取其中的技术栈、项目结构、编码规范等信息，询问用户是否整合到 OpenSpec 配置中。如果用户选择不整合，则直接使用 OpenSpec 模板生成配置（覆盖现有文件）。

---

## 阶段 5：执行安装

> ⚠️ **CRITICAL**: 本阶段是信息流整合的核心，请严格按照顺序执行。

### 信息流概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        信息流分类                               │
├─────────────────────────────────────────────────────────────────┤
│  技术栈信息（框架/语言/包管理器等）                              │
│  ├─ 来源：阶段 2（新项目）或 阶段 3（老项目检测）                │
│  ├─ 用途：填充 config.yaml 和 AGENTS.md 中的变量占位符          │
│  └─ 处理：直接传递到 Step 5.3，不经过整合流程                   │
├─────────────────────────────────────────────────────────────────┤
│  非技术类信息（编码规范/AI角色/项目约定）                        │
│  ├─ 来源：阶段 4.4 提取自现有 AI 文档                           │
│  ├─ 用途：合并到 AGENTS.md 的约定部分                           │
│  └─ 处理：经过 Step 5.2 → Step 5.3 → Step 5.4 的整合流程        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.1 执行 openspec init

```bash
openspec init
```

这会创建完整的默认配置：
- `openspec/config.yaml`（默认项目配置）
- `openspec/schemas/`（默认 schema 模板）
- `{{AI_CONFIG_DIR}}/commands/`（默认 AI 命令）
- `{{AI_CONFIG_DIR}}/skills/`（默认 AI 技能）

> ⚠️ **注意**: 生成的是**通用默认配置**，需要在后续步骤替换为 Harness 专用模板

### 5.2 信息提取（老项目专属）

> 🎯 **ACTION**: 仅在阶段 4.4 检测到已有 AI 文档时执行

如果阶段 4.4 检测到已有 AI 文档：

**第一步：提取信息**

```
从原有文档提取到以下信息：
- 技术栈: TypeScript + Next.js
- 项目结构: src/ 源码目录
- 编码规范: Airbnb ESLint
- AI 角色定义: SpecWriter, Developer, Tester
```

**第二步：信息分类与校验**

> ⚠️ **CRITICAL**: 区分两类信息的处理方式

| 信息类型 | 校验规则 | 处理方式 | 最终用途 |
|----------|----------|----------|----------|
| **技术栈信息** (框架/语言/包管理器等) | 与阶段 3 检测结果比对 | 不一致 → **丢弃**，以检测结果为准 | **传递**到 Step 5.3（填充变量） |
| **项目结构信息** (源码目录/测试目录等) | 与阶段 3 检测结果比对 | 不一致 → **丢弃**，以检测结果为准 | **传递**到 Step 5.3（填充变量） |
| **常用命令** (dev/test/build 等) | 与 package.json 等比对 | 不存在 → **丢弃** | **传递**到 Step 5.3（填充变量） |
| **编码规范** | 无需校验 | **保留** | **整合**到 AGENTS.md |
| **AI 角色/工作流** | 无需校验 | **保留** | **整合**到 AGENTS.md |
| **项目约定/最佳实践** | 无需校验 | **保留** | **整合**到 AGENTS.md |

**第三步：用户确认**

```
检测到原有 AI 文档，提取信息如下：

✅ 技术栈信息（以阶段 3 检测结果为准）：
   - 框架: Next.js 15 ✓
   - 语言: TypeScript ✓

⚠️  以下信息文档与工程不符，已丢弃：
   - 包管理器: npm → 实际: pnpm

💡 可整合的非技术类信息：
   - 编码规范: Airbnb ESLint
   - AI 角色定义

是否整合上述非技术类信息？
[整合] → 暂存非技术类信息，进入 Step 5.3
[不整合] → 丢弃所有提取信息，进入 Step 5.3
```

**暂存信息说明**：

如果用户选择「整合」：

| 信息类型 | 来源 | 暂存位置 | 后续处理 |
|----------|------|----------|----------|
| 技术栈信息（通过校验） | CLAUDE.md / 阶段3检测 | **内存变量池** | Step 5.3 直接填充到 config.yaml |
| 编码规范、代码风格 | CLAUDE.md / AGENTS.md | **内存暂存** | Step 5.4 合并到 AGENTS.md |
| AI 角色、工作流定义 | AGENTS.md 等 | **内存暂存** | Step 5.4 合并到 AGENTS.md |
| 项目约定/最佳实践 | 任意文档 | **内存暂存** | Step 5.4 合并到 AGENTS.md |

> 💡 **关键区分**：
> - **"技术栈信息"** → **传递路径**：直接填充到模板变量，不修改文档内容
> - **"非技术类信息"** → **整合路径**：合并到 AGENTS.md 的约定部分

### 5.3 替换为 Harness 模板并填充变量（必须执行）

> ⚠️ **CRITICAL**: 使用 Harness 专用模板**完全替换** `openspec init` 生成的默认配置，并立即填充所有技术栈相关变量

#### 步骤 5.3.1：复制模板文件

**模板文件来源说明**：
- 模板位于 **OpenSpec Harness 安装包根目录** 的 `.template/` 目录下
- 执行时需定位到安装包目录，或使用绝对路径
- 示例：如果 OpenSpec Harness 安装在 `~/openspec-opc/`，则模板路径为 `~/openspec-opc/.template/`

> ⚠️ **覆盖警告**：模板文件将**完全覆盖**已有配置：
> - `openspec/config.yaml` → 覆盖已有配置（新项目无此问题）
> - `AGENTS.md` → 覆盖已有文件（如果存在）
> - `commands/` 和 `skills/` → 在阶段 4 选择的目录中覆盖
>
> **安全建议**：
> - 如果项目已有 `AGENTS.md` 或其他 AI 文档，AI 应在阶段 4.4 检测并询问是否整合
> - 如果用户选择"不整合"，模板将直接覆盖，原有内容会丢失
> - 建议在覆盖前备份原有文件

| 源文件 | 目标文件 | 说明 |
|--------|----------|------|
| `${OPENSPEC_HARNESS_ROOT}/.template/openspec/config.yaml` | `openspec/config.yaml` | 覆盖默认项目配置 |
| `${OPENSPEC_HARNESS_ROOT}/.template/openspec/schemas/*` | `openspec/schemas/*` | 覆盖默认 schema |
| `${OPENSPEC_HARNESS_ROOT}/.template/AGENTS.md` | `AGENTS.md` | 覆盖（如存在原文件则覆盖） |
| `${OPENSPEC_HARNESS_ROOT}/.template/custom/commands/*` | `{{AI_CONFIG_DIR}}/commands/*` | 覆盖默认命令 |
| `${OPENSPEC_HARNESS_ROOT}/.template/custom/skills/*` | `{{AI_CONFIG_DIR}}/skills/*` | 覆盖默认技能 |

**必须全部复制的 Commands：**
```
□ opsx-explore.md
□ opsx-propose.md
□ opsx-apply.md
□ opsx-archive.md
□ opsx-bugfix.md
□ opsx-spike.md
```

**必须全部复制的 Skills：**
```
□ openspec-explore/
□ openspec-propose/
□ openspec-apply-change/
□ openspec-archive-change/
□ openspec-bugfix/
□ openspec-spike/
```

> ⚠️ **CRITICAL**: Commands 和 Skills **必须**从 `.template/custom/` 复制，**禁止使用** `openspec init` 生成的默认内容！

#### 步骤 5.3.2：填充技术栈变量

> 🎯 **ACTION**: 技术栈信息来源于**阶段 2（新项目）或阶段 3（老项目）**，填充到 config.yaml 和 AGENTS.md

**填充流程**：

1. **收集变量值**：
   - 新项目：使用阶段 2 用户输入的信息
   - 老项目：使用阶段 3 检测结果（或阶段 5.2 通过校验的信息）

2. **执行变量替换**：
   - AI 遍历所有占位符，逐一替换
   - 无法自动填充的变量 → 列表询问用户

3. **用户确认**：
   ```
   📝 变量填充预览：

   config.yaml:
   - PROJECT_NAME: MyApp
   - PACKAGE_MANAGER: pnpm
   - WEB_FRAMEWORK: Next.js 15

   AGENTS.md:
   - PROJECT_NAME: MyApp
   - SRC_DIR: src/
   - TEST_DIR: src/tests/

   以下变量需要确认：
   - TEST_FRAMEWORK: [未检测] 请输入测试框架名称
   - BUILD_TOOL: [未检测] 请输入构建工具名称（留空跳过）

   [确认并填充] [修改配置]
   ```

4. **验证填充结果**：

   ```bash
   # 替换完成后检查是否还有未替换的占位符
   grep -E '\{\{[A-Z_]+\}\}' openspec/config.yaml AGENTS.md
   # 应该无输出
   ```

> ⚠️ **CRITICAL**: 所有占位符**必须**替换，不能原样复制到目标文件！

### 5.4 整合非技术类信息（仅选择「整合」时执行）

> 💡 **说明**: 本步骤仅整合**非技术类信息**（编码规范、AI角色、项目约定等）。技术栈信息已在 Step 5.3 填充完成。

如果 Step 5.2 用户选择「整合」：
- 将暂存的编码规范、AI 角色等信息 → 合并到 `AGENTS.md`
- 将暂存的项目约定/最佳实践 → 合并到 `AGENTS.md`

如果用户选择「不整合」：
- 跳过此步骤，保持 Harness 模板原样（丢弃原有 AI 文档内容）

**整合示例：**

假设从 `CLAUDE.md` 提取到（已通过校验）：
```markdown
## 编码规范
- 使用 Airbnb TypeScript 规范
- 所有函数必须有 JSDoc 注释
- 组件文件使用 PascalCase 命名

## AI 角色定义
- SpecWriter: 负责编写规格文档
- Developer: 负责实现代码
- Tester: 负责验证测试
```

整合后 `AGENTS.md` 追加：
```markdown
## 编码规范
- Airbnb TypeScript ESLint
- JSDoc required for all functions
- 组件文件使用 PascalCase 命名

## AI 角色
- SpecWriter: 负责编写规格文档
- Developer: 负责实现代码
- Tester: 负责验证测试
```

### 5.5 变量参考表

> 💡 **说明**: 本节列出所有需要填充的变量及其数据来源，辅助 AI 完成变量替换。

#### AGENTS.md 变量

| 占位符                | 替换为   | 示例                       | 数据来源 |
| --------------------- | -------- | -------------------------- | -------- |
| `PROJECT_NAME`        | 项目名称 | `MyApp`                    | 阶段 2 用户输入 / package.json |
| `PROJECT_DESCRIPTION` | 项目描述 | `A web application for...` | 阶段 2 用户输入 / CLAUDE.md |
| `TEST_DIR`            | 测试目录 | `src/tests/`               | 阶段 3 检测 / 用户输入 |
| `SRC_DIR`             | 源码目录 | `src/`                     | 阶段 3 检测 / 用户输入 |
| `PACKAGE_MANAGER`     | 包管理器 | `pnpm`                     | 阶段 3 检测 / 阶段 2 用户输入 |

#### config.yaml 变量

**基础变量（直接替换）：**

| 占位符                    | 替换为     | 示例                | 数据来源 |
| ------------------------- | ---------- | ------------------- | -------- |
| `{{PROJECT_NAME}}`        | 项目名称   | `MyApp`             | 阶段 2 用户输入 / package.json |
| `{{PROJECT_DESCRIPTION}}` | 项目描述   | `A web application` | 阶段 2 用户输入 / CLAUDE.md |
| `{{LANGUAGE}}`            | 编程语言   | `TypeScript`        | 阶段 3 检测 / 阶段 2 用户输入 |
| `{{RUNTIME}}`             | 运行时     | `Node.js >=22.0.0`  | 阶段 3 检测 / package.json engines |
| `{{PACKAGE_MANAGER}}`     | 包管理器   | `pnpm`              | 阶段 3 检测 / 阶段 2 用户输入 |
| `{{LANGUAGE_VERSION}}`    | 语言版本   | `TypeScript 5.9+`   | 阶段 3 检测 / package.json |
| `{{TEST_FRAMEWORK}}`      | 测试框架   | `vitest`            | 阶段 3 检测 / devDependencies |
| `{{RUNTIME_VERSION}}`     | 运行时版本 | `Node.js >=22.0.0`  | 阶段 3 检测 / package.json engines |

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

## 阶段 6：完成验证

> 🎯 **ACTION**: 安装完成后逐项验证：

```
□ openspec/config.yaml 存在且格式正确
□ openspec/schemas/ 包含 spec-driven、bugfix、spike
□ AGENTS.md 存在
□ {{AI_CONFIG_DIR}}/commands/ 包含 6 个命令文件
  - opsx-explore.md
  - opsx-propose.md
  - opsx-apply.md
  - opsx-archive.md
  - opsx-bugfix.md
  - opsx-spike.md
□ {{AI_CONFIG_DIR}}/skills/ 包含 6 个技能目录
  - openspec-explore/
  - openspec-propose/
  - openspec-apply-change/
  - openspec-archive-change/
  - openspec-bugfix/
  - openspec-spike/
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
openspec-opc/.template/
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
