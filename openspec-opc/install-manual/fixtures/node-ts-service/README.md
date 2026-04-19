# Node/TS Service Fixture

这是 OpenSpec OPC 文档驱动安装器的 `service` profile conformance fixture。

它的目标是证明：

1. AI 会把这个目录识别为 `node-ts` lane
2. profile 会稳定解析为 `service`
3. `lint / test / typecheck` 都来自 fixture 自己的真实命令
4. `smoke` 命令能承载最小 API smoke contract
5. 统一 conformance 结果卡可以覆盖 service 形态，而不是只覆盖 library
6. 这个 fixture 只覆盖 install-manual 的 conformance contract，不承担 `spec-driven` 的 `test-contract.md` 示例职责

## Fixture 输入

- `package.json`
- `tsconfig.json`
- `src/server.ts`
- `scripts/lint.mjs`
- `scripts/smoke.mjs`
- `test/service-profile.test.mjs`

## 预期检测结果

- `INSTALL_LANE_ID = node-ts`
- `INSTALL_LANE_PROFILE = service`
- `EXECUTION_PATH = new_lane`

## 预期安装产物

- `openspec/install-result.txt`
- `openspec/install-report.md`
- `openspec/install-report.json`

本目录下的 `expected/` 给出了三类结果产物的参考内容。

## 手动 walkthrough

1. 在 AI 执行器里把 `openspec-opc/install.md` 作为入口文档交给安装器。
2. 将当前目录 `openspec-opc/install-manual/fixtures/node-ts-service/` 视为目标项目根目录。
3. 在阶段 3 确认检测结果为 `node-ts/service`，并且三个 gate 都能映射到真实命令。
4. 确认 `npm run smoke` 对应的是最小 API smoke contract，而不是占位脚本。
5. 在阶段 5 确认 terminal result card、human report、machine JSON 全部写出。
6. 在阶段 6 确认主输出展示 terminal result card，并把报告路径作为辅助产物暴露出来。
