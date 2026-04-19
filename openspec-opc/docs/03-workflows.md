# 03 工作流

## 三类核心工作流

### `spec-driven`

适合新功能、较大变更、需要先设计的任务。

典型产物：

- `proposal.md`
- `design.md`
- `test-contract.md`
- `specs/`
- `tasks.md`

推荐顺序：

1. `proposal.md`
2. `specs/`
3. `test-contract.md`
4. `design.md`
5. `tasks.md`

分工是这样的：

- `proposal.md` 说明为什么做、做什么
- `specs/` 说明行为本身
- `test-contract.md` 说明必须测什么、边界在哪、不要扩什么
- `design.md` 说明怎么落地，前提是先看过 spec 和 test-contract
- `tasks.md` 说明怎么实施，红绿验证都从前面三者派生

一个直观的流转可以理解成：

```text
proposal -> specs -> test-contract -> design -> tasks -> apply
```

### `bugfix`

适合缺陷修复、回归问题和线上问题定位。

典型产物：

- bug 描述
- 复现步骤
- 根因分析
- 修复与回归验证记录

### `spike`

适合技术调研、方案比较、做出阶段性结论。

典型产物：

- 调研问题
- 约束条件
- 方案对比
- 结论与建议

## 什么时候用 Explore

`Explore` 更像自由讨论入口，适合：

- 需求还没成形
- 不确定是否值得做
- 想先和 AI 把问题聊透

## Spike vs Explore

- 用 `spike`：你需要结论、记录和可追溯产物
- 用 `explore`：你需要先发散、澄清、判断方向

简单判断：

- “我要选一个方案” -> `spike`
- “我还没想清楚” -> `explore`

## 选择建议

1. 新功能默认先走 `spec-driven`
2. 已知缺陷默认走 `bugfix`
3. 技术选型默认走 `spike`
4. 只是讨论和澄清问题时再用 `explore`
