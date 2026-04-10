import test from "node:test";
import assert from "node:assert/strict";

import { detectInstallerLane, isRealConformanceCommand, loadLaneRegistry, planNodeTsConformance, resolveNodeTsProfile } from "./lane-registry.mjs";

test("lane registry loads the node-ts lane", () => {
  const registry = loadLaneRegistry();
  assert.equal(registry.lanes.length, 1);
  assert.equal(registry.lanes[0].id, "node-ts");
});

test("detectInstallerLane routes package.json projects to node-ts", () => {
  const lane = detectInstallerLane({
    files: ["package.json", "tsconfig.json"],
  });

  assert.equal(lane.laneId, "node-ts");
  assert.equal(lane.executionPath, "new_lane");
});

test("resolveNodeTsProfile returns ambiguous when app and service markers overlap", () => {
  const resolution = resolveNodeTsProfile({
    packageJson: {
      dependencies: {
        react: "^19.0.0",
        express: "^5.0.0",
      },
      scripts: {
        dev: "vite",
        start: "node server.js",
      },
    },
  });

  assert.equal(resolution.status, "ambiguous");
  assert.deepEqual(resolution.candidates, ["app", "service"]);
});

test("planNodeTsConformance reports missing gates", () => {
  const plan = planNodeTsConformance({
    packageJson: {
      dependencies: {
        react: "^19.0.0",
      },
      scripts: {
        lint: "eslint .",
      },
    },
  });

  assert.deepEqual(plan.missingGates, ["test", "typecheck"]);
});

test("placeholder scripts are not accepted as real conformance commands", () => {
  assert.equal(isRealConformanceCommand('echo "Error: no test specified" && exit 1'), false);

  const plan = planNodeTsConformance({
    packageJson: {
      scripts: {
        test: 'echo "Error: no test specified" && exit 1',
      },
    },
  });

  assert.deepEqual(plan.missingGates, ["lint", "test", "typecheck"]);
  assert.equal(plan.gates.find((gate) => gate.id === "test")?.status, "missing");
});
