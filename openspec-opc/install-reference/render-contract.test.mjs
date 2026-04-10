import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { parse as parseYaml } from "yaml";
import { renderHumanReport, renderTerminalResultCard } from "./render-contract.mjs";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const STAGE6_PATH = path.join(ROOT, "stages", "stage6-verify.yaml");

function extractSummaryMarkers(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      return (
        line === "OpenSpec OPC install result" ||
        line.startsWith("overall result:") ||
        line.startsWith("execution path:") ||
        line === "gate results:" ||
        line === "written changes:" ||
        line === "next actions:" ||
        line === "artifact paths:"
      );
    })
    .map((line) => {
      if (line.startsWith("overall result:")) {
        return "overall result:";
      }
      if (line.startsWith("execution path:")) {
        return "execution path:";
      }
      return line;
    });
}

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
    writtenChanges: ["openspec/config.yaml"],
    nextActions: ["run the default first change flow"],
    artifacts: {
      reportPath: "openspec/install-report.md",
      jsonPath: "openspec/install-report.json",
    },
  });

  assert.match(output, /overall result: success/);
  assert.ok(output.indexOf("next actions:") < output.indexOf("artifact paths:"));
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

test("stage6 summary template stays aligned with the terminal render contract", () => {
  const stage6 = parseYaml(fs.readFileSync(STAGE6_PATH, "utf8"));
  const summaryStep = stage6.steps.find((step) => step.id === "show_summary");
  const template = summaryStep?.template || "";
  const rendered = renderTerminalResultCard({
    executionPath: "new_lane",
    laneId: "node-ts",
    laneProfile: "app",
    gates: [
      { id: "lint", status: "passed", command: "npm run lint" },
      { id: "test", status: "failed", command: "npm test" },
      { id: "typecheck", status: "not_run", command: "npm run typecheck" },
    ],
    writtenChanges: ["openspec/config.yaml"],
    nextActions: ["fix the failing test command"],
    artifacts: {
      reportPath: "openspec/install-report.md",
      jsonPath: "openspec/install-report.json",
    },
  });

  assert.equal(stage6.contracts?.canonical_result, "openspec-opc/install-reference/conformance-contract.mjs");
  assert.equal(stage6.contracts?.render_contract, "openspec-opc/install-reference/render-contract.mjs");
  assert.ok(!stage6.inputs.includes("LINT_COMMAND"));
  assert.ok(!stage6.inputs.includes("TEST_COMMAND"));
  assert.ok(!stage6.inputs.includes("TYPE_CHECK_COMMAND"));
  assert.deepEqual(extractSummaryMarkers(template), extractSummaryMarkers(rendered));
  assert.match(template, /lint: passed\|failed\|missing\|not_run/);
  assert.match(template, /test: passed\|failed\|missing\|not_run/);
  assert.match(template, /typecheck: passed\|failed\|missing\|not_run/);
  assert.doesNotMatch(template, /\{\{LINT_COMMAND\}\}|\{\{TEST_COMMAND\}\}|\{\{TYPE_CHECK_COMMAND\}\}/);
});
