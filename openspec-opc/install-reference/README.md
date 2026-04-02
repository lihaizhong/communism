# 安装参考文档

> 本目录包含 `install.md` 的详细参考文档，供 AI 执行安装时查阅。

## 文档列表

| 文档 | 说明 | 使用时机 |
|------|------|----------|
| [install-flow.yaml](./install-flow.yaml) | 机器可读流程定义（YAML） | AI 程序化解析流程 |
| [variables.md](./variables.md) | 所有需要填充的变量及其数据来源 | 阶段 5.3 变量替换时 |
| [tech-detection.md](./tech-detection.md) | 各语言/框架的技术栈检测逻辑 | 阶段 3 技术栈检测 |
| [ci-templates.md](./ci-templates.md) | CI/CD 配置模板（GitHub Actions、GitLab CI等） | 阶段 5.6 CI/CD 配置 |
| [checklist.md](./checklist.md) | 强制停止点检查清单 | 每个停止点确认 |
| [error-recovery.md](./error-recovery.md) | 错误恢复和回退指南 | 安装失败时 |
| [troubleshooting.md](./troubleshooting.md) | 故障排查 FAQ | 遇到问题时 |

## AI 阅读提示

1. 主文档 `install.md` 包含完整的执行流程
2. `install-flow.yaml` 提供机器可读的流程定义，便于程序化解析
3. 在需要详细参考时，AI 应主动查阅本文档目录中的相关文件
4. 所有参考文档与主文档保持同步更新

## 版本兼容性

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| OpenSpec CLI | 0.1.0 | latest |
| Node.js | 18.0.0 | 22.x LTS |
| Git | 2.0.0 | latest |