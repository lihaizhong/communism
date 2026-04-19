# 07 示例演示

## 示例 0：AI 驱动安装

如果你想先验证安装器本身，而不是直接在真实项目里试，先看：

- `install-manual/fixtures/node-ts-minimal/README.md`

这个样例展示的是最小 Node/TS library 项目如何通过文档驱动安装流产出：

- `openspec/install-result.txt`
- `openspec/install-report.md`
- `openspec/install-report.json`

## 示例 1：新增功能

```text
/opsx-propose add-dark-mode
```

预期结果：

- 创建 proposal
- 补充 design
- 生成 specs
- 形成 tasks 清单

随后进入：

```text
/opsx-apply
```

## 示例 2：修复 Bug

```text
/opsx-bugfix button-not-working
```

预期结果：

- 记录 bug 现象
- 建立复现路径
- 定位根因
- 完成修复和回归验证

## 示例 3：技术调研

```text
/opsx-spike evaluate-state-management
```

预期结果：

- 明确问题和约束
- 比较备选方案
- 记录取舍依据
- 给出结论和建议

## 示例 4：先聊再定

```text
/opsx-explore
```

适合：

- 需求模糊
- 方向未定
- 想先和 AI 讨论风险与机会
