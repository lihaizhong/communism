import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { APPLY_STATE_PATH } from "../packages/opc-guard-core/dist/constants.js";
import { collectWorkflowState } from "../packages/opc-guard-core/dist/workflow-state.js";
import { createCodexAdapter } from "../plugins/codex-spec-opc/dist/codex-adapter.js";

const COUNTS = [10, 100, 500];
const WARMUP_RUNS = 2;
const SAMPLE_RUNS = 7;

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

function changeProposal(name) {
  return [
    "## Why",
    `${name} needs a documented user-facing change because the workflow guard should evaluate non-placeholder proposal content.`,
    "",
    "## What Changes",
    "Add or update the execution path while keeping the project-level rules explicit and reviewable.",
  ].join("\n");
}

function changeDesign(index) {
  return [
    "## Affected Modules",
    `- src/feature-${index}.ts`,
    `- src/workflow-${index}.ts`,
    "",
    "## Constraints",
    "- Keep the runtime guard deterministic.",
    "- Preserve text-first output contracts.",
    "",
    "## Approach",
    "Thread the change through a narrow implementation path and keep the generated artifacts readable in plain text output.",
  ].join("\n");
}

function testContract(name) {
  return [
    "# Test Contract",
    "",
    "## Purpose",
    "Constrain the test scope for a benchmark change.",
    "",
    "## Derived From",
    `- Requirement: ${name} coverage`,
    "",
    "## Positive Anchors",
    "### Anchor: readiness",
    "- proves: the work item can become apply-ready",
    "- maps_to: workflow state collection",
    "- minimum_expected_signal: guard quality passes",
    "",
    "## Negative Obligations",
    "### Case: placeholder coverage",
    "- trigger: shallow or placeholder content",
    "- expected_failure_or_guard: quality gate blocks readiness",
    "- maps_to: runtime guard quality check",
    "",
    "## Boundary Obligations",
    "### Boundary: minimal supported content",
    "- boundary_dimension: artifact completeness",
    "- input_or_state: benchmark fixture work item",
    "- expected_behavior: contract stays readable and specific",
    "- maps_to: workflow state collection",
    "",
    "## Must-Not-Expand",
    "- do not invent unrelated tests",
    "- do not turn the contract into implementation notes",
    "",
    "## Verify Evidence",
    "- collectWorkflowState()",
    "- guard quality evaluation",
  ].join("\n");
}

function bugReport(name) {
  return [
    "## Summary",
    `${name} reproduces a realistic bugfix workflow with explicit symptoms and expected behavior.`,
    "",
    "## Reproduction",
    "1. Run the guarded flow.",
    "2. Observe the incorrect output.",
    "",
    "## Expected vs Actual",
    "Expected a stable result artifact, actual behavior drifted.",
  ].join("\n");
}

function bugFix() {
  return [
    "## Root Cause",
    "The workflow skipped an explicit runtime proof step.",
    "",
    "## Fix Plan",
    "Add the missing guard check and keep the summary output stable.",
    "",
    "## Verification",
    "Run the guard benchmark and confirm the target path remains inside the expected latency band.",
  ].join("\n");
}

function tasks() {
  return [
    "- [ ] Add or verify one implementation step",
    "- [ ] Preserve the rendered result structure",
  ].join("\n");
}

function spec() {
  return [
    "### Requirement: Guard Benchmark Coverage",
    "The runtime guard SHALL evaluate realistic work items.",
    "",
    "#### Scenario: Ready work item exists",
    "GIVEN a valid OpenSpec change",
    "WHEN workflow state is collected",
    "THEN the work item can become apply-ready.",
  ].join("\n");
}

async function createChangeWorkItem(rootDir, name, index) {
  const workItemDir = path.join(rootDir, "openspec/changes", name);
  await writeFile(path.join(workItemDir, ".openspec.yaml"), `kind: change\nname: ${name}\n`);
  await writeFile(path.join(workItemDir, "proposal.md"), changeProposal(name));
  await writeFile(path.join(workItemDir, "design.md"), changeDesign(index));
  await writeFile(path.join(workItemDir, "test-contract.md"), testContract(name));
  await writeFile(path.join(workItemDir, "tasks.md"), tasks());
  await writeFile(path.join(workItemDir, "specs", "behavior.md"), spec());
}

