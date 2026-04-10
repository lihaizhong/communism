import assert from "node:assert/strict";

export const RESULT_STATES = ["success", "failed", "partial_install", "legacy_fallback"];
export const EXECUTION_PATHS = ["new_lane", "legacy_fallback"];
export const GATE_ORDER = ["lint", "test", "typecheck"];
export const GATE_STATUSES = ["passed", "failed", "missing", "not_run"];

export function normalizeGateId(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeGateResults(gates = []) {
  const byId = new Map();
  for (const gate of gates) {
    const id = normalizeGateId(gate?.id);
    if (!GATE_ORDER.includes(id)) continue;
    byId.set(id, {
      id,
      status: GATE_STATUSES.includes(gate?.status) ? gate.status : "not_run",
      label: gate?.label || id,
      command: gate?.command || "",
      summary: gate?.summary || "",
    });
  }

  return GATE_ORDER.map((id) => {
    return (
      byId.get(id) || {
        id,
        status: "not_run",
        label: id,
        command: "",
        summary: "",
      }
    );
  });
}

export function deriveResultState({
  executionPath = "new_lane",
  gateResults = [],
  wroteFiles = [],
  artifactFailures = [],
} = {}) {
  if (executionPath === "legacy_fallback") {
    return "legacy_fallback";
  }

  const normalizedGates = normalizeGateResults(gateResults);
  const hasFailure = normalizedGates.some((gate) => gate.status === "failed");
  const hasArtifactFailure = artifactFailures.length > 0;
  if (!hasFailure && !hasArtifactFailure) {
    return "success";
  }

  return wroteFiles.length > 0 ? "partial_install" : "failed";
}

export function createCanonicalResult(input) {
  const normalizedGates = normalizeGateResults(input?.gates || input?.gateResults);
  const normalizedWrittenChanges = [...new Set(input?.writtenChanges || input?.wroteFiles || [])];
  const derivedState = deriveResultState({
    executionPath: input?.executionPath || "new_lane",
    gateResults: normalizedGates,
    wroteFiles: normalizedWrittenChanges,
    artifactFailures: input?.artifactFailures || [],
  });
  if (input?.state) {
    assert.equal(input.state, derivedState, `canonical result state must match derived state: expected ${derivedState}, got ${input.state}`);
  }
  const result = {
    state: derivedState,
    executionPath: input?.executionPath || "new_lane",
    laneId: input?.laneId || "",
    laneProfile: input?.laneProfile || "",
    summary: input?.summary || "",
    gates: normalizedGates,
    writtenChanges: normalizedWrittenChanges,
    nextActions: [...new Set(input?.nextActions || [])],
    artifacts: {
      reportPath: input?.artifacts?.reportPath || "",
      jsonPath: input?.artifacts?.jsonPath || "",
    },
    rawDetails: [...new Set(input?.rawDetails || [])],
  };

  validateCanonicalResult(result);
  return result;
}

export function validateCanonicalResult(result) {
  assert.ok(RESULT_STATES.includes(result.state), `unsupported result state: ${result.state}`);
  assert.ok(EXECUTION_PATHS.includes(result.executionPath), `unsupported execution path: ${result.executionPath}`);
  assert.equal(result.gates.length, GATE_ORDER.length, "canonical result must contain all gates");
  assert.deepEqual(
    result.gates.map((gate) => gate.id),
    GATE_ORDER,
    "canonical result gates must preserve fixed order",
  );
  for (const gate of result.gates) {
    assert.ok(GATE_STATUSES.includes(gate.status), `unsupported gate status: ${gate.status}`);
  }
}
