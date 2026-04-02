# 技术栈检测指南

> 本文档提供各项目类型的完整技术栈检测逻辑，供阶段 3 使用。

## 检测原则

1. **优先检测标志性文件**：从最能确定项目类型的文件开始
2. **交叉验证**：多个信号互相验证，避免误判
3. **版本提取**：从 package.json / go.mod / Cargo.toml 等文件提取准确版本
4. **保守策略**：无法确定时询问用户确认

---

## Node.js / Web 前端项目

### 标志性文件

```
package.json        ✓ Node.js 项目确认
pnpm-lock.yaml      → 包管理器：pnpm
yarn.lock          → 包管理器：yarn
package-lock.json   → 包管理器：npm
```

### 框架检测

| 依赖名 | 框架名称 | 版本提取位置 |
|--------|----------|--------------|
| `next` | Next.js | dependencies.next |
| `nuxt` | Nuxt.js | dependencies.nuxt |
| `react` | React | dependencies.react |
| `vue` | Vue | dependencies.vue |
| `svelte` | Svelte | dependencies.svelte |
| `angular` | Angular | dependencies.@angular/core |
| `vite` | Vite (构建工具) | devDependencies.vite |
| `webpack` | Webpack (构建工具) | devDependencies.webpack |

### UI 框架检测

| 依赖名 | UI 框架 | 版本提取位置 |
|--------|---------|--------------|
| `tailwindcss` | Tailwind CSS | devDependencies.tailwindcss |
| `styled-components` | styled-components | dependencies["styled-components"] |
| `@emotion/react` | Emotion | dependencies["@emotion/react"] |
| `@chakra-ui/react` | Chakra UI | dependencies["@chakra-ui/react"] |
| `@mui/material` | Material UI | dependencies["@mui/material"] |
| `antd` | Ant Design | dependencies.antd |

### 测试框架检测

| 依赖名 | 测试框架 | 版本提取位置 |
|--------|----------|--------------|
| `vitest` | Vitest | devDependencies.vitest |
| `jest` | Jest | devDependencies.jest |
| `@testing-library/react` | Testing Library | devDependencies["@testing-library/react"] |
| `cypress` | Cypress (E2E) | devDependencies.cypress |
| `playwright` | Playwright (E2E) | devDependencies.playwright |

### TypeScript 检测

```bash
# 检测文件
tsconfig.json        ✓ TypeScript 项目

# 检测 package.json
devDependencies.typescript  → TypeScript 版本
```

### Node.js 运行时检测

```bash
# 从 package.json engines 字段提取
"engines": {
  "node": ">=22.0.0"
}

# 或检测 .nvmrc / .node-version 文件
cat .nvmrc       # 例如：22
cat .node-version # 例如：v22.0.0
```

### 检测脚本示例 (Node.js)

```bash
# 项目类型
[ -f package.json ] && echo "✓ Node.js 项目"

# 包管理器
[ -f pnpm-lock.yaml ] && echo "✓ 包管理器：pnpm"
[ -f yarn.lock ] && echo "✓ 包管理器：yarn"
[ -f package-lock.json ] && echo "✓ 包管理器：npm"

# 框架
grep -q '"next"' package.json && echo "✓ 框架：Next.js"
grep -q '"react"' package.json && echo "✓ UI：React"
grep -q '"tailwindcss"' package.json && echo "✓ CSS：Tailwind"

# 测试
grep -q '"vitest"' package.json && echo "✓ 测试：Vitest"

# TypeScript
[ -f tsconfig.json ] && echo "✓ TypeScript 项目"

# 运行时
[ -f .nvmrc ] && echo "✓ Node 版本：$(cat .nvmrc)"
```

---

## Go 项目

### 标志性文件

```
go.mod              ✓ Go 项目确认
go.sum              ✓ 依赖锁定文件
```

### 检测内容

