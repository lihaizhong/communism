# gstack 快速使用指南

这份文档给第一次真正上手 gstack 的人。

如果你不想看完整手册，先看这份。等你开始频繁用到设计、安全、部署、DX 审查时，再去看 [完整使用指南](./gstack-complete-guide.md)。

相关文档：
- [技能速查表](./gstack-skills-cheatsheet.md)
- [完整使用指南](./gstack-complete-guide.md)

## 先理解一件事

gstack 不是“很多命令”，而是一套交付流程：

`想清楚 → 定计划 → 实现 → 审查 → 测试 → 发布 → 复盘`

你不需要记住所有 skill，只需要知道每个阶段该用哪个。

## 新手只用这 7 个就够了

| Skill | 用途 |
| --- | --- |
| `/office-hours` | 把需求和产品方向想清楚 |
| `/autoplan` | 自动把方案过一轮完整 review |
| `/investigate` | 出 bug 时先找根因 |
| `/review` | 写完代码后做代码审查 |
| `/qa` | 到浏览器里真实测试并修 bug |
| `/ship` | 准备提 PR、发布代码 |
| `/canary` | 上线后持续观察 |

## 先从这 3 种场景开始

| 场景 | 先用什么 | 后面怎么走 |
| --- | --- | --- |
| 你要做一个新功能 | `/office-hours` | 需求想清楚后跑 `/autoplan`，实现完成后再走 `/review`、`/qa`、`/ship`。 |
| 你在修一个 bug | `/investigate` | 不要一上来就改代码。先确认根因，再修复，然后补 `/review` 和 `/qa`。 |
| 你只是想测网站 | `/qa`、`/qa-only` 或 `/browse` | 想系统测试并修问题用 `/qa`；只想拿问题列表用 `/qa-only`；只想打开页面、截图、点流程用 `/browse`。 |

## 如何正确描述需求

效果最好的方式不是直接点技能名，而是把你的意图说清楚。

| 更好的说法 | 不好的说法 |
| --- | --- |
| “这个页面老是报 500，帮我查根因” | “随便看看” |
| “我想做一个团队通知中心，先帮我把方案想清楚” | “帮我搞一下” |
| “这个分支准备提 PR，帮我审一下” | “把这个做完” |
| “帮我在浏览器里把这个流程走一遍” | 只丢一个 skill 名，不说目标和场景 |

## 最常用的工作流

| 场景 | 推荐流程 |
| --- | --- |
| 新功能 | `/office-hours` → `/autoplan` → 实现 → `/review` → `/qa` → `/ship` |
| 修 bug | `/investigate` → 修复 → `/review` → `/qa` |
| 上线观察 | `/ship` → `/land-and-deploy` → `/canary` |

## 什么时候需要更高级的 skill

| 你遇到的情况 | 可以加的 skill |
| --- | --- |
| 你在做 UI 方向探索 | `/design-shotgun` |
| 你需要系统设计语言 | `/design-consultation` |
| 你在做 API、SDK、CLI | `/plan-devex-review` |
| 你要安全审计 | `/cso` |
| 你想看项目健康度 | `/health` |
| 你想让另一个模型复核 | `/codex` |

## 三条使用原则

| 原则 | 具体意思 |
| --- | --- |
| 先选阶段，再选 skill | 先问自己：我现在是在想方案、查问题、验收，还是发版？ |
| 不要跳过中间步骤 | `/review` 不能代替 `/qa`，`/qa` 也不能代替 `/ship`。 |
| 把 skill 当成角色，不是命令别名 | 它们不是“更长一点的 prompt”，而是带方法论的角色。 |

## 今天就这样跑一遍

如果你今天就想开始用，找一个小功能，按这个顺序走一次：

1. 跑 `/office-hours`
2. 跑 `/autoplan`
3. 自己或 agent 实现
4. 跑 `/review`
5. 跑 `/qa`
6. 跑 `/ship`

连续做 2 到 3 次，你就基本不会再被 skill 数量吓住。

## 常见疑问

| 问题 | 简短回答 |
| --- | --- |
| 我是不是要把所有 skill 都学会？ | 不用。大多数人高频只会反复用十个以内。 |
| 我是不是每次都必须从 `/office-hours` 开始？ | 不是。只有在需求不清楚、方向不稳时才值得从这里开始。 |
| 我什么时候用 `/autoplan`，什么时候单独跑 review？ | 不确定时先用 `/autoplan`；你很明确只缺某一类审查时，再单独跑对应的 plan review。 |
| 我需要记住所有命令吗？ | 不用。先记住场景和流程，再用 [技能速查表](./gstack-skills-cheatsheet.md) 查。 |

## 下一步

- 想快速查命令：看 [技能速查表](./gstack-skills-cheatsheet.md)
- 想系统理解所有 skill：看 [完整使用指南](./gstack-complete-guide.md)