async function createBugfixWorkItem(rootDir, name) {
  const workItemDir = path.join(rootDir, "openspec/bugs", name);
  await writeFile(path.join(workItemDir, ".openspec.yaml"), `kind: bugfix\nname: ${name}\n`);
  await writeFile(path.join(workItemDir, "bug-report.md"), bugReport(name));
  await writeFile(path.join(workItemDir, "fix.md"), bugFix());
}

async function createBenchmarkRepo(totalItems) {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "openspec-opc-guard-bench-"));
  const tasks = [];

  for (let index = 0; index < totalItems; index += 1) {
    if (index % 2 === 0) {
      tasks.push(createChangeWorkItem(rootDir, `change-${String(index).padStart(3, "0")}`, index));
    } else {
      tasks.push(createBugfixWorkItem(rootDir, `bugfix-${String(index).padStart(3, "0")}`));
    }
  }

  await Promise.all(tasks);
  await writeFile(path.join(rootDir, "src", "app.js"), "export const benchmarkTarget = true;\n");

  const selectedChange = "change-000";
  await writeFile(
    path.join(rootDir, APPLY_STATE_PATH),
    `${JSON.stringify({
      mode: "apply",
      kind: "change",
      name: selectedChange,
      sessionId: "bench-green",
      phase: "green",
      redSessionId: "bench-red",
      greenSessionId: "bench-green",
      verifySessionId: "bench-verify",
      phaseEvidence: {
        redTouchedTestFiles: ["src/app.test.js"],
        greenTouchedImplFiles: [],
        verifyCommands: [],
      },
      updatedAt: new Date().toISOString(),
    }, null, 2)}\n`,
  );

  return { rootDir, selectedChange };
}

async function measure(label, fn) {
  for (let index = 0; index < WARMUP_RUNS; index += 1) {
    await fn();
  }

  const samples = [];
  for (let index = 0; index < SAMPLE_RUNS; index += 1) {
    const startedAt = performance.now();
    await fn();
    samples.push(performance.now() - startedAt);
  }

  const sorted = [...samples].sort((left, right) => left - right);
  const total = samples.reduce((sum, value) => sum + value, 0);
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return {
    label,
    meanMs: total / samples.length,
    minMs: sorted[0],
    p95Ms: sorted[p95Index],
    maxMs: sorted[sorted.length - 1],
  };
}

function formatMs(value) {
  return value.toFixed(2);
}

async function runScenario(totalItems) {
  const { rootDir, selectedChange } = await createBenchmarkRepo(totalItems);
  const adapter = createCodexAdapter();
  adapter.rememberSelection("bench-green", { kind: "change", name: selectedChange });

  const collectStats = await measure("collectWorkflowState()", async () => {
    const state = await collectWorkflowState(rootDir);
    if (state.readyItems.length === 0) {
      throw new Error("benchmark fixture did not produce any apply-ready items");
    }
  });

  const beforeMutationStats = await measure("codex beforeMutation()", async () => {
    const decision = await adapter.beforeMutation({
      rootDir,
      sessionId: "bench-green",
      tool: "write",
      args: { filePath: "src/app.js" },
    });
    if (decision !== null) {
      throw new Error(`benchmark expected null decision, received ${decision.code || "unknown"}`);
    }
  });

  return { totalItems, collectStats, beforeMutationStats };
}

function printSummary(results) {
  console.log("OpenSpec OPC Runtime Guard Benchmark");
  console.log("");
  console.log(`Warmup runs: ${WARMUP_RUNS}`);
  console.log(`Sample runs: ${SAMPLE_RUNS}`);
  console.log("");
  console.log("| Scenario | Work items | Mean (ms) | P95 (ms) | Max (ms) |");
  console.log("|----------|------------|-----------|----------|----------|");
  for (const result of results) {
    for (const stat of [result.collectStats, result.beforeMutationStats]) {
      console.log(
        `| ${stat.label} | ${result.totalItems} | ${formatMs(stat.meanMs)} | ${formatMs(stat.p95Ms)} | ${formatMs(stat.maxMs)} |`,
      );
    }
  }
  console.log("");
  console.log("Notes:");
  console.log("- collectWorkflowState() measures raw work-item scan and quality evaluation cost.");
  console.log("- codex beforeMutation() measures a representative mutating hook path that includes workflow-state collection.");
  console.log("- This benchmark is informational only and is intentionally excluded from the release gate.");
}

const results = [];
for (const count of COUNTS) {
  results.push(await runScenario(count));
}

printSummary(results);
