# CI/CD 配置模板

> 本文档提供各平台的 CI/CD 配置模板，供阶段 5.6 使用。

## 快速选择

| 平台 | 推荐场景 | 配置文件 |
|------|----------|----------|
| **GitHub Actions** | GitHub 托管项目 | `.github/workflows/openspec-archive.yml` |
| **GitLab CI** | GitLab 托管项目 | `.gitlab-ci.yml` 或 `.gitlab/ci/openspec.yml` |
| **其他平台** | 自建 CI/CD | 参考通用模板，手动配置 |
| **跳过** | 手动执行 | 不生成配置，阶段 6 改为 Manual |

---

## GitHub Actions

### 完整配置文件

**文件路径**: `.github/workflows/openspec-archive.yml`

```yaml
# OpenSpec Archive Workflow
# 在 release 发布时自动归档已完成的变更

name: OpenSpec Archive

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      change_id:
        description: 'Specific change ID to archive (leave empty to archive all completed)'
        required: false
        type: string

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '{{NODE_VERSION}}'
          cache: '{{PACKAGE_MANAGER}}'

      - name: Install dependencies
        run: {{PACKAGE_MANAGER}} install

      - name: Run validation
        run: |
          {{PACKAGE_MANAGER}} lint
          {{PACKAGE_MANAGER}} test

      - name: Archive changes
        run: |
          if [ -n "${{ github.event.inputs.change_id }}" ]; then
            openspec archive ${{ github.event.inputs.change_id }}
          else
            openspec archive --all-completed
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Commit archive
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add openspec/archive/
          git diff --staged --quiet || git commit -m "chore: archive completed changes [skip ci]"
          git push
```

### 变量替换说明

| 占位符 | 替换为 | 示例 |
|--------|--------|------|
| `{{NODE_VERSION}}` | Node.js 版本 | `22` |
| `{{PACKAGE_MANAGER}}` | 包管理器 | `pnpm` |

### Go 项目变体

```yaml
      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '{{GO_VERSION}}'

      - name: Install dependencies
        run: go mod download

      - name: Run validation
        run: |
          go test ./...
          go vet ./...
```

### Python 项目变体

```yaml
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '{{PYTHON_VERSION}}'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          # 或 poetry install

      - name: Run validation
        run: |
          pip install ruff pytest
          ruff check .
          pytest
```

### Rust 项目变体

```yaml
      - name: Setup Rust
        uses: actions-rust-lang/setup-rust-toolchain@v1
        with:
          toolchain: '{{RUST_VERSION}}'

      - name: Run validation
        run: |
          cargo test
          cargo clippy -- -D warnings
```

---

## GitLab CI

### 完整配置文件

**文件路径**: `.gitlab-ci.yml` (或追加到现有配置)

```yaml
# OpenSpec Archive Pipeline for GitLab
# 在 tag 发布时自动归档已完成的变更

stages:
  - validate
  - archive

variables:
  GIT_DEPTH: 10

# 验证阶段
openspec:validate:
  stage: validate
  script:
    - {{PACKAGE_MANAGER}} install
    - {{PACKAGE_MANAGER}} lint
    - {{PACKAGE_MANAGER}} test
  rules:
    - if: $CI_COMMIT_TAG
    - if: $CI_PIPELINE_SOURCE == "schedule"
    - if: $CI_PIPELINE_SOURCE == "web"
  tags:
    - docker

# 归档阶段
openspec:archive:
  stage: archive
  script:
    - {{PACKAGE_MANAGER}} install
    - |
      if [ -n "$OPENSPEC_CHANGE_ID" ]; then
        openspec archive "$OPENSPEC_CHANGE_ID"
      else
        openspec archive --all-completed
      fi
    - git config user.email "gitlab-ci@example.com"
    - git config user.name "GitLab CI"
    - git add openspec/archive/
    - git diff --staged --quiet || git commit -m "chore: archive completed changes [skip ci]"
    - git push https://gitlab-ci-token:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git HEAD:${CI_COMMIT_REF_NAME}
  rules:
    - if: $CI_COMMIT_TAG
    - if: $CI_PIPELINE_SOURCE == "web"
      when: manual
      allow_failure: true
  needs:
    - job: openspec:validate
      optional: false
  tags:
    - docker
```

### 独立配置文件 (推荐)

如果项目已有 `.gitlab-ci.yml`，创建独立文件：

**文件路径**: `.gitlab/ci/openspec.yml`

```yaml
# OpenSpec Archive Job (include this in your main .gitlab-ci.yml)
# 在主文件中使用 include:
#   - local: '.gitlab/ci/openspec.yml'

.openspec:archive:base:
  stage: deploy
  script:
    - openspec archive --all-completed
    - git config user.email "gitlab-ci@example.com"
    - git config user.name "GitLab CI"
    - git add openspec/archive/
    - git diff --staged --quiet || git commit -m "chore: archive completed changes [skip ci]"
    - git push https://gitlab-ci-token:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git HEAD:${CI_COMMIT_REF_NAME}
  rules:
    - if: $CI_COMMIT_TAG
```

### Go 项目变体

```yaml
openspec:validate:
  script:
    - go mod download
    - go test ./...
    - go vet ./...
```

### Python 项目变体

```yaml
openspec:validate:
  script:
    - pip install -r requirements.txt
    - pip install ruff pytest
    - ruff check .
    - pytest
```

---

## Pre-commit Hook

