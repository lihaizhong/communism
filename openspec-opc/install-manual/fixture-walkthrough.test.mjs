import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCanonicalResult } from "./conformance-contract.mjs";
import { detectInstallerLane, planNodeTsConformance, resolveNodeTsProfile } from "./lane-registry.mjs";
import { planNodeTsProfileSmoke } from "./profile-smoke-contract.mjs";
import { renderHumanReport, renderTerminalResultCard } from "./render-contract.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_BASE = path.join(ROOT, "fixtures");
const NPM_BIN = process.platform === "win32" ? "npm.cmd" : "npm";

const FIXTURES = [
  {
    id: "node-ts-minimal",
    profile: "library",
  },
  {
    id: "node-ts-app",
    profile: "app",
  },
  {
    id: "node-ts-service",
    profile: "service",
  },
];

function readFixtureText(filePath) {
  return fs.readFileSync(filePath, "utf8").trimEnd();
}

function readPackageJson(fixtureRoot) {
  return JSON.parse(fs.readFileSync(path.join(fixtureRoot, "package.json"), "utf8"));
}

function collectFixtureFiles(fixtureRoot) {
  return fs.readdirSync(fixtureRoot, { recursive: true })
    .filter((entry) => typeof entry === "string")
    .filter((entry) => !entry.startsWith("expected/"));
}

function runFixtureGate(fixtureRoot, gateId) {
  const command = gateId === "test" ? ["test"] : ["run", gateId];
  const result = spawnSync(NPM_BIN, command, {
    cwd: fixtureRoot,
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `fixture gate ${gateId} failed in ${fixtureRoot}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );
}

for (const fixture of FIXTURES) {
  const fixtureRoot = path.join(FIXTURE_BASE, fixture.id);
  const expectedRoot = path.join(fixtureRoot, "expected");

  test(`${fixture.id} resolves to the documented lane and profile`, () => {
    const packageJson = readPackageJson(fixtureRoot);
    const lane = detectInstallerLane({
      files: collectFixtureFiles(fixtureRoot),
    });
    const profile = resolveNodeTsProfile({ packageJson });
    const conformance = planNodeTsConformance({ packageJson });

    assert.deepEqual(lane, {
      laneId: "node-ts",
      executionPath: "new_lane",
    });
    assert.equal(profile.status, "resolved");
    assert.equal(profile.profile, fixture.profile);
    assert.deepEqual(conformance.missingGates, []);
  });

  test(`${fixture.id} expected outputs stay aligned with render contracts`, () => {
    const expectedJson = JSON.parse(fs.readFileSync(path.join(expectedRoot, "install-report.json"), "utf8"));
    const canonical = createCanonicalResult(expectedJson);
    const expectedTerminal = readFixtureText(path.join(expectedRoot, "install-result.txt"));
    const expectedReport = readFixtureText(path.join(expectedRoot, "install-report.md"));

    assert.equal(canonical.laneProfile, fixture.profile);
    assert.deepEqual(canonical.gates.map((gate) => gate.id), ["lint", "test", "typecheck"]);
    assert.equal(renderTerminalResultCard(expectedJson), expectedTerminal);
    assert.equal(renderHumanReport(expectedJson), expectedReport);
  });

  test(`${fixture.id} executes real conformance commands`, () => {
    runFixtureGate(fixtureRoot, "lint");
    runFixtureGate(fixtureRoot, "test");
    runFixtureGate(fixtureRoot, "typecheck");
  });

  test(`${fixture.id} resolves the expected profile smoke contract`, () => {
    const packageJson = readPackageJson(fixtureRoot);
    const smokePlan = planNodeTsProfileSmoke({ packageJson });

    if (fixture.profile === "library") {
      assert.equal(smokePlan.status, "not_applicable");
      assert.equal(smokePlan.smokeTest, null);
      return;
    }

    assert.equal(smokePlan.status, "ready");
    assert.equal(smokePlan.profile, fixture.profile);
    assert.equal(smokePlan.smokeTest?.command, "npm run smoke");
  });

  test(`${fixture.id} executes the smoke command when the profile contract is ready`, () => {
    const packageJson = readPackageJson(fixtureRoot);
    const smokePlan = planNodeTsProfileSmoke({ packageJson });

    if (smokePlan.status !== "ready") {
      assert.equal(smokePlan.status, "not_applicable");
      return;
    }

    runFixtureGate(fixtureRoot, "smoke");
  });
}