```bash
# 确认 Go 项目
[ -f go.mod ] && echo "✓ Go 项目"

# 提取 Go 版本
grep -E "^go [0-9]" go.mod | head -1
# 输出示例：go 1.22

# 提取模块名称
grep "^module" go.mod | head -1
# 输出示例：module github.com/user/myapp

# 检测框架
grep -q "github.com/gin-gonic/gin" go.mod && echo "✓ Web 框架：Gin"
grep -q "github.com/labstack/echo" go.mod && echo "✓ Web 框架：Echo"
grep -q "go.uber.org/fx" go.mod && echo "✓ DI 框架：Fx"
grep -q "github.com/spf13/cobra" go.mod && echo "✓ CLI 框架：Cobra"

# 检测测试
[ -d $(find . -name "*_test.go" | head -1 | xargs dirname) ] && echo "✓ 有 Go 测试"

# 检测目录结构
[ -d cmd ] && echo "✓ 有 cmd/ 目录"
[ -d internal ] && echo "✓ 有 internal/ 目录"
[ -d pkg ] && echo "✓ 有 pkg/ 目录"
[ -d api ] && echo "✓ 有 api/ 目录"
```

### config.yaml 变量映射

| 项目类型 | 变量 | 值示例 |
|----------|------|--------|
| Go 服务端 | LANGUAGE | `Go` |
| Go 服务端 | RUNTIME | `Go 1.22+` |
| Go 服务端 | PACKAGE_MANAGER | `go mod` |
| Go 服务端 | TEST_FRAMEWORK | `go test` |
| Go 服务端 | SRC_DIR | `.` (根目录) |

---

## Python 项目

### 标志性文件

```
pyproject.toml      ✓ PEP 517/518 项目（首选）
requirements.txt    ✓ 传统依赖管理
setup.py            ✓ 传统打包
Pipfile             ✓ Pipenv 项目
poetry.lock         ✓ Poetry 项目
```

### 检测内容

```bash
# 确认 Python 项目
[ -f pyproject.toml ] && echo "✓ Python 项目 (现代)"
[ -f requirements.txt ] && echo "✓ Python 项目 (传统)"
[ -f Pipfile ] && echo "✓ Python 项目 (Pipenv)"
[ -f poetry.lock ] && echo "✓ Python 项目 (Poetry)"

# 包管理器
[ -f poetry.lock ] && echo "✓ 包管理器：Poetry"
[ -f Pipfile ] && echo "✓ 包管理器：Pipenv"
[ -f requirements.txt ] && ! [ -f poetry.lock ] && echo "✓ 包管理器：pip"

# 检测框架
grep -q "fastapi" pyproject.toml requirements.txt 2>/dev/null && echo "✓ Web 框架：FastAPI"
grep -q "django" pyproject.toml requirements.txt 2>/dev/null && echo "✓ Web 框架：Django"
grep -q "flask" pyproject.toml requirements.txt 2>/dev/null && echo "✓ Web 框架：Flask"
grep -q "faststream" pyproject.toml requirements.txt 2>/dev/null && echo "✓ 异步框架：FastStream"

# 检测测试
grep -q "pytest" pyproject.toml requirements.txt 2>/dev/null && echo "✓ 测试框架：pytest"
grep -q "unittest" pyproject.toml requirements.txt 2>/dev/null && echo "✓ 测试框架：unittest"

# Python 版本 (pyproject.toml)
grep -E "python.*=.*\"3\.[0-9]" pyproject.toml
# 输出示例：python = ">=3.10"

# 检测目录结构
[ -d src ] && echo "✓ 有 src/ 目录"
[ -d app ] && echo "✓ 有 app/ 目录"
[ -d tests ] && echo "✓ 有 tests/ 目录"
```

### config.yaml 变量映射

| 项目类型 | 变量 | 值示例 |
|----------|------|--------|
| Python 服务端 | LANGUAGE | `Python` |
| Python 服务端 | RUNTIME | `Python 3.11+` |
| Python 服务端 | PACKAGE_MANAGER | `poetry` / `pip` / `pipenv` |
| Python 服务端 | TEST_FRAMEWORK | `pytest` |