### 使用 Husky (推荐 Node.js 项目)

```bash
# 安装 husky
pnpm add -D husky
npx husky init

# 创建 pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 OpenSpec 验证..."

# 运行测试
{{PACKAGE_MANAGER}} test
if [ $? -ne 0 ]; then
  echo "❌ 测试未通过，提交被拒绝"
  exit 1
fi

# 运行 lint
{{PACKAGE_MANAGER}} lint
if [ $? -ne 0 ]; then
  echo "❌ Lint 检查未通过，提交被拒绝"
  exit 1
fi

echo "✅ 验证通过"
EOF

chmod +x .husky/pre-commit
```

### 原生 Git Hook (所有项目)

```bash
# 创建 pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
# OpenSpec Validate - 提交前验证

echo "🔍 运行 OpenSpec 验证..."

# 运行测试
{{PACKAGE_MANAGER}} test
if [ $? -ne 0 ]; then
  echo "❌ 测试未通过，提交被拒绝"
  exit 1
fi

# 运行 lint
{{PACKAGE_MANAGER}} lint
if [ $? -ne 0 ]; then
  echo "❌ Lint 检查未通过，提交被拒绝"
  exit 1
fi

echo "✅ 验证通过"
EOF

chmod +x .git/hooks/pre-commit
```

### Go 项目变体

```bash
# Go pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
echo "🔍 运行验证..."

go test ./...
if [ $? -ne 0 ]; then
  echo "❌ 测试未通过"
  exit 1
fi

go vet ./...
if [ $? -ne 0 ]; then
  echo "❌ Vet 检查未通过"
  exit 1
fi

echo "✅ 验证通过"
EOF

chmod +x .git/hooks/pre-commit
```

### Python 项目变体

```bash
# Python pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
echo "🔍 运行验证..."

pytest
if [ $? -ne 0 ]; then
  echo "❌ 测试未通过"
  exit 1
fi

ruff check .
if [ $? -ne 0 ]; then
  echo "❌ Ruff 检查未通过"
  exit 1
fi

echo "✅ 验证通过"
EOF

chmod +x .git/hooks/pre-commit
```

---

## 其他 CI/CD 平台

### 通用 Pipeline 结构

```yaml
# 通用 CI/CD 配置模板
# 根据你的平台调整语法

pipeline:
  stages:
    - validate
    - archive

  validate:
    commands:
      - {{PACKAGE_MANAGER}} install
      - {{PACKAGE_MANAGER}} lint
      - {{PACKAGE_MANAGER}} test
    on:
      - tag
      - manual

  archive:
    commands:
      - openspec archive --all-completed
      - git add openspec/archive/
      - git commit -m "chore: archive completed changes"
      - git push
    on:
      - tag
    needs:
      - validate
```

### Jenkins 示例

```groovy
// Jenkinsfile
pipeline {
  agent any
  stages {
    stage('Validate') {
      steps {
        sh '{{PACKAGE_MANAGER}} install'
        sh '{{PACKAGE_MANAGER}} lint'
        sh '{{PACKAGE_MANAGER}} test'
      }
    }
    stage('Archive') {
      when {
        tag 'v*'
      }
      steps {
        sh 'openspec archive --all-completed'
        sh 'git add openspec/archive/'
        sh 'git commit -m "chore: archive completed changes [skip ci]" || true'
        sh 'git push'
      }
    }
  }
}
```

### CircleCI 示例

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  validate:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - run: {{PACKAGE_MANAGER}} install
      - run: {{PACKAGE_MANAGER}} lint
      - run: {{PACKAGE_MANAGER}} test

  archive:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - run: openspec archive --all-completed
      - run: git config user.email "circleci@example.com"
      - run: git config user.name "CircleCI"
      - run: git add openspec/archive/
      - run: git commit -m "chore: archive completed changes [skip ci]" || true
      - run: git push

workflows:
  version: 2
  build-and-archive:
    jobs:
      - validate
      - archive:
          requires:
            - validate
          filters:
            tags:
              only: /.*/
```

---

## 手动执行配置

如果用户选择 **跳过 CI/CD 配置**，AGENTS.md 中的触发方式需要更新：

### 更新前 (Auto)

```markdown
| Validate | `/opsx-validate` | Machine acceptance | Auto (pre-commit) |
| Archive  | `/opsx-archive`   | Archive completed change | Auto (CI/CD) |
```

### 更新后 (Manual)

```markdown
| Validate | `/opsx-validate` | Machine acceptance | Manual |
| Archive  | `/opsx-archive`   | Archive completed change | Manual |
```

**手动执行命令**：

```bash
# 手动验证
/opsx-validate

# 手动归档
/opsx-archive
```

---

## 变量快速参考

| 占位符 | Node.js | Go | Python | Rust |
|--------|---------|-----|--------|------|
| `{{PACKAGE_MANAGER}}` | `pnpm` / `yarn` / `npm` | `go mod` | `poetry` / `pip` | `cargo` |
| `{{NODE_VERSION}}` | `22` | - | - | - |
| `{{GO_VERSION}}` | - | `1.22` | - | - |
| `{{PYTHON_VERSION}}` | - | - | `3.11` | - |
| `{{RUST_VERSION}}` | - | - | - | `1.75` |

---

## 参考文档

- [变量参考表](./variables.md) - 所有需要填充的变量
- [错误恢复指南](./error-recovery.md) - 配置失败时的处理