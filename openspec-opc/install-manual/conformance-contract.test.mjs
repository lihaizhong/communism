import test from "node:test";
import assert from "node:assert/strict";

import { createCanonicalResult, deriveResultState } from "./conformance-contract.mjs";

test("deriveResultState returns partial_install when writes happened before failure", () => {
  const result = deriveResultState({
    executionPath: "new_lane",
    laneProfile: "app",
    gateResults: [{ id: "test", status: "failed" }],
    profileSmoke: { status: "passed" },
    wroteFiles: ["openspec/config.yaml"],
  });

  assert.equal(result, "partial_install");
});

test("deriveResultState treats missing or not_run gates as non-success", () => {
  assert.equal(
    deriveResultState({
      executionPath: "new_lane",
      laneProfile: "library",
      gateResults: [{ id: "lint", status: "passed" }],
      profileSmoke: { status: "not_applicable" },
    }),
    "failed",
  );

  assert.equal(
    deriveResultState({
      executionPath: "new_lane",
      laneProfile: "library",
      gateResults: [{ id: "lint", status: "passed" }],
      profileSmoke: { status: "not_applicable" },
      wroteFiles: ["openspec/config.yaml"],
    }),
    "partial_install",
  );
});

test("deriveResultState requires passed profile smoke for app and service lanes", () => {
  assert.equal(
    deriveResultState({
      executionPath: "new_lane",
      laneProfile: "app",
      gateResults: [
        { id: "lint", status: "passed" },
        { id: "test", status: "passed" },
        { id: "typecheck", status: "passed" },
      ],
      profileSmoke: { status: "not_run" },
    }),
    "failed",
  );

  assert.equal(
    deriveResultState({
      executionPath: "new_lane",
      laneProfile: "service",
      gateResults: [
        { id: "lint", status: "passed" },
        { id: "test", status: "passed" },
        { id: "typecheck", status: "passed" },
      ],
      profileSmoke: { status: "missing" },
      wroteFiles: ["openspec/config.yaml"],
    }),
    "partial_install",
  );
});

test("createCanonicalResult normalizes fixed gate order", () => {
  const result = createCanonicalResult({
    executionPath: "new_lane",
    gates: [
      { id: "typecheck", status: "passed" },
      { id: "lint", status: "passed" },
    ],
  });

  assert.deepEqual(
    result.gates.map((gate) => gate.id),
    ["lint", "test", "typecheck"],
  );
  assert.equal(result.gates[1].status, "not_run");
  assert.equal(result.state, "failed");
});

test("createCanonicalResult rejects caller-supplied state drift", () => {
  assert.throws(
    () =>
      createCanonicalResult({
        state: "success",
        executionPath: "new_lane",
        gates: [{ id: "test", status: "failed" }],
        writtenChanges: ["openspec/config.yaml"],
      }),
    /canonical result state must match derived state/,
  );
});

test("createCanonicalResult normalizes profile smoke with library default", () => {
  const result = createCanonicalResult({
    executionPath: "new_lane",
    laneProfile: "library",
    gates: [
      { id: "lint", status: "passed" },
      { id: "test", status: "passed" },
      { id: "typecheck", status: "passed" },
    ],
  });

  assert.equal(result.profileSmoke.status, "not_applicable");
  assert.match(result.profileSmoke.summary, /library profile/);
  assert.equal(result.state, "success");
});

test("createCanonicalResult preserves explicit profile smoke payload", () => {
  const result = createCanonicalResult({
    executionPath: "new_lane",
    laneProfile: "app",
    gates: [
      { id: "lint", status: "passed" },
      { id: "test", status: "passed" },
      { id: "typecheck", status: "passed" },
    ],
    profileSmoke: {
      id: "app-page-smoke",
      label: "frontend page smoke",
      status: "passed",
      command: "npm run smoke",
      summary: "app root marker is present",
      artifacts: ["openspec/smoke-app.txt"],
    },
  });

  assert.equal(result.profileSmoke.id, "app-page-smoke");
  assert.equal(result.profileSmoke.status, "passed");
  assert.equal(result.profileSmoke.command, "npm run smoke");
  assert.deepEqual(result.profileSmoke.artifacts, ["openspec/smoke-app.txt"]);
  assert.equal(result.state, "success");
});

test("createCanonicalResult does not allow app success without passed profile smoke", () => {
  const result = createCanonicalResult({
    executionPath: "new_lane",
    laneProfile: "app",
    gates: [
      { id: "lint", status: "passed" },
      { id: "test", status: "passed" },
      { id: "typecheck", status: "passed" },
    ],
  });

  assert.equal(result.profileSmoke.status, "not_run");
  assert.equal(result.state, "failed");
});