---

## Rust 项目

### 标志性文件

```
Cargo.toml          ✓ Rust 项目确认
Cargo.lock          ✓ 依赖锁定文件
```

### 检测内容

```bash
# 确认 Rust 项目
[ -f Cargo.toml ] && echo "✓ Rust 项目"

# 提取项目名称
grep "^name = " Cargo.toml | head -1
# 输出示例：name = "myapp"

# 提取 Rust 版本 (MSRV)
grep "rust-version" Cargo.toml
# 输出示例：rust-version = "1.75"

# 检测框架
grep -q "actix-web" Cargo.toml && echo "✓ Web 框架：Actix Web"
grep -q "axum" Cargo.toml && echo "✓ Web 框架：Axum"
grep -q "rocket" Cargo.toml && echo "✓ Web 框架：Rocket"
grep -q "warp" Cargo.toml && echo "✓ Web 框架：Warp"
grep -q "clap" Cargo.toml && echo "✓ CLI 框架：Clap"

# 检测测试 (Rust 内置测试)
grep -q "\[dev-dependencies\]" Cargo.toml && echo "✓ 有开发依赖"

# 检测 Tauri (桌面应用)
[ -d src-tauri ] && echo "✓ Tauri 桌面应用"

# 检测目录结构
[ -d src ] && echo "✓ 有 src/ 目录"
[ -d tests ] && echo "✓ 有 tests/ 目录 (集成测试)"
```

### config.yaml 变量映射

| 项目类型 | 变量 | 值示例 |
|----------|------|--------|
| Rust 服务端 | LANGUAGE | `Rust` |
| Rust 服务端 | RUNTIME | `Rust 1.75+` |
| Rust 服务端 | PACKAGE_MANAGER | `cargo` |
| Rust 服务端 | TEST_FRAMEWORK | `cargo test` |

---

## Flutter / Dart 项目

### 标志性文件

```
pubspec.yaml        ✓ Flutter/Dart 项目确认
pubspec.lock        ✓ 依赖锁定文件
```

### 检测内容

```bash
# 确认 Flutter 项目
[ -f pubspec.yaml ] && echo "✓ Flutter/Dart 项目"

# 检测是否为 Flutter (vs 纯 Dart)
grep -q "flutter:" pubspec.yaml && echo "✓ Flutter 应用" || echo "✓ Dart 项目"

# 提取项目名称
grep "^name:" pubspec.yaml | head -1
# 输出示例：name: my_app

# Dart SDK 版本
grep "sdk:" pubspec.yaml
# 输出示例：sdk: ">=3.0.0 <4.0.0"

# 检测框架
grep -q "flutter_riverpod" pubspec.yaml && echo "✓ 状态管理：Riverpod"
grep -q "provider" pubspec.yaml && echo "✓ 状态管理：Provider"
grep -q "bloc" pubspec.yaml && echo "✓ 状态管理：BLoC"
grep -q "get" pubspec.yaml && echo "✓ 状态管理：GetX"

# 检测测试
grep -q "flutter_test:" pubspec.yaml && echo "✓ 测试框架：flutter_test"
grep -q "mocktail" pubspec.yaml && echo "✓ Mock 库：Mocktail"

# 检测平台
[ -d web ] && echo "✓ 支持 Web 平台"
[ -d android ] && echo "✓ 支持 Android 平台"
[ -d ios ] && echo "✓ 支持 iOS 平台"
[ -d macos ] && echo "✓ 支持 macOS 平台"
[ -d windows ] && echo "✓ 支持 Windows 平台"
[ -d linux ] && echo "✓ 支持 Linux 平台"
```

### config.yaml 变量映射

| 项目类型 | 变量 | 值示例 |
|----------|------|--------|
| Flutter 应用 | LANGUAGE | `Dart` |
| Flutter 应用 | RUNTIME | `Flutter SDK 3.x` |
| Flutter 应用 | PACKAGE_MANAGER | `flutter pub` |
| Flutter 应用 | TEST_FRAMEWORK | `flutter_test` |

