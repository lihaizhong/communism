import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCanonicalResult } from "./conformance-contract.mjs";
import { detectInstallerLane, planNodeTsConformance, resolveNodeTsProfile } from "./lane-registry.mjs";
import { renderHumanReport, renderTerminalResultCard } from "./render-contract.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(ROOT, "fixtures", "node-ts-minimal");
const EXPECTED_ROOT = path.join(FIXTURE_ROOT, "expected");

function readFixtureText(filePath) {
  return fs.readFileSync(filePath, "utf8").trimEnd();
}

test("node-ts minimal fixture resolves to the documented lane and profile", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "package.json"), "utf8"));

  const lane = detectInstallerLane({
    files: ["package.json", "tsconfig.json", "src/index.ts"],
  });
  const profile = resolveNodeTsProfile({ packageJson });
  const conformance = planNodeTsConformance({ packageJson });

  assert.deepEqual(lane, {
    laneId: "node-ts",
    executionPath: "new_lane",
  });
  assert.equal(profile.status, "resolved");
  assert.equal(profile.profile, "library");
  assert.deepEqual(conformance.missingGates, []);
});

test("node-ts minimal fixture expected outputs stay aligned with render contracts", () => {
  const expectedJson = JSON.parse(fs.readFileSync(path.join(EXPECTED_ROOT, "install-report.json"), "utf8"));
  const canonical = createCanonicalResult(expectedJson);
  const expectedTerminal = readFixtureText(path.join(EXPECTED_ROOT, "install-result.txt"));
  const expectedReport = readFixtureText(path.join(EXPECTED_ROOT, "install-report.md"));

  assert.deepEqual(canonical.gates.map((gate) => gate.id), ["lint", "test", "typecheck"]);
  assert.equal(renderTerminalResultCard(expectedJson), expectedTerminal);
  assert.equal(renderHumanReport(expectedJson), expectedReport);
});
