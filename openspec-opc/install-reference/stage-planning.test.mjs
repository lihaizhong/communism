import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const STAGE3_PATH = path.join(ROOT, "stages", "stage3-detect.yaml");
const STAGE4_PATH = path.join(ROOT, "stages", "stage4-config.yaml");

test("stage3 publishes profile smoke planning variables for node-ts lanes", () => {
  const stage3 = parseYaml(fs.readFileSync(STAGE3_PATH, "utf8"));
  const reportTemplate = stage3.branches?.existing_project?.report_template || "";
  const onComplete = stage3.on_complete?.action || "";

  assert.equal(stage3.contracts?.profile_smoke_contract, "openspec-opc/install-reference/profile-smoke-contract.mjs");
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
