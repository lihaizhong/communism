import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const STAGE3_PATH = path.join(ROOT, "stages", "stage3-detect.yaml");
const STAGE4_PATH = path.join(ROOT, "stages", "stage4-config.yaml");
const STAGE5_PATH = path.join(ROOT, "stages", "stage5-execute.yaml");

test("stage3 publishes profile smoke planning variables for node-ts lanes", () => {
  const stage3 = parseYaml(fs.readFileSync(STAGE3_PATH, "utf8"));
  const reportTemplate = stage3.branches?.existing_project?.report_template || "";
  const onComplete = stage3.on_complete?.action || "";

  assert.equal(stage3.contracts?.profile_smoke_contract, "openspec-opc/install-manual/profile-smoke-contract.mjs");
  assert.ok(stage3.outputs.includes("PROFILE_SMOKE_STATUS"));
  assert.ok(stage3.outputs.includes("PROFILE_SMOKE_COMMAND"));
  assert.ok(stage3.outputs.includes("PROFILE_SMOKE_SUMMARY"));
  assert.match(reportTemplate, /\{\{PROFILE_SMOKE_STATUS\}\}/);
  assert.match(reportTemplate, /\{\{PROFILE_SMOKE_COMMAND\}\}/);
  assert.match(onComplete, /PROFILE_SMOKE_STATUS、PROFILE_SMOKE_COMMAND、PROFILE_SMOKE_SUMMARY/);
  assert.match(onComplete, /library 必须显式写入 not_applicable/);
});

test("stage4 preserves profile smoke planning variables through config selection", () => {
  const stage4 = parseYaml(fs.readFileSync(STAGE4_PATH, "utf8"));
  const onComplete = stage4.on_complete?.action || "";

  assert.ok(stage4.inputs.includes("INSTALL_LANE_ID"));
  assert.ok(stage4.inputs.includes("INSTALL_LANE_PROFILE"));
  assert.ok(stage4.inputs.includes("PROFILE_SMOKE_STATUS"));
  assert.ok(stage4.inputs.includes("PROFILE_SMOKE_COMMAND"));
  assert.ok(stage4.inputs.includes("PROFILE_SMOKE_SUMMARY"));
  assert.ok(stage4.outputs.includes("PROFILE_SMOKE_STATUS"));
  assert.ok(stage4.outputs.includes("PROFILE_SMOKE_COMMAND"));
  assert.ok(stage4.outputs.includes("PROFILE_SMOKE_SUMMARY"));
  assert.match(onComplete, /不得在 stage4 静默清空或覆盖/);
});

test("stage3 and stage5 route installed projects into template upgrade mode", () => {
  const stage3 = parseYaml(fs.readFileSync(STAGE3_PATH, "utf8"));
  const stage5 = parseYaml(fs.readFileSync(STAGE5_PATH, "utf8"));
  const stage3Report = stage3.branches?.existing_project?.report_template || "";
  const stage3OnComplete = stage3.on_complete?.action || "";
  const stage5PreCheck = JSON.stringify(stage5.pre_check || []);
  const upgradeTask = (stage5.core_tasks || []).find((task) => task.id === "T2.1");

  assert.ok(stage3.outputs.includes("INSTALL_EXECUTION_MODE"));
  assert.ok(stage3.outputs.includes("TEMPLATE_UPGRADE_REASON"));
  assert.ok(stage3.outputs.includes("TEMPLATE_LOCK_PATH"));
  assert.match(stage3Report, /\{\{INSTALL_EXECUTION_MODE\}\}/);
  assert.match(stage3Report, /\{\{TEMPLATE_UPGRADE_REASON\}\}/);
  assert.match(stage3OnComplete, /template_upgrade/);

  assert.ok(stage5.inputs.includes("INSTALL_EXECUTION_MODE"));
  assert.ok(stage5.inputs.includes("TEMPLATE_UPGRADE_REASON"));
  assert.ok(stage5.inputs.includes("TEMPLATE_LOCK_PATH"));
  assert.ok(stage5.outputs.includes("TEMPLATE_BUNDLE_PATH"));
  assert.ok(stage5.outputs.includes("TEMPLATE_UPGRADE_PLAN_PATH"));
  assert.match(stage5PreCheck, /TEMPLATE_BUNDLE_PATH = \.openspec-opc\/\.cache\/openspec-opc-upgrade-bundle/);
  assert.ok(upgradeTask, "expected stage5 template upgrade task");
  assert.equal(upgradeTask.condition, "INSTALL_EXECUTION_MODE == template_upgrade");
  assert.match(upgradeTask.action || "", /stage5-upgrade-driver\.mjs/);
  assert.match(upgradeTask.action || "", /--format json|--execution-out/);
  assert.match(upgradeTask.action || "", /build-source-bundle\.mjs/);
  assert.match(upgradeTask.action || "", /cli\.mjs/);
  assert.match(upgradeTask.action || "", /check --plan-out/);
  assert.match(upgradeTask.action || "", /adopt --confirm-suspected/);
  assert.match(upgradeTask.action || "", /dry-run --plan-out/);
  assert.match(upgradeTask.action || "", /--plan-out/);
  assert.match(upgradeTask.stop_prompt || "", /stage5-upgrade-driver\.mjs/);
  assert.match(upgradeTask.stop_prompt || "", /check --plan-out/);
  assert.match(upgradeTask.stop_prompt || "", /adopt --confirm-suspected/);
  assert.match(upgradeTask.stop_prompt || "", /dry-run --plan-out/);
  assert.match(upgradeTask.stop_prompt || "", /AGENTS 仓库约束区、commands\/skills frontmatter、Repository Overrides body blocks、CI job merge/);
});
