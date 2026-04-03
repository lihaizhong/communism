# CI/CD 配置模板

本目录包含可选的 CI/CD 配置模板，用于自动化 OpenSpec Harness 工作流。

## 使用方式

这些模板在安装阶段 5.6 由用户选择是否生成到项目中。

支持的平台：
- **GitHub Actions** (github-workflows/)
- **GitLab CI** (gitlab-ci/)

## 模板说明

### GitHub Actions

**github-workflows/openspec-archive.yml**
- **触发时机**: Release 发布时 或 手动触发
- **功能**: 自动归档已完成的变更到 `openspec/archive/`
- **前置条件**: 验证测试通过
- **输出位置**: `.github/workflows/openspec-archive.yml`

### GitLab CI

**gitlab-ci/gitlab-ci.yml**
- **触发时机**: Tag 发布时、定时任务或手动触发
- **功能**: 完整的验证 + 归档 pipeline
- **输出位置**: `.gitlab-ci.yml`

**gitlab-ci/openspec.yml**
- **使用场景**: 项目已有 `.gitlab-ci.yml`，需要 include 方式集成
- **输出位置**: `.gitlab/ci/openspec.yml`
- **配置方法**: 在主文件中添加 `include: - local: '.gitlab/ci/openspec.yml'`

### Git Hooks

**hooks/pre-commit**
- **触发时机**: 每次 `git commit` 前
- **功能**: 运行 lint 和测试，确保代码质量
- **失败处理**: 验证失败时阻止提交
- **安装位置**: `.husky/pre-commit` (使用 husky) 或 `.git/hooks/pre-commit`

## 自定义说明

生成到项目后，可根据实际需求修改：
1. 调整运行时版本、构建镜像或执行环境以匹配项目要求
2. 添加额外的验证步骤
3. 修改触发条件（如添加分支触发）
4. 配置通知（Slack / 邮件等）
5. 添加部署步骤（在归档后）
