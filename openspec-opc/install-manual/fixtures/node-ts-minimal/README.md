# Node/TS Minimal Fixture

这是 OpenSpec OPC 文档驱动安装器的最小 first-success 样例，同时也是
`library` profile 的 conformance fixture。

目标不是跑浏览器页面，而是验证：

1. AI 能把这个目录识别为 `node-ts` lane
2. profile 会稳定解析为 `library`
3. 安装完成后会写出文本优先的主结果卡
4. `new_lane` 会额外写出人类可读报告和机器 JSON
5. 仓库测试会真实执行 fixture 自己的 `lint / test / typecheck` 命令
6. 这个 fixture 只覆盖安装 contract，不承担 `spec-driven` 里的 `test-contract.md` 示例职责

## Fixture 输入

- `package.json`
- `tsconfig.json`
- `src/index.ts`

## 预期检测结果

- `INSTALL_LANE_ID = node-ts`
- `INSTALL_LANE_PROFILE = library`
- `EXECUTION_PATH = new_lane`

## 预期安装产物

- `.openspec-opc/install-result.txt`
- `.openspec-opc/install-report.md`
- `.openspec-opc/install-report.json`

本目录下的 `expected/` 给出了这三类结果产物的参考内容。

## 手动 walkthrough

1. 在 AI 执行器里把 `openspec-opc/install.md` 作为入口文档交给安装器。
2. 将当前目录 `openspec-opc/install-manual/fixtures/node-ts-minimal/` 视为目标项目根目录。
3. 在阶段 3 确认检测结果为 `node-ts/library`，并且 `lint / test / typecheck` 三个 gate 都来自真实命令。
4. 在阶段 5 确认先写出 `.openspec-opc/install-result.txt`，再进入最终 conformance 校验。
5. 在阶段 6 确认主输出直接展示 `.openspec-opc/install-result.txt`，而不是手写摘要。

如果实际安装结果和 `expected/` 目录明显偏离，应该优先修正 install contract，而不是在下游项目里做特判。
