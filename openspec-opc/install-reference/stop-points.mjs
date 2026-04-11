export const STOP_POINT_ACTION_ORDER = ["recommended", "custom", "abort"];

export function createStopPoint(input) {
  const actions = {
    recommended: {
      label: input?.recommended?.label || "recommended",
      description: input?.recommended?.description || "",
    },
    custom: {
      label: input?.custom?.label || "custom",
      description: input?.custom?.description || "",
    },
    abort: {
      label: input?.abort?.label || "abort",
      description: input?.abort?.description || "",
    },
  };

  return {
    id: input?.id || "",
    title: input?.title || "",
    reason: input?.reason || "",
    actions,
  };
}

export function renderStopPoint(input) {
  const stopPoint = createStopPoint(input);

  // detection trigger -> shared stop-point contract -> chosen branch -> canonical result
  // same labels/order across entry sources so user recovery does not drift by stage
  return [
    stopPoint.title,
    `reason: ${stopPoint.reason}`,
    "actions:",
    ...STOP_POINT_ACTION_ORDER.map((key) => {
      const action = stopPoint.actions[key];
      return `- ${key}: ${action.label}${action.description ? ` | ${action.description}` : ""}`;
    }),
  ].join("\n");
}

export function createQualityStackStopPoint({ missingGates = [] } = {}) {
  return createStopPoint({
    id: "missing-quality-stack",
    title: "OpenSpec OPC installer paused",
    reason: `missing required Node/TS gates: ${missingGates.join(", ") || "unknown"}`,
    recommended: {
      label: "install recommended quality stack",
      description: "add the missing scripts/tools, refresh the snapshot, then rerun conformance",
    },
    custom: {
      label: "provide custom commands",
      description: "keep the lane but supply your own lint, test, and typecheck commands",
    },
    abort: {
      label: "abort install",
      description: "stop now without pretending the lane is complete",
    },
  });
}

export function createProfileResolutionStopPoint({ candidates = [] } = {}) {
  return createStopPoint({
    id: "ambiguous-node-ts-profile",
    title: "OpenSpec OPC installer needs profile confirmation",
    reason: `multiple Node/TS profiles match: ${candidates.join(", ") || "unknown"}`,
    recommended: {
      label: "choose detected best-fit profile",
      description: `confirm one of: ${candidates.join(", ") || "app, service, library"}`,
    },
    custom: {
      label: "override profile manually",
      description: "pick app, service, or library explicitly before lane execution",
    },
    abort: {
      label: "abort install",
      description: "stop instead of silently guessing the project shape",
    },
  });
}
