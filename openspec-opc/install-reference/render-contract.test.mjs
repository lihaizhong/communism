import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";
import { renderHumanReport, renderTerminalResultCard } from "./render-contract.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const STAGE5_PATH = path.join(ROOT, "stages", "stage5-execute.yaml");
const STAGE6_PATH = path.join(ROOT, "stages", "stage6-verify.yaml");

test("terminal result card preserves reading order and next actions before artifacts", () => {
  const output = renderTerminalResultCard({
    state: "success",
    executionPath: "new_lane",
    laneId: "node-ts",
    laneProfile: "app",
    gates: [
      { id: "lint", status: "passed", command: "npm run lint" },
      { id: "test", status: "passed", command: "npm test" },
      { id: "typecheck", status: "passed", command: "npm run typecheck" },
    ],
    profileSmoke: {
      label: "frontend page smoke",
      status: "passed",
      command: "npm run smoke",
      summary: "app root marker is present",
    },
    writtenChanges: ["openspec/config.yaml"],
    nextActions: ["run the default first change flow"],
    artifacts: {
      reportPath: "openspec/install-report.md",
      jsonPath: "openspec/install-report.json",
    },
  });

  assert.match(output, /overall result: success/);
  assert.ok(output.indexOf("next actions:") < output.indexOf("artifact paths:"));
  assert.ok(output.indexOf("profile smoke:") < output.indexOf("written changes:"));
  assert.ok(output.indexOf("- lint: passed") < output.indexOf("- test: passed"));
  assert.ok(output.indexOf("- test: passed") < output.indexOf("- typecheck: passed"));
});