---

## Tauri 项目 (混合技术栈)

### 标志性文件

```
src-tauri/Cargo.toml   ✓ Tauri 后端确认
package.json           ✓ 前端项目确认
```

### 检测内容

```bash
# 确认 Tauri 项目
[ -f src-tauri/Cargo.toml ] && echo "✓ Tauri 项目"

# 检测前端框架 (从 package.json)
grep -q '"react"' package.json && echo "✓ 前端：React"
grep -q '"vue"' package.json && echo "✓ 前端：Vue"
grep -q '"svelte"' package.json && echo "✓ 前端：Svelte"
grep -q '"solid-js"' package.json && echo "✓ 前端：Solid"

# 检测包管理器 (前端)
[ -f pnpm-lock.yaml ] && echo "✓ 前端包管理器：pnpm"
[ -f yarn.lock ] && echo "✓ 前端包管理器：yarn"
[ -f package-lock.json ] && echo "✓ 前端包管理器：npm"

# 检测 Rust 版本 (后端)
grep "rust-version" src-tauri/Cargo.toml
# 输出示例：rust-version = "1.75"

# 检测 Tauri 版本
grep "tauri" src-tauri/Cargo.toml | head -1
# 输出示例：tauri = { version = "2.0" }
```

### config.yaml 变量映射

Tauri 项目需要记录 **两套变量**：

| 层级 | 变量 | 值示例 |
|------|------|--------|
| 前端 | LANGUAGE | `TypeScript` |
| 前端 | PACKAGE_MANAGER | `pnpm` |
| 前端 | WEB_FRAMEWORK | `React + Vite` |
| 后端 | LANGUAGE | `Rust` |
| 后端 | RUNTIME | `Rust 1.75+` |
| 项目类型 | PROJECT_TYPE | `Tauri Desktop App` |

---

## Electron 项目

### 标志性文件

```
package.json           ✓ Node.js 项目确认
electron/              或
electron-builder.yml   ✓ Electron 配置
```

### 检测内容

```bash
# 确认 Electron 项目
grep -q '"electron"' package.json && echo "✓ Electron 项目"
[ -f electron-builder.yml ] && echo "✓ Electron Builder 配置"

# 前端框架 (从 package.json)
grep -q '"react"' package.json && echo "✓ 前端：React"
grep -q '"vue"' package.json && echo "✓ 前端：Vue"

# Electron 版本
grep '"electron"' package.json
# 输出示例："electron": "^28.0.0"
```

### config.yaml 变量映射

| 项目类型 | 变量 | 值示例 |
|----------|------|--------|
| Electron | LANGUAGE | `TypeScript` (前端) + `JavaScript` (主进程) |
| Electron | RUNTIME | `Electron 28+` |
| Electron | PACKAGE_MANAGER | `pnpm` / `yarn` / `npm` |

---

## 检测报告模板

AI 在完成检测后，生成如下报告：

```
🔍 技术栈检测报告

📋 检测结果：
├─ 项目类型: [Web 前端 / 服务端 / 桌面应用 / 全栈]
├─ 框架: [框架名称 + 版本]
├─ 语言: [语言名称]
├─ 运行时: [运行时 + 版本要求]
├─ 包管理器: [包管理器名称]
├─ 测试框架: [测试框架名称]
└─ 构建工具: [构建工具名称]

📁 目录结构：
├─ 源码目录: [src/ 目录路径]
├─ 测试目录: [tests/ 目录路径]
└─ 配置文件: [配置文件路径]

⚠️ 需要确认：
├─ [无法自动检测的项目]
└─ [多个选项需用户选择]

[确认无误] [修改配置]
```

---

## 参考文档

- [变量参考表](./variables.md) - 需要填充的变量列表
- [检查清单](./checklist.md) - 检测完成确认