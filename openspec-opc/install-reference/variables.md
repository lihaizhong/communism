# 变量参考表

> 本文档列出所有需要填充的变量及其数据来源，供阶段 5.3 变量替换时参考。

## AGENTS.md 变量

| 占位符 | 替换为 | 示例 | 数据来源 | 必填 |
|--------|--------|------|----------|------|
| `PROJECT_NAME` | 项目名称 | `MyApp` | 阶段 2 用户输入 / package.json name 字段 | ✅ |
| `PROJECT_DESCRIPTION` | 项目描述 | `A web application for...` | 阶段 2 用户输入 / README.md / CLAUDE.md | ⬜ |
| `TEST_DIR` | 测试目录 | `src/tests/` | 阶段 3 检测 / 项目结构扫描 / 用户输入 | ✅ |
| `SRC_DIR` | 源码目录 | `src/` | 阶段 3 检测 / 项目结构扫描 / 用户输入 | ✅ |
| `PACKAGE_MANAGER` | 包管理器 | `pnpm` | 阶段 3 检测 / lock 文件分析 | ✅ |

---

## config.yaml 基础变量

### 核心变量（直接替换）

| 占位符 | 替换为 | 示例 | 数据来源 | 必填 |
|--------|--------|------|----------|------|
| `{{PROJECT_NAME}}` | 项目名称 | `MyApp` | 阶段 2 用户输入 / package.json name | ✅ |
| `{{PROJECT_DESCRIPTION}}` | 项目描述 | `A web application` | 阶段 2 用户输入 / CLAUDE.md | ⬜ |
| `{{LANGUAGE}}` | 编程语言 | `TypeScript` | 阶段 3 检测 / 阶段 2 用户输入 | ✅ |
| `{{RUNTIME}}` | 运行时 | `Node.js >=22.0.0` | 阶段 3 检测 / package.json engines | ✅ |
| `{{PACKAGE_MANAGER}}` | 包管理器 | `pnpm` | 阶段 3 检测 / 阶段 2 用户输入 | ✅ |
| `{{LANGUAGE_VERSION}}` | 语言版本 | `TypeScript 5.9+` | 阶段 3 检测 / package.json devDependencies | ⬜ |
| `{{TEST_FRAMEWORK}}` | 测试框架 | `vitest` | 阶段 3 检测 / devDependencies | ⬜ |
| `{{RUNTIME_VERSION}}` | 运行时版本 | `Node.js >=22.0.0` | 阶段 3 检测 / package.json engines | ⬜ |

---

## 条件变量（根据项目类型生成整行）

条件变量只在特定条件下生效，否则生成空行。

### Web 框架相关

| 占位符 | 条件 | 生成示例 | 检测方法 |
|--------|------|----------|----------|
| `{{WEB_FRAMEWORK_LINE}}` | Web 项目 | `web_framework: Next.js 15` | 检测 package.json 中的 next/nuxt/sveltekit 等 |
| `{{UI_FRAMEWORK_LINE}}` | 有 UI 框架 | `ui: React 19 + Tailwind CSS` | 检测 react/vue/svelte + tailwind/styled-components |

**生成规则**：

```yaml
# Web 项目且有 UI 框架
web_framework: {{FRAMEWORK_NAME}}
ui: {{UI_LIBRARY}} + {{CSS_FRAMEWORK}}

# 非 Web 项目或无 UI 框架
# （生成空行，不包含任何内容）
```

### 构建工具

| 占位符 | 条件 | 生成示例 | 检测方法 |
|--------|------|----------|----------|
| `{{BUILD_TOOL_LINE}}` | 指定构建工具 | `build_tool: Vite` | 用户输入 / 检测 vite.config.* / webpack.config.* |

### TypeScript 约定

| 占位符 | 条件 | 生成示例 | 检测方法 |
|--------|------|----------|----------|
| `{{TYPESCRIPT_CONVENTION}}` | TypeScript 项目 | `- Strict TypeScript` | 检测 tsconfig.json 存在 |

