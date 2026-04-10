import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const REGISTRY_PATH = path.join(ROOT, "lanes", "registry.json");

const APP_MARKERS = ["react", "next", "vue", "nuxt", "@angular/core", "svelte", "@remix-run/react", "vite"];
const SERVICE_MARKERS = ["express", "fastify", "@nestjs/core", "koa", "hono", "elysia"];
const NON_CONFORMANCE_COMMAND_PATTERNS = [
  /\berror:\s*no test specified\b/i,
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bplaceholder\b/i,
  /\bstub\b/i,
  /\bmock\b/i,
  /待补充|未实现/,
];

function toSet(values = []) {
  return new Set(values.filter(Boolean));
}

function collectPackageNames(pkg = {}) {
  return toSet([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ]);
}

export function loadLaneRegistry(registryPath = REGISTRY_PATH) {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

export function getLaneDefinition(laneId, registry = loadLaneRegistry()) {
  return registry.lanes.find((lane) => lane.id === laneId) || null;
}

export function detectInstallerLane(snapshot = {}, registry = loadLaneRegistry()) {
  const files = toSet(snapshot.files || []);
  if (files.has("package.json")) {
    return {
      laneId: "node-ts",
      executionPath: getLaneDefinition("node-ts", registry)?.execution_path || "new_lane",
    };
  }

  return {
    laneId: "",
    executionPath: "legacy_fallback",
  };
}

export function resolveNodeTsProfile(snapshot = {}) {
  const packageJson = snapshot.packageJson || {};
  const packageNames = collectPackageNames(packageJson);
  const scripts = packageJson.scripts || {};
  const candidates = [];
  const reasons = [];

  const hasAppMarkers = APP_MARKERS.some((name) => packageNames.has(name));
  const hasServiceMarkers = SERVICE_MARKERS.some((name) => packageNames.has(name));
  const hasLibraryMarkers = Boolean(packageJson.exports || packageJson.main || packageJson.module || packageJson.types);

  if (hasAppMarkers || scripts.dev || scripts.build) {
    candidates.push("app");
    reasons.push("frontend framework or app-style scripts detected");
  }
  if (hasServiceMarkers || scripts.start || scripts["start:dev"]) {
    candidates.push("service");
    reasons.push("service runtime markers detected");
  }
  if (hasLibraryMarkers || (!hasAppMarkers && !hasServiceMarkers)) {
    candidates.push("library");
    reasons.push("library entrypoints or neutral package markers detected");
  }

  const uniqueCandidates = [...new Set(candidates)];
  if (uniqueCandidates.length === 1) {
    return {
      status: "resolved",
      profile: uniqueCandidates[0],
      candidates: uniqueCandidates,
      reasons,
    };
  }

  if (uniqueCandidates.length > 1) {
    return {
      status: "ambiguous",
      profile: "",
      candidates: uniqueCandidates,
      reasons,
    };
  }

  return {
    status: "unresolved",
    profile: "",
    candidates: [],
    reasons,
  };
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0) || "";
}

export function isRealConformanceCommand(command) {
  if (typeof command !== "string" || command.trim().length === 0) {
    return false;
  }
  return !NON_CONFORMANCE_COMMAND_PATTERNS.some((pattern) => pattern.test(command));
}

export function planNodeTsConformance(snapshot = {}) {
  const packageJson = snapshot.packageJson || {};
  const scripts = packageJson.scripts || {};
  const profileResolution = resolveNodeTsProfile(snapshot);

  const gates = [
    {
      id: "lint",
      command: firstNonEmpty(scripts.lint, scripts["lint:ci"]),
    },
    {
      id: "test",
      command: firstNonEmpty(scripts.test, scripts["test:unit"]),
    },
    {
      id: "typecheck",
      command: firstNonEmpty(scripts.typecheck, scripts["check:types"], scripts.tsc),
    },
  ].map((gate) => {
    const hasRealCommand = isRealConformanceCommand(gate.command);
    return {
      ...gate,
      command: hasRealCommand ? gate.command : "",
      status: hasRealCommand ? "not_run" : "missing",
    };
  });

  return {
    laneId: "node-ts",
    profileResolution,
    gates,
    missingGates: gates.filter((gate) => gate.status === "missing").map((gate) => gate.id),
  };
}
