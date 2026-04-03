# 01 概览

## OpenSpec Harness 是什么

OpenSpec Harness 是一套面向个人开发者的 AI 协作开发环境，核心是把“想法、规格、测试、实现、归档”串成稳定流程。

它强调两件事：

- SDD：先写清楚要做什么
- TDD：先定义如何验证它是对的

## 系统组成

1. `AGENTS.md`
   AI 协作规则、角色和行为边界。
2. `openspec/config.yaml`
   项目元数据、技术栈、常用命令。
3. `openspec/schemas/`
   不同工作流的阶段、产物和检查点。
4. AI 工具目录下的 commands / skills
   把工作流暴露成可执行命令。

## 适合什么场景

- 单人项目
- 小团队中的个人工作流
- 需要和 AI 长期协作的仓库
- 希望把“设计 -> 实现 -> 验证”固定成套路的项目

## 不解决什么

- 不替代项目管理工具
- 不强制统一业务架构
- 不保证 AI 自动做出正确技术决策

## 推荐继续阅读

- [02-config-system.md](/Users/lihaizhong/Documents/Project/communism/openspec-opc/guide/02-config-system.md)
- [03-workflows.md](/Users/lihaizhong/Documents/Project/communism/openspec-opc/guide/03-workflows.md)
