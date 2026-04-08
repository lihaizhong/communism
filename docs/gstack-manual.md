# gstack 使用手册

gstack 是一套完整的 AI 开发工作流工具集，将 Claude Code 转变为虚拟工程团队——CEO、工程师、设计师、QA、安全官，一套完整的专家角色体系，全部通过斜杠命令调用。

---

## 目录

- [快速开始](#快速开始)
- [功能分类](#功能分类)
- [完整命令参考](#完整命令参考)
- [常用工作流](#常用工作流)
- [团队协作](#团队协作)
- [多 AI 平台支持](#多-ai-平台支持)
- [安装与升级](#安装与升级)

---

## 快速开始

### 基本使用方式

所有 gstack 命令都以 `/` 开头：

```bash
/skill-name    # 例如: /ship, /qa, /browse
```

### 首次使用（30 秒安装）

在 Claude Code 中粘贴以下命令：

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

然后将以下内容添加到项目 `AGENTS.md` 中：

```markdown
## gstack
使用 /browse 进行所有网页浏览。不要使用 mcp__claude-in-chrome__* 工具。
可用技能: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy,
/canary, /benchmark, /browse, /open-gstack-browser, /qa, /qa-only, /design-review,
/setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex,
/cso, /autoplan, /pair-agent, /devex-review, /plan-devex-review, /careful, /freeze,
/guard, /unfreeze, /gstack-upgrade, /learn.
```

### 语音友好触发

不用记住命令名称，直接说你要做什么：

- "运行安全检查" → `/cso`
- "测试网站" → `/qa`
- "做工程审查" → `/plan-eng-review`
- "代码审查" → `/review`

---

## 功能分类

### 产品与规划

| 命令 | 用途 | 场景 |
|------|------|------|
| `/office-hours` | YC 风格头脑风暴 | 新产品想法时 |
| `/plan-ceo-review` | 战略层面审查 | 确定产品方向 |
| `/plan-eng-review` | 技术架构审查 | 确定技术方案 |
| `/plan-design-review` | 设计计划审查 | 确定设计方案 |
| `/plan-devex-review` | 开发者体验审查 | 优化开发者体验 |

### 🚀 部署流程

| 命令 | 用途 | 场景 |
|------|------|------|
| `/ship` | 创建 PR、更新版本、推送代码 | 代码准备好后提交 |
| `/land-and-deploy` | 合并 PR 并部署到生产环境 | PR 通过后的部署 |
| `/setup-deploy` | 配置部署平台 | 首次配置部署 |
| `/canary` | 部署后监控 | 上线后观察稳定性 |
| `/benchmark` | 性能基准测试 | 检查加载速度 |

### 🧪 测试与 QA

| 命令 | 用途 | 场景 |
|------|------|------|
| `/qa` | 全面测试并自动修复 bug | 功能开发完成后 |
| `/qa-only` | 仅生成测试报告 | 快速检查问题 |
| `/browse` | headless 浏览器 | 手动测试页面 |
| `/open-gstack-browser` | GStack 浏览器 | 带侧边栏的可视化调试 |
| `/connect-chrome` | 连接真实 Chrome | 真实浏览器协作 |
| `/setup-browser-cookies` | 导入登录态 | 测试需要登录的功能 |

### 🎨 设计与开发

| 命令 | 用途 | 场景 |
|------|------|------|
| `/design-consultation` | 创建完整设计系统 | 新项目启动 |
| `/design-shotgun` | 生成多个设计对比 | 探索视觉方案 |
| `/design-html` | 将设计转为 HTML/CSS | 设计确定后开发 |
| `/design-review` | 视觉审计和修复 | 页面完成后检查 |

### 📋 审查与复盘

| 命令 | 用途 | 场景 |
|------|------|------|
| `/review` | 并行专家代码审查 | PR 提交前 |
| `/devex-review` | 开发者体验实地审计 | 上线后体验测试 |
| `/codex` | OpenAI Codex 第二意见 | 需要独立 AI 审查 |
| `/investigate` | 系统性调试 | 遇到 bug 时 |
| `/cso` | 安全审计 | 安全检查 |
| `/retro` | 周回顾 | 周末总结 |
| `/health` | 代码质量评分 | 了解项目健康度 |

### 🔧 团队协作

| 命令 | 用途 | 场景 |
|------|------|------|
| `/autoplan` | 自动运行全部审查 | 快速过审 |
| `/pair-agent` | 多 AI 协调 | 让多个 AI 同时工作 |
| `/document-release` | 发布后同步文档 | PR 合并后 |
| `/learn` | 管理历史学习记录 | 回顾项目经验 |
| `/checkpoint` | 保存/恢复工作进度 | 切换上下文前 |

### 🛡️ 安全模式

| 命令 | 用途 | 场景 |
|------|------|------|
| `/careful` | 危险操作警告 | 生产环境操作 |
| `/freeze` | 限制编辑目录 | 防止误改 |
| `/guard` | 完整安全模式 | 高危操作 |
| `/unfreeze` | 解除目录限制 | 扩展工作范围 |

---

## 完整命令参考

### /office-hours - 产品构思

**功能**: YC Office Hours 风格的六问法，帮你重新审视产品想法。

**六问**:
1. 需求现实性 — 具体例子，不是假设
2. 现状替代 — 不用你的产品怎么解决问题
3. 极度具体 — 描述最窄的切入点
4. 观察验证 — 验证你观察到的痛点
5. 未来适应 — 产品如何演进
6. 10 星产品 — 找到隐藏的 10 星产品

**用法**:
```bash
/office-hours "我想做一个笔记应用"
```

---

### /plan-ceo-review - CEO 视角审查

**功能**: 战略层面规划审查，重新定义问题。

**四种模式**:
- **SCOPE EXPANSION**: 大胆设想，找到 10 星产品
- **SELECTIVE EXPANSION**: 保持范围 + 精选扩展
- **HOLD SCOPE**: 最大严格度
- **SCOPE REDUCTION**: 精简到核心

**用法**:
```bash
/plan-ceo-review plan.md
```

---

### /plan-eng-review - 工程审查

**功能**: 锁定执行计划，架构、数据流、边界情况。

**审查内容**:
- ASCII 架构图和数据流图
- 状态机设计
- 错误处理路径
- 测试矩阵
- 安全考虑
- 性能评估

**用法**:
```bash
/plan-eng-review plan.md
```

---

### /plan-design-review - 设计审查

**功能**: 交互式设计审查，评分每项设计维度。

**审查维度**: 可用性、一致性、视觉层次、响应式、动效、字体、配色等。

**用法**:
```bash
/plan-design-review
```

---

### /plan-devex-review - 开发者体验审查

**功能**: 交互式 DX 审查，优化开发者体验。

**三种模式**:
- **DX EXPANSION**: 探索开发者体验的可能性
- **DX POLISH**: 打磨现有 DX
- **DX TRIAGE**: 快速诊断问题

**用法**:
```bash
/plan-devex-review
```

---

### /design-consultation - 设计咨询

**功能**: 从零创建设计系统。

**输出**:
- 美学风格定义
- 字体系统 + 配色方案
- 布局和间距规范
- 动效指南
- 字体+配色预览页面
- DESIGN.md 设计文档

**用法**:
```bash
/design-consultation "创建一个现代 SaaS 产品的设计系统"
```

---

### /design-shotgun - 设计探索

**功能**: 生成多个 AI 设计方案并对比。

**流程**:
1. 生成 4-6 个设计变体
2. 打开对比面板
3. 收集结构化反馈
4. 迭代优化直到满意

**用法**:
```bash
/design-shotgun "设计一个博客首页"
```

---

### /design-html - 设计实现

**功能**: 生成生产级 HTML/CSS。

**特性**:
- Pretext-native 代码，文本实际重排
- 动态高度计算
- 30KB 开销，零依赖
- 自动检测 React/Svelte/Vue
- 智能 API 路由（落地页/仪表盘/表单）

**用法**:
```bash
/design-html "实现博客首页设计"
```

---

### /review - 并行专家代码审查

**功能**: 7 个专家并行审查你的代码 diff。

**专家类型**:
- **Testing** (始终): 测试覆盖率分析
- **Maintainability** (始终): 可维护性检查
- **Security** (有 auth 改动): 安全审计
- **Performance** (后端/前端): 性能分析
- **Data Migration** (有 migration 文件): 数据迁移安全
- **API Contract** (有 controller/route): API 契约检查
- **Red Team** (200+ 行 diff): 对抗性分析

**特性**:
- 跨专家去重（多专家确认的发现标记为高置信度）
- PR 质量评分 0-10
- 自动修复明显问题

**用法**:
```bash
/review
/review --diff main...feature-branch
```

---

### /devex-review - 开发者体验实地审计

**功能**: 真实测试你的开发流程。

**审计内容**:
- 文档导航测试
- 入门流程测试
- 首次访问时间（TTHW）计时
- 错误截图
- 与 `/plan-devex-review` 分数对比

**用法**:
```bash
/devex-review
```

---

### /investigate - 调试调查

**功能**: 系统性调试与根因分析。

**四阶段流程**:
1. **Investigate**: 收集证据
2. **Analyze**: 分析问题
3. **Hypothesize**: 提出假设
4. **Implement**: 实施修复

**核心原则**: 无根因，不修复。3 次修复失败后停止。

**用法**:
```bash
/investigate "页面加载缓慢"
```

---

### /qa - 全面测试

**功能**: 系统化测试网站并自动修复问题。

**测试层级**:
- **Quick**: 仅检查严重/高优先级问题
- **Standard**: 增加中等优先级问题
- **Exhaustive**: 包含所有问题（包括外观）

**输出**:
- 健康评分（前/后对比）
- 截图对比
- 修复证据
- 发布就绪总结

**用法**:
```bash
/qa                  # 使用默认设置
/qa --tier quick    # 快速检查
/qa https://staging.example.com  # 测试指定 URL
```

---

### /browse - 浏览器测试

**功能**: 快速 headless 浏览器测试。

**特性**:
- ~100ms 每命令
- 导航任意 URL，与元素交互
- 验证页面状态，截图对比
- 响应式布局检查
- 表单和上传测试

**用法**:
```bash
/browse https://example.com
```

---

### /open-gstack-browser - GStack 浏览器

**功能**: 带侧边栏的 AI 浏览器协作工具。

**特性**:
- 侧边栏 AI 助手（Claude 实例在 Chrome 侧边栏运行）
- CSS 检查器（选择元素查看完整样式级联）
- 实时样式编辑（修改 CSS 立即生效）
- 页面清理（AI 驱动的垃圾元素移除）
- 多标签页隔离（每个标签独立 agent）
- 智能模型路由（Sonnet 快速操作，Opus 阅读分析）
- 反爬虫伪装（Google、NYTimes 等网站可正常访问）

**用法**:
```bash
/open-gstack-browser
```

---

### /ship - 代码提交

**功能**: 自动化的代码提交工作流。

**执行步骤**:
1. 检测并合并基础分支
2. 运行测试
3. 审查代码 diff
4. 更新 VERSION 文件
5. 更新 CHANGELOG
6. 提交并推送
7. 创建 PR

**特性**:
- 幂等操作（重新运行不会重复更新）
- 范围漂移检测（检测"顺手改了但不该改的"代码）
- 自动引导测试框架

**用法**:
```bash
/ship
/ship --no-pr        # 不创建 PR，直接推送
/ship --skip-tests   # 跳过测试（不推荐）
```

---

### /land-and-deploy - 部署

**功能**: 合并 PR 并部署。

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

**功能**: 部署后监控。

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

### /autoplan - 自动审查流水线

**功能**: 一个命令，运行完整审查流程。

**自动执行**: `/plan-ceo-review` → `/plan-design-review` → `/plan-eng-review`

**特性**:
- 自动决策编码到流水线中
- 只在涉及品味决策时暂停请求批准
- 快速得到完整审查结论

**用法**:
```bash
/autoplan
```

---

### /pair-agent - 多 AI 协调

**功能**: 与其他 AI agent 共享浏览器协作。

**支持平台**: OpenClaw, Hermes, Codex, Cursor 等

**特性**:
- 每个 agent 独立标签页
- 自动启动 ngrok 隧道（支持远程 agent）
- 令牌作用域、速率限制、域名限制
- 活动归属追踪

**用法**:
```bash
/pair-agent
```

---

### /cso - 安全审计

**功能**: 首席安全官模式审计。

**两种模式**:
- **Daily**: 零噪音，8/10 置信度门槛
- **Comprehensive**: 月度深度扫描，2/10 门槛

**审计范围**:
- 密钥考古 + 依赖供应链
- CI/CD 安全 + LLM/AI 安全
- OWASP Top 10 + STRIDE 威胁建模
- 4 层提示词注入防御

**用法**:
```bash
/cso --mode daily
/cso --mode comprehensive
```

---

### /retro - 周回顾

**功能**: 团队感知周回顾。

**输出**:
- 人员维度分解
- 提交和 PR 统计
- 测试健康趋势
- 增长机会分析
- `/retro global` 跨所有项目和 AI 工具汇总

**用法**:
```bash
/retro
/retro global
```

---

### /health - 代码质量评分

**功能**: 代码健康度仪表盘。

**覆盖工具**: TypeScript 编译、ESLint/biome、Dead code 检测、Shell 检查、测试。

**输出**:
- 0-10 综合评分
- 趋势追踪
- 问题定位和修复建议

**用法**:
```bash
/health
```

---

### /checkpoint - 工作检查点

**功能**: 保存和恢复工作状态。

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
/autoplan              # CEO → 设计 → 工程审查
  ↓
/design-html           # 实现设计（如有 UI）
  ↓
/review                # 代码审查
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
/review                # 并行专家审查
  ↓
/codex                 # AI 代码审查（可选）
  ↓
/ship                  # 创建 PR
  ↓
/land-and-deploy       # 合并部署
```

---

## 团队协作

### 团队模式（推荐）

每个开发者全局安装，版本自动同步：

```bash
cd ~/.claude/skills/gstack && ./setup --team
```

引导仓库让团队成员自动获取：

```bash
cd <your-repo>
~/.claude/skills/gstack/bin/gstack-team-init required
git add .claude/ CLAUDE.md && git commit -m "require gstack"
```

**特点**:
- 无需在仓库中提交大量 gstack 文件
- 版本自动同步（每小时检查更新，静默无网络失败）
- 团队成员开箱即用

### 多 AI Agent 协作

```
你 (Claude Code)              另一个 AI Agent
      |                              |
      |------- /pair-agent -------->|
      |        共享浏览器            |
      |<------ 各自独立标签页 ------|
      |                              |
      |    协作浏览同一网站         |
```

---

## 多 AI 平台支持

gstack 支持 8 个 AI 编程 Agent：

| Agent | 安装命令 | 技能目录 |
|-------|---------|---------|
| Claude Code | `./setup` | `~/.claude/skills/gstack-*/` |
| OpenAI Codex CLI | `./setup --host codex` | `~/.codex/skills/gstack-*/` |
| OpenCode | `./setup --host opencode` | `~/.config/opencode/skills/gstack-*/` |
| Cursor | `./setup --host cursor` | `~/.cursor/skills/gstack-*/` |
| Factory Droid | `./setup --host factory` | `~/.factory/skills/gstack-*/` |
| Slate | `./setup --host slate` | `~/.slate/skills/gstack-*/` |
| Kiro | `./setup --host kiro` | `~/.kiro/skills/gstack-*/` |

### OpenClaw 集成

OpenClaw 通过 ACP 启动 Claude Code 会话，gstack 技能开箱即用：

```
你: "帮我做安全审计"
     ↓
OpenClaw: 启动 Claude Code，运行 /cso
     ↓
你: "帮我构建通知功能"
     ↓
OpenClaw: 启动 Claude Code，运行 /autoplan → 实现 → /ship
```

### ClawHub 原生技能

从 ClawHub 安装可直接在 OpenClaw 中运行的技能（无需启动 Claude Code 会话）：

```bash
clawhub install gstack-openclaw-office-hours gstack-openclaw-ceo-review gstack-openclaw-investigate gstack-openclaw-retro
```

---

## 安装与升级

### 安装 gstack

```bash
# 全局安装
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup

# 团队协作模式
cd ~/.claude/skills/gstack && ./setup --team
```

### 升级 gstack

```bash
/gstack-upgrade
```

或设置自动升级（推荐）：

```yaml
# ~/.gstack/config.yaml
auto_upgrade: true
```

### 检查版本

```bash
# 本地版本
cat .opencode/skills/gstack/VERSION

# 全局版本
cat ~/.claude/skills/gstack/VERSION
```

---

## 配置

### 部署配置

首次使用 `/land-and-deploy` 前，需要配置部署平台：

```bash
/setup-deploy
```

支持的平台：Fly.io、Render、Vercel、Netlify、Heroku、GitHub Actions、自定义。

### 浏览器配置

测试需要登录的页面时：

```bash
/setup-browser-cookies
```

### 语音输入

gstack 技能支持语音触发。Say "run a security check" 而不是记住 `/cso`。支持 AquaVoice、Whisper 等语音转文字工具。

---

## 最佳实践

### 1. 从规划开始

复杂功能先运行规划审查：
```bash
/autoplan              # 一个命令完整审查
# 或分步进行
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

### 3. 善用并行专家审查

大改动用 `/review`，它会自动激活 Red Team 和所有相关专家。

### 4. 生产环境安全操作

```bash
/guard    # 获取最大保护
```

### 5. 保存进度和记录

```bash
/checkpoint save "当前进度描述"
/learn              # 查看项目历史经验
```

### 6. 文档同步

代码变更后同步文档：
```bash
/document-release
```

---

## 故障排除

### gstack 命令不可用

```bash
cd ~/.claude/skills/gstack && ./setup
```

### 浏览器连接失败

```bash
# 检查 browse 服务
cd ~/.claude/skills/gstack && bun install && bun run build

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

### 技能未显示

确保项目 `AGENTS.md` 包含 gstack 配置段，参考[快速开始](#快速开始)中的配置。

---

## 了解更多

- 项目源码: `.opencode/skills/gstack/`
- 技能深度文档: `.opencode/skills/gstack/docs/skills.md`
- 更新日志: `.opencode/skills/gstack/CHANGELOG.md`
- 架构设计: `.opencode/skills/gstack/ARCHITECTURE.md`

---

*本文档基于 gstack v0.15.16.0*
*版本: 1.1.0*
*更新日期: 2026-04-08*