test("human report keeps fixed section headings", () => {
  const output = renderHumanReport({
    executionPath: "new_lane",
    gates: [{ id: "test", status: "failed", command: "npm test" }],
    nextActions: ["fix the failing test command"],
  });

  const headings = [
    "## Overall Result",
    "## Execution Path",
    "## Gate Results",
    "## Profile Smoke",
    "## Written Changes",
    "## Next Actions",
    "## Artifact Paths",
    "## Raw Details",
  ];

  for (const heading of headings) {
    assert.match(output, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("terminal result card renders canonical gate status, not caller supplied state drift", () => {
  const output = renderTerminalResultCard({
    executionPath: "new_lane",
    gates: [{ id: "test", status: "failed", command: "npm test" }],
    writtenChanges: ["openspec/config.yaml"],
  });

  assert.match(output, /overall result: partial_install/);
  assert.match(output, /- test: failed \| npm test/);
});

test("terminal result card renders profile smoke details", () => {
  const output = renderTerminalResultCard({
    executionPath: "new_lane",
    laneId: "node-ts",
    laneProfile: "service",
    gates: [
      { id: "lint", status: "passed", command: "npm run lint" },
      { id: "test", status: "passed", command: "npm test" },
      { id: "typecheck", status: "passed", command: "npm run typecheck" },
    ],
    profileSmoke: {
      label: "service API smoke",
      status: "passed",
      command: "npm run smoke",
      summary: "health endpoint returned ok",
    },
  });

  assert.match(output, /profile smoke:/);
  assert.match(output, /- service API smoke: passed \| npm run smoke \| health endpoint returned ok/);
});

test("stage5 node-ts contract requires real commands and rendered artifacts", () => {
  const stage5 = parseYaml(fs.readFileSync(STAGE5_PATH, "utf8"));
  const taskT55 = stage5.core_tasks.find((task) => task.id === "T5.5");
  const taskT6 = stage5.core_tasks.find((task) => task.id === "T6");
  const verifyT55 = taskT55?.verify?.command || "";
  const verifyCommand = taskT6?.verify?.command || "";

  assert.equal(stage5.contracts?.profile_smoke_contract, "openspec-opc/install-reference/profile-smoke-contract.mjs");
  assert.ok(stage5.outputs.includes("PROFILE_SMOKE_STATUS"));
  assert.ok(stage5.outputs.includes("PROFILE_SMOKE_COMMAND"));
  assert.ok(stage5.outputs.includes("PROFILE_SMOKE_SUMMARY"));
  assert.ok(stage5.outputs.includes("TERMINAL_RESULT_CARD_PATH"));
  assert.ok(stage5.outputs.includes("CONFORMANCE_REPORT_PATH"));
  assert.ok(stage5.outputs.includes("CONFORMANCE_JSON_PATH"));
  assert.ok(taskT55);
  assert.ok(stage5.core_tasks.findIndex((task) => task.id === "T5.5") < stage5.core_tasks.findIndex((task) => task.id === "T6"));
  assert.match(verifyT55, /test -s "\{\{TERMINAL_RESULT_CARD_PATH\}\}"/);
  assert.match(verifyT55, /\{ \[ "\{\{EXECUTION_PATH\}\}" != "new_lane" \] \|\| \{/);
  assert.match(verifyT55, /test -s "\{\{CONFORMANCE_REPORT_PATH\}\}"/);
  assert.match(verifyT55, /test -s "\{\{CONFORMANCE_JSON_PATH\}\}"/);
  assert.match(verifyT55, /rg -q 'profile smoke:' "\{\{TERMINAL_RESULT_CARD_PATH\}\}"/);
  assert.match(verifyT55, /rg -q '## Profile Smoke' "\{\{CONFORMANCE_REPORT_PATH\}\}"/);
  assert.match(verifyT55, /rg -q '"profileSmoke"' "\{\{CONFORMANCE_JSON_PATH\}\}"/);
  assert.match(
    verifyCommand,
    /printf '%s\\n%s\\n%s\\n' "\{\{LINT_COMMAND\}\}" "\{\{TEST_COMMAND\}\}" "\{\{TYPE_CHECK_COMMAND\}\}"/,
  );
  assert.match(verifyCommand, /error:\\\\s\*no test specified\|TODO\|TBD\|placeholder\|stub\|mock\|待补充\|未实现/);
  assert.match(verifyCommand, /test -n "\{\{PROFILE_SMOKE_STATUS\}\}"/);
  assert.match(verifyCommand, /\{ \[ "\{\{INSTALL_LANE_PROFILE\}\}" = "library" \] \|\| test -n "\{\{PROFILE_SMOKE_COMMAND\}\}"; \}/);
  assert.match(verifyCommand, /test -s "\{\{TERMINAL_RESULT_CARD_PATH\}\}"/);
  assert.match(verifyCommand, /test -s "\{\{CONFORMANCE_REPORT_PATH\}\}"/);
  assert.match(verifyCommand, /test -s "\{\{CONFORMANCE_JSON_PATH\}\}"/);
  assert.match(verifyCommand, /rg -q 'profile smoke:' "\{\{TERMINAL_RESULT_CARD_PATH\}\}"/);
  assert.match(verifyCommand, /rg -q '## Profile Smoke' "\{\{CONFORMANCE_REPORT_PATH\}\}"/);
  assert.match(verifyCommand, /rg -q '"profileSmoke"' "\{\{CONFORMANCE_JSON_PATH\}\}"/);
  assert.equal(taskT6?.on_complete, "标记 T6 [x]");
});

test("task ledger template records result-card and profile-smoke variables", () => {
  const taskTemplate = fs.readFileSync(path.join(ROOT, "..", ".template", "harness-install-tasks.md"), "utf8");

  assert.match(taskTemplate, /\| `TERMINAL_RESULT_CARD_PATH` \| \| 阶段 5 生成的主结果卡路径；新 lane 与 legacy fallback 都必须写出 \|/);
  assert.match(taskTemplate, /\| `PROFILE_SMOKE_STATUS` \| \| 阶段 5\/6 记录 profile smoke 结果/);
  assert.match(taskTemplate, /\| `PROFILE_SMOKE_COMMAND` \| \| 阶段 5\/6 记录的 profile smoke 命令/);
  assert.match(taskTemplate, /\| `PROFILE_SMOKE_SUMMARY` \| \| 阶段 5\/6 记录的 profile smoke 摘要/);
});

test("stage6 summary delegates to the rendered terminal card artifact", () => {
  const stage6 = parseYaml(fs.readFileSync(STAGE6_PATH, "utf8"));
  const summaryStep = stage6.steps.find((step) => step.id === "show_summary");
  const template = summaryStep?.template || "";

  assert.equal(stage6.contracts?.canonical_result, "openspec-opc/install-reference/conformance-contract.mjs");
  assert.equal(stage6.contracts?.profile_smoke_contract, "openspec-opc/install-reference/profile-smoke-contract.mjs");
  assert.ok(stage6.inputs.includes("PROFILE_SMOKE_STATUS"));
  assert.ok(stage6.inputs.includes("PROFILE_SMOKE_COMMAND"));
  assert.ok(stage6.inputs.includes("PROFILE_SMOKE_SUMMARY"));
  assert.equal(stage6.contracts?.render_contract, "openspec-opc/install-reference/render-contract.mjs");
  assert.ok(stage6.inputs.includes("TERMINAL_RESULT_CARD_PATH"));
  assert.match(template, /always render exactly the contents of \{\{TERMINAL_RESULT_CARD_PATH\}\}/);
  assert.match(template, /terminal result card: \{\{TERMINAL_RESULT_CARD_PATH\}\}/);
  assert.match(template, /if EXECUTION_PATH == new_lane, also surface \{\{CONFORMANCE_REPORT_PATH\}\} and \{\{CONFORMANCE_JSON_PATH\}\}/);
  assert.match(template, /if EXECUTION_PATH == legacy_fallback, the terminal result card remains the primary output and no new lane conformance bundle is required/);
  assert.match(template, /profile smoke lines/);
  assert.match(template, /canonical_result\.profileSmoke/);
  assert.doesNotMatch(template, /execution path:|lint: passed\|failed\|missing\|not_run|test: passed\|failed\|missing\|not_run|typecheck: passed\|failed\|missing\|not_run/);
  assert.doesNotMatch(template, /\{\{INSTALL_LANE_ID\}\}\/\{\{INSTALL_LANE_PROFILE\}\}/);
});
