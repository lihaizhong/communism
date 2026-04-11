import assert from "node:assert/strict";

export const RESULT_STATES = ["success", "failed", "partial_install", "legacy_fallback"];
export const EXECUTION_PATHS = ["new_lane", "legacy_fallback"];
export const GATE_ORDER = ["lint", "test", "typecheck"];
export const GATE_STATUSES = ["passed", "failed", "missing", "not_run"];
export const PROFILE_SMOKE_STATUSES = ["passed", "failed", "missing", "not_run", "not_applicable"];

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
  laneProfile = "",
  gateResults = [],
  profileSmoke = {},
  wroteFiles = [],
  artifactFailures = [],
} = {}) {
  if (executionPath === "legacy_fallback") {
    return "legacy_fallback";
  }

  const normalizedGates = normalizeGateResults(gateResults);
  const normalizedProfileSmoke = normalizeProfileSmoke(profileSmoke, laneProfile);
  const hasBlockingGate = normalizedGates.some((gate) => gate.status !== "passed");
  const requiresSmokePass = laneProfile === "app" || laneProfile === "service";
  const hasBlockingProfileSmoke = requiresSmokePass
    ? normalizedProfileSmoke.status !== "passed"
    : laneProfile === "library"
      ? normalizedProfileSmoke.status !== "not_applicable"
      : false;
  const hasArtifactFailure = artifactFailures.length > 0;
  if (!hasBlockingGate && !hasBlockingProfileSmoke && !hasArtifactFailure) {
    return "success";
  }

  return wroteFiles.length > 0 ? "partial_install" : "failed";
}

export function normalizeProfileSmoke(input = {}, laneProfile = "") {
  const defaultStatus = laneProfile === "library" ? "not_applicable" : "not_run";
  const status = PROFILE_SMOKE_STATUSES.includes(input?.status) ? input.status : defaultStatus;
  const label =
    input?.label ||
    (laneProfile === "app"
      ? "frontend page smoke"
      : laneProfile === "service"
        ? "service API smoke"
        : laneProfile === "library"
          ? "runtime smoke"
          : "profile smoke");
  const summary =
    input?.summary ||
    (status === "not_applicable" && laneProfile === "library" ? "not applicable for library profile" : "");

  return {
    id: input?.id || "",
    label,
    status,
    command: input?.command || "",
    summary,
    artifacts: [...new Set(input?.artifacts || [])],
  };
}

export function createCanonicalResult(input) {
  const normalizedGates = normalizeGateResults(input?.gates || input?.gateResults);
  const normalizedWrittenChanges = [...new Set(input?.writtenChanges || input?.wroteFiles || [])];
  const normalizedProfileSmoke = normalizeProfileSmoke(input?.profileSmoke, input?.laneProfile || "");
  const derivedState = deriveResultState({
    executionPath: input?.executionPath || "new_lane",
    laneProfile: input?.laneProfile || "",
    gateResults: normalizedGates,
    profileSmoke: normalizedProfileSmoke,
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
    profileSmoke: normalizedProfileSmoke,
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
  assert.ok(
    PROFILE_SMOKE_STATUSES.includes(result.profileSmoke.status),
    `unsupported profile smoke status: ${result.profileSmoke.status}`,
  );
}
