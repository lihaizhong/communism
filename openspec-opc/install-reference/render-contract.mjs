import { createCanonicalResult, GATE_ORDER } from "./conformance-contract.mjs";

export const RESULT_SECTION_ORDER = [
  "overall_result",
  "execution_path",
  "gate_results",
  "profile_smoke",
  "written_changes",
  "next_actions",
  "artifact_paths",
];

export const REPORT_SECTION_ORDER = [
  "overall_result",
  "execution_path",
  "gate_results",
  "profile_smoke",
  "written_changes",
  "next_actions",
  "artifact_paths",
  "raw_details",
];

function renderList(items, fallback = "none") {
  if (!items || items.length === 0) {
    return [`- ${fallback}`];
  }
  return items.map((item) => `- ${item}`);
}

function renderProfileSmoke(smoke = {}) {
  const details = [smoke.command, smoke.summary, ...(smoke.artifacts || [])].filter(Boolean);
  if (!smoke?.label && !smoke?.status) {
    return ["- none"];
  }
  return [`- ${smoke.label}: ${smoke.status}${details.length > 0 ? ` | ${details.join(" | ")}` : ""}`];
}

export function toRenderView(input) {
  const result = createCanonicalResult(input);

  // canonical result -> shared render view -> terminal/report/plain text
  //       fixed state/gate order        -> no renderer-specific state drift
  return {
    title: "OpenSpec OPC install result",
    stateLine: `overall result: ${result.state}`,
    executionPathLine:
      `execution path: ${result.executionPath}` +
      (result.laneId ? ` (${result.laneId}${result.laneProfile ? `/${result.laneProfile}` : ""})` : ""),
    gateLines: result.gates.map((gate) => {
      const detail = gate.command ? ` | ${gate.command}` : "";
      return `- ${gate.id}: ${gate.status}${detail}`;
    }),
    profileSmokeLines: renderProfileSmoke(result.profileSmoke),
    writtenChangeLines: renderList(result.writtenChanges),
    nextActionLines: renderList(result.nextActions),
    artifactLines: renderList(
      [
        result.artifacts.reportPath ? `human report: ${result.artifacts.reportPath}` : "",
        result.artifacts.jsonPath ? `machine json: ${result.artifacts.jsonPath}` : "",
      ].filter(Boolean),
    ),
    rawDetailLines: renderList(result.rawDetails),
  };
}

export function renderTerminalResultCard(input) {
  const view = toRenderView(input);
  return [
    view.title,
    view.stateLine,
    view.executionPathLine,
    "gate results:",
    ...view.gateLines,
    "profile smoke:",
    ...view.profileSmokeLines,
    "written changes:",
    ...view.writtenChangeLines,
    "next actions:",
    ...view.nextActionLines,
    "artifact paths:",
    ...view.artifactLines,
  ].join("\n");
}

export function renderHumanReport(input) {
  const view = toRenderView(input);
  return [
    "# OpenSpec OPC Install Report",
    "",
    "## Overall Result",
    view.stateLine,
    "",
    "## Execution Path",
    view.executionPathLine,
    "",
    "## Gate Results",
    ...view.gateLines,
    "",
    "## Profile Smoke",
    ...view.profileSmokeLines,
    "",
    "## Written Changes",
    ...view.writtenChangeLines,
    "",
    "## Next Actions",
    ...view.nextActionLines,
    "",
    "## Artifact Paths",
    ...view.artifactLines,
    "",
    "## Raw Details",
    ...view.rawDetailLines,
  ].join("\n");
}

export function renderPlainTextReport(input) {
  return renderHumanReport(input);
}

export function assertFixedGateOrder(input) {
  return toRenderView(input).gateLines.map((line) => line.split(":")[0].replace("- ", "")).join(",") === GATE_ORDER.join(",");
}
