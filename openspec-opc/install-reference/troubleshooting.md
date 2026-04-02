# 故障排查 FAQ

> 本文档提供安装过程中的常见问题和解决方案。

---

## 🚨 常见错误

### E001: OpenSpec CLI 安装失败

**错误信息**：
```
npm ERR! network request failed
npm ERR! EACCES permission denied
```

**解决方案**：

| 原因 | 解决方法 |
|------|----------|
| 网络问题 | 切换镜像源：`npm config set registry https://registry.npmmirror.com` |
| 权限问题 | 使用 sudo 或修复权限：`sudo chown -R $(whoami) ~/.npm` |
| Node 版本过低 | 升级到 Node.js 18+: `nvm install 22 && nvm use 22` |

**验证**：
```bash
openspec --version
```

---

### E002: 项目目录检测失败

**错误信息**：
```
⚠️ 未检测到项目根目录标志
```

**解决方案**：

```bash
# 检查当前目录
pwd
ls -la

# 确认是否在项目根目录
# 应该存在以下文件之一：
# - package.json (Node.js)
# - go.mod (Go)
# - Cargo.toml (Rust)
# - pyproject.toml (Python)
# - .git/ (Git 仓库)

# 如果不在项目根目录，切换到正确位置
cd /path/to/your/project
```

**如果项目是新创建的**：
```bash
# 创建 package.json
npm init -y

# 或初始化 Git 仓库
git init
```

---

### E003: openspec init 失败

**错误信息**：
```
Error: Cannot find module 'openspec'
Error: command not found: openspec
```

**解决方案**：

```bash
# 1. 确认 CLI 已安装
which openspec
# 输出：/usr/local/bin/openspec

# 2. 如果未安装，重新安装
npm install -g @fission-ai/openspec@latest

# 3. 清除缓存重试
openspec --version
openspec init
```

---

### E004: 变量填充后仍有占位符

**错误信息**：
```
检测到未替换的占位符：
- openspec/config.yaml: {{PROJECT_NAME}}
- AGENTS.md: {{TEST_DIR}}
```

**解决方案**：

```bash
# 1. 查看剩余占位符
grep -E '\{\{[A-Z_]+\}\}' openspec/config.yaml AGENTS.md

# 2. 手动填充缺失变量
# 使用编辑器打开文件，搜索 {{变量名}} 并替换

# 3. 验证填充结果
grep -E '\{\{[A-Z_]+\}\}' openspec/config.yaml AGENTS.md
# 应该无输出
```

**手动填充示例**：
```yaml
# 将
project_name: {{PROJECT_NAME}}
# 替换为
project_name: MyApp
```

---

### E005: 模板文件不存在

**错误信息**：
```
❌ 模板目录不存在：.template/
```

**解决方案**：

```bash
# 1. 确认 install.md 所在目录
ls -la openspec-opc/
# 应该看到 install.md 和 .template/

# 2. 如果 .template/ 不存在，检查安装包完整性
ls -R openspec-opc/

# 3. 重新下载安装包
# 从 GitHub 获取完整的 openspec-opc 目录
```

---

### E006: 配置目录被锁定

**错误信息**：
```
❌ 无法创建目录：.opencode/
权限被拒绝
```

**解决方案**：

```bash
# 1. 检查目录权限
ls -la . | grep opencode

# 2. 修复权限
chmod 755 .opencode
# 或完整重建
rm -rf .opencode
openspec init

# 3. 如果是 Windows，检查文件占用
# 关闭所有编辑器和 IDE 后重试
```

---

### E007: CI/CD 配置不生效

**错误信息**：
```
GitHub Actions 未触发
pre-commit hook 未执行
```

**解决方案**：

**GitHub Actions**：
```yaml
# 检查触发条件
on:
  release:
    types: [published]  # 只在 release 时触发

# 手动触发
# GitHub 网页 → Actions → 选择 workflow → Run workflow
```

**pre-commit**：
```bash
# 检查 hook 是否存在
ls -la .git/hooks/pre-commit
# 或
ls -la .husky/pre-commit

# 确保可执行权限
chmod +x .git/hooks/pre-commit

# 测试 hook
.git/hooks/pre-commit
```

---

### E008: Git 仓库未初始化

**错误信息**：
```
⚠️ 未检测到 Git 仓库
CI/CD 配置需要 Git 仓库
```

**解决方案**：

```bash
# 1. 初始化 Git 仓库
git init

# 2. 添加远程仓库（如需要）
git remote add origin https://github.com/user/repo.git

# 3. 初始提交
git add .
git commit -m "Initial commit"

# 4. 重新运行安装
```