---

## 模块配置（动态生成多行）

`{{MODULES_SECTION}}` 根据项目类型生成完整的模块配置块。

### Web/全栈项目示例

```yaml
src:
  purpose: Next.js web service
  scope: Web UI, API routes, components
  tests: src/tests/
```

### 服务端项目示例

```yaml
src:
  purpose: API service
  scope: Routes, controllers, services
  tests: src/tests/
```

### Go 项目示例

```yaml
cmd:
  purpose: Application entry points
  scope: Main executables
  tests: ./...
internal:
  purpose: Internal packages
  scope: Private implementation
  tests: ./...
pkg:
  purpose: Public packages
  scope: Exported libraries
  tests: ./...
```

### Python 项目示例

```yaml
src:
  purpose: Application source
  scope: Core logic, API, models
  tests: tests/
app:
  purpose: Application entry
  scope: CLI, web app setup
  tests: tests/
```

---

## 命令配置（条件生成）

| 占位符 | 条件 | 生成示例 | 检测方法 |
|--------|------|----------|----------|
| `{{DEV_COMMAND_LINE}}` | 有 dev 命令 | `dev: pnpm dev` | package.json scripts.dev |
| `{{BUILD_COMMAND_LINE}}` | 有 build 命令 | `build: pnpm build` | package.json scripts.build |
| `{{TEST_COMMAND_LINE}}` | 有 test 命令 | `test: pnpm test` | package.json scripts.test |
| `{{TEST_UNIT_COMMAND_LINE}}` | 有 test:unit 命令 | `test_unit: pnpm test:unit` | package.json scripts["test:unit"] |
| `{{LINT_COMMAND_LINE}}` | 有 lint 命令 | `lint: pnpm lint` | package.json scripts.lint |
| `{{TYPE_CHECK_COMMAND_LINE}}` | 有 type-check 命令 | `type_check: pnpm type-check` | package.json scripts["type-check"] |

**生成规则**：

```yaml
# 如果命令存在
dev: pnpm dev
test: pnpm test

# 如果命令不存在
# （跳过该行，不生成）
```

---

## 变量填充流程

### Step 1: 收集变量值

**新项目**：使用阶段 2 用户输入的信息

**老项目**：使用阶段 3 检测结果（或阶段 5.2 通过校验的信息）

### Step 2: 执行变量替换

遍历所有占位符，逐一替换。对于无法自动填充的变量，向用户询问。

### Step 3: 用户确认

```
📝 变量填充预览：

config.yaml:
- PROJECT_NAME: MyApp ✓
- PACKAGE_MANAGER: pnpm ✓
- WEB_FRAMEWORK: Next.js 15 ✓

AGENTS.md:
- PROJECT_NAME: MyApp ✓
- SRC_DIR: src/ ✓
- TEST_DIR: src/tests/ ✓

以下变量需要确认：
- TEST_FRAMEWORK: [未检测] 请输入测试框架名称
- BUILD_TOOL: [未检测] 请输入构建工具名称（留空跳过）

[确认并填充] [修改配置]
```

### Step 4: 验证填充结果

```bash
# 替换完成后检查是否还有未替换的占位符
grep -E '\{\{[A-Z_]+\}\}' openspec/config.yaml AGENTS.md
# 应该无输出
```

---

## ⚠️ 重要提醒

1. **所有占位符必须替换**，不能原样复制到目标文件
2. **条件变量**只有在满足条件时才生成内容，否则为空行
3. **缺失变量**必须向用户确认，不能跳过或假设默认值
4. **路径变量**要确保使用正确的分隔符（`/` 或 `\`）

---

## 参考文档

- [技术栈检测指南](./tech-detection.md) - 如何检测各项目类型的技术栈
- [CI/CD 模板](./ci-templates.md) - CI/CD 配置模板
- [检查清单](./checklist.md) - 强制停止点检查