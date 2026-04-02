# gstack 使用手册

gstack 是一套完整的开发、部署和运维工具集，帮助你从构思到上线的全流程自动化。

---

## 目录

- [快速开始](#快速开始)
- [功能分类](#功能分类)
- [完整命令参考](#完整命令参考)
- [常用工作流](#常用工作流)
- [安装与升级](#安装与升级)

---

## 快速开始

### 基本使用方式

所有 gstack 命令都以 `/` 开头：

```bash
/skill-name    # 例如: /ship, /qa, /browse
```

### 获取帮助

每个技能都支持 `--help` 参数：

```bash
/ship --help
/qa --help
```

---

## 功能分类

### 🚀 部署流程

| 命令 | 用途 | 场景 |
|------|------|------|
| `/ship` | 创建 PR、更新版本、推送代码 | 代码准备好后提交 |
| `/land-and-deploy` | 合并 PR 并部署到生产环境 | PR 通过后的部署 |
| `/setup-deploy` | 配置部署平台 | 首次配置部署 |
| `/canary` | 部署后监控 | 上线后观察稳定性 |

### 🧪 测试与 QA

| 命令 | 用途 | 场景 |
|------|------|------|
| `/qa` | 全面测试并自动修复 bug | 功能开发完成后 |
| `/qa-only` | 仅生成测试报告 | 快速检查问题 |
| `/browse` | 打开 headless 浏览器 | 手动测试页面 |
| `/connect-chrome` | 连接真实 Chrome | 可视化调试 |
| `/setup-browser-cookies` | 导入登录态 | 测试需要登录的功能 |
| `/benchmark` | 性能基准测试 | 检查加载速度 |

### 🎨 设计与开发

| 命令 | 用途 | 场景 |
|------|------|------|
| `/design-consultation` | 创建完整设计系统 | 新项目启动 |
| `/design-shotgun` | 生成多个设计对比 | 探索视觉方案 |
| `/design-html` | 将设计转为 HTML/CSS | 设计确定后开发 |
| `/design-review` | 视觉审计和修复 | 页面完成后检查 |
| `/office-hours` | 产品想法头脑风暴 | 有新产品想法时 |

### 📋 计划与审查

| 命令 | 用途 | 场景 |
|------|------|------|
| `/plan-ceo-review` | 战略层面审查计划 | 确定产品方向 |
| `/plan-eng-review` | 技术架构审查 | 确定技术方案 |
| `/plan-design-review` | 设计计划审查 | 确定设计方案 |
| `/autoplan` | 自动运行全部审查 | 快速过审 |
| `/review` | 代码审查 | PR 提交前 |

### 🔧 开发与调试

| 命令 | 用途 | 场景 |
|------|------|------|
| `/investigate` | 系统性调试 | 遇到 bug 时 |
| `/codex` | OpenAI Codex 代码审查 | 需要第二意见 |
| `/document-release` | 发布后同步文档 | PR 合并后 |
| `/retro` | 周回顾 | 周末总结 |
| `/cso` | 安全审计 | 安全检查 |

### 🛡️ 安全模式

| 命令 | 用途 | 场景 |
|------|------|------|
| `/careful` | 危险操作警告 | 生产环境操作 |
| `/freeze` | 限制编辑目录 | 防止误改 |
| `/guard` | 完整安全模式 | 高危操作 |
| `/unfreeze` | 解除目录限制 | 扩展工作范围 |

### 💾 其他工具

| 命令 | 用途 | 场景 |
|------|------|------|
| `/checkpoint` | 保存/恢复工作进度 | 切换上下文前 |
| `/learn` | 查看历史学习记录 | 回顾项目经验 |
| `/gstack-upgrade` | 升级 gstack | 获取最新功能 |

---

## 完整命令参考

### /ship - 代码提交

**功能**: 自动化的代码提交工作流

**执行步骤**:
1. 检测并合并基础分支
2. 运行测试
3. 审查代码 diff
4. 更新 VERSION 文件
5. 更新 CHANGELOG
6. 提交并推送
7. 创建 PR

**用法**:
```bash
/ship
/ship --no-pr        # 不创建 PR，直接推送
/ship --skip-tests   # 跳过测试（不推荐）
```

---

### /qa - 全面测试

**功能**: 系统化测试网站并自动修复问题

**测试层级**:
- **Quick**: 仅检查严重/高优先级问题
- **Standard**: 增加中等优先级问题
- **Exhaustive**: 包含所有问题（包括外观）

**用法**:
```bash
/qa                  # 使用默认设置
/qa --tier quick     # 快速检查
/qa --tier exhaustive # 全面检查
```

**输出**:
- 健康评分
- 前后对比截图
- 修复证据
- 发布就绪总结

---

### /browse - 浏览器测试

**功能**: 快速 headless 浏览器测试

**特性**:
- ~100ms 每命令
- 导航任意 URL
- 与元素交互
- 验证页面状态
- 截图对比
- 响应式布局检查
- 表单和上传测试

**用法**:
```bash
/browse https://example.com
```

---

### /investigate - 调试调查

**功能**: 系统性调试与根因分析

**四阶段流程**:
1. **Investigate**: 收集证据
2. **Analyze**: 分析问题
3. **Hypothesize**: 提出假设
4. **Implement**: 实施修复

**核心原则**: 无根因，不修复

**用法**:
```bash
/investigate "页面加载缓慢"
/investigate "登录功能失效"
```

---

### /design-consultation - 设计咨询

**功能**: 从零创建设计系统

**输出**:
- 美学风格定义
- 字体系统
- 配色方案
- 布局规范
- 间距系统
- 动效指南
- 字体+配色预览页面
- DESIGN.md 文件

**用法**:
```bash
/design-consultation "创建一个现代 SaaS 产品的设计系统"
```

---

### /design-shotgun - 设计探索

**功能**: 生成多个 AI 设计方案并对比

**流程**:
1. 生成多个设计变体
2. 打开对比面板
3. 收集结构化反馈
4. 迭代优化

**用法**:
```bash
/design-shotgun "设计一个博客首页"
```

---

### /design-html - 设计实现

**功能**: 生成生产级 HTML/CSS

**特性**:
- Pretext-native 代码
- 实际文本重排
- 动态高度计算
- 30KB 开销，零依赖
- 智能 API 路由

**用法**:
```bash
/design-html "实现博客首页设计"
```

---

### /plan-ceo-review - CEO 视角审查

**功能**: 战略层面规划审查

**四种模式**:
- **SCOPE EXPANSION**: 大胆设想
- **SELECTIVE EXPANSION**: 保持范围 + 精选扩展
- **HOLD SCOPE**: 最大严格度
- **SCOPE REDUCTION**: 精简到核心

**审查维度**:
- 问题重新定义
- 10 星产品寻找
- 前提挑战
- 范围扩展机会

**用法**:
```bash
/plan-ceo-review plan.md
```

---

### /plan-eng-review - 工程审查

**功能**: 锁定执行计划

**审查内容**:
- 架构设计
- 数据流
- 图表
- 边界情况
- 测试覆盖
- 性能考虑

**用法**:
```bash
/plan-eng-review plan.md
```

---

### /review - 代码审查

**功能**: PR 提交前审查

**检查项**:
- SQL 安全性
- LLM 信任边界
- 条件副作用
- 结构问题

**用法**:
```bash
/review
/review --diff main...feature-branch
```

---

### /land-and-deploy - 部署

**功能**: 合并 PR 并部署

**流程**:
1. 合并 PR
2. 等待 CI
3. 等待部署
4. 验证生产环境健康

**用法**:
```bash
/land-and-deploy
/land-and-deploy --pr 123
```

---

### /canary - 金丝雀监控

**功能**: 部署后监控

**监控项**:
- 控制台错误
- 性能回归
- 页面故障
- 定期截图
- 基线对比

**用法**:
```bash
/canary
/canary --duration 30m
```

---

### /checkpoint - 工作检查点

**功能**: 保存和恢复工作状态

**保存内容**:
- Git 状态
- 已做决策
- 剩余工作

**用法**:
```bash
/checkpoint save "完成用户认证模块"
/checkpoint list
/checkpoint resume checkpoint-123
```

---

### /cso - 安全审计

**功能**: 首席安全官模式审计

**两种模式**:
- **Daily**: 零噪音，8/10 置信度门槛
- **Comprehensive**: 月度深度扫描，2/10 门槛

**审计范围**:
- 密钥考古
- 依赖供应链
- CI/CD 安全
- LLM/AI 安全
- OWASP Top 10
- STRIDE 威胁建模

**用法**:
```bash
/cso --mode daily
/cso --mode comprehensive
```

---

## 常用工作流

### 🆕 新项目启动

```
/office-hours          # 头脑风暴产品想法
  ↓
/plan-ceo-review       # 战略审查
  ↓
/plan-eng-review       # 技术规划
  ↓
/design-consultation   # 创建设计系统
  ↓
/design-shotgun        # 探索设计选项
  ↓
/design-html           # 实现设计
  ↓
/qa                    # 测试并修复
  ↓
/ship                  # 提交代码
  ↓
/land-and-deploy       # 部署上线
  ↓
/canary                # 监控稳定性
```

### 🐛 Bug 修复

```
/investigate           # 根因分析
  ↓
/careful               # 开启安全模式
  ↓
# 实施修复
  ↓
/qa                    # 验证修复
  ↓
/ship                  # 提交修复
  ↓
/land-and-deploy       # 部署
  ↓
/canary                # 监控
```

### ✨ 新功能开发

```
/office-hours          # 产品构思（可选）
  ↓
/plan-eng-review       # 技术方案
  ↓
/design-html           # 实现设计（如有 UI）
  ↓
/qa                    # 测试
  ↓
/ship                  # 提交
  ↓
/land-and-deploy       # 部署
```

### 🔍 代码审查流程

```
# 开发完成
  ↓
/review                # 自我审查
  ↓
/codex                 # AI 代码审查（可选）
  ↓
/ship                  # 创建 PR
  ↓
# 人工审查（如有团队）
  ↓
/land-and-deploy       # 合并部署
```

---

## 安装与升级

### 安装 gstack

```bash
cd .opencode/skills/gstack
./setup
```

### 升级 gstack

```bash
/gstack-upgrade
```

### 检查版本

```bash
gstack --version
```

---

## 配置

### 部署配置

首次使用 `/land-and-deploy` 前，需要配置部署平台：

```bash
/setup-deploy
```

支持的平台：
- Fly.io
- Render
- Vercel
- Netlify
- Heroku
- GitHub Actions
- 自定义

### 浏览器配置

测试需要登录的页面时：

```bash
/setup-browser-cookies
```

---

## 最佳实践

### 1. 总是从计划开始

复杂功能先运行规划审查：
```bash
/plan-ceo-review
/plan-eng-review
```

### 2. 频繁使用 QA

不要等到最后才测试：
```bash
# 开发过程中
/qa --tier quick

# 功能完成后
/qa --tier exhaustive
```

### 3. 安全操作

生产环境务必小心：
```bash
/careful    # 或 /guard 获取最大保护
```

### 4. 保存进度

长时间工作前保存检查点：
```bash
/checkpoint save "当前进度描述"
```

### 5. 文档同步

代码变更后同步文档：
```bash
/document-release
```

---

## 故障排除

### gstack 命令不可用

```bash
cd .opencode/skills/gstack
./setup
```

### 浏览器连接失败

```bash
# 检查 browse 服务
/browse --health

# 重新连接 Chrome
/connect-chrome
```

### 部署失败

```bash
# 检查配置
/setup-deploy

# 查看详细日志
/land-and-deploy --verbose
```

---

## 了解更多

- 项目源码: `.opencode/skills/gstack/`
- 技能文档: `.opencode/skills/gstack/SKILL.md`
- 更新日志: `.opencode/skills/gstack/CHANGELOG.md`

---

*本文档由 gstack 自动生成*
*版本: 1.0.0*
*更新日期: 2025-01-02*