---

## ⚠️ 警告处理

### W001: 检测到多个包管理器

**警告信息**：
```
⚠️ 检测到多个 lock 文件：
- package-lock.json (npm)
- yarn.lock (yarn)
建议使用一个包管理器
```

**处理建议**：

```bash
# 选择一个包管理器，删除其他 lock 文件
# 如果选择 pnpm：
rm package-lock.json yarn.lock
pnpm import  # 转换依赖
pnpm install

# 如果选择 yarn：
rm package-lock.json pnpm-lock.yaml
yarn install
```

---

### W002: 已有配置将被覆盖

**警告信息**：
```
⚠️ 已有 .opencode/commands/ 目录将被覆盖
```

**处理建议**：

```bash
# 备份现有配置
cp -r .opencode .opencode.backup.$(date +%Y%m%d)

# 或选择新目录
# 在阶段 4 选择创建新目录
```

---

### W003: 技术栈检测不确定

**警告信息**：
```
⚠️ 无法确定渲染模式（SSR/SSG/CSR）
```

**处理建议**：

手动确认技术栈信息：
```yaml
# 编辑 openspec/config.yaml
web_framework: Next.js 15
render_mode: SSR
```

---

## 🔧 手动恢复

### 从备份恢复

如果安装过程中出现问题：

```bash
# 1. 查看备份
ls -la .backup/

# 2. 恢复特定文件
cp .backup/*/AGENTS.md ./
cp .backup/*/openspec/config.yaml ./openspec/

# 3. 完整恢复
cp -r .backup/*/ .
```

### 完全重新安装

```bash
# 1. 清理所有 OpenSpec 相关文件
rm -rf openspec/
rm -f AGENTS.md
rm -rf .opencode/commands/
rm -rf .opencode/skills/

# 2. 重新运行安装
openspec init

# 3. 重新复制模板
# 参考 install.md 阶段 5
```

---

## ❓ 常见问题

### Q: 安装中断后如何继续？

**A**:
1. 检查 `openspec/logs/install.log`（如存在）了解中断位置
2. 根据中断阶段，从对应阶段重新开始
3. 或选择完全回滚后重新安装

---

### Q: 如何恢复被覆盖的自定义配置？

**A**:
1. 如果选择了备份，检查 `.backup/` 目录
2. 从备份中恢复需要的文件
3. 重新整合到新配置中

---

### Q: CI/CD 配置失败会影响核心功能吗？

**A**: 不会。核心功能不依赖 CI/CD：
- 可以稍后手动配置
- 或使用 Manual 模式手动执行

---

### Q: 支持哪些项目类型？

**A**: 支持但不限于：

| 类型 | 语言/框架 |
|------|----------|
| Web 前端 | React, Vue, Angular, Svelte, Next.js, Nuxt |
| 客户端 | Electron, Tauri, React Native, Flutter |
| 服务端 | Node.js, Go, Python, Rust, Java |
| 全栈 | Next.js, Nuxt, Remix, SvelteKit |

---

### Q: 如何检查安装是否成功？

**A**:
```bash
# 验证清单
ls openspec/config.yaml       # 存在
ls openspec/schemas/           # 存在
ls AGENTS.md                   # 存在
ls .opencode/commands/*.md | wc -l  # 6 个文件
ls -d .opencode/skills/*/ | wc -l  # 6 个目录

# 验证 CLI
openspec --version

# 验证配置
cat openspec/config.yaml | grep -E '\{\{'  # 应无输出
```

---

### Q: 遇到文档没有覆盖的错误怎么办？

**A**:
1. 检查 [error-recovery.md](./error-recovery.md) 获取通用恢复步骤
2. 查看 OpenSpec CLI 日志（如存在）
3. 在 GitHub Issues 提交问题报告
4. 提供错误信息、操作系统、Node.js 版本等

---

## 📝 错误报告模板

提交问题时请包含：

```
**错误描述**：
[描述遇到的问题]

**环境信息**：
- 操作系统：[macOS/Windows/Linux]
- Node.js 版本：[node -v]
- OpenSpec CLI 版本：[openspec --version]
- 项目类型：[Web 前端/服务端/...]

**复现步骤**：
1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

**错误日志**：
[粘贴错误信息]

**期望行为**：
[描述期望的结果]
```

---

## 参考文档

- [错误恢复指南](./error-recovery.md) - 详细恢复步骤
- [检查清单](./checklist.md) - 停止点确认
- [技术栈检测](./tech-detection.md) - 检测逻辑参考