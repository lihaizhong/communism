import test from "node:test";
import assert from "node:assert/strict";

import { createCanonicalResult, deriveResultState } from "./conformance-contract.mjs";

test("deriveResultState returns partial_install when writes happened before failure", () => {
  const result = deriveResultState({
    executionPath: "new_lane",
    gateResults: [{ id: "test", status: "failed" }],
    wroteFiles: ["openspec/config.yaml"],
  });

  assert.equal(result, "partial_install");
});

test("deriveResultState treats missing or not_run gates as non-success", () => {
  assert.equal(
    deriveResultState({
      executionPath: "new_lane",
      gateResults: [{ id: "lint", status: "passed" }],
    }),
    "failed",
  );

  assert.equal(
    deriveResultState({
      executionPath: "new_lane",
      gateResults: [{ id: "lint", status: "passed" }],
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
