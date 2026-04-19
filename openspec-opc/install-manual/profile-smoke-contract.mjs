import { isRealConformanceCommand, resolveNodeTsProfile } from "./lane-registry.mjs";

export const PROFILE_SMOKE_STATUSES = ["ready", "missing", "not_applicable", "ambiguous", "unresolved"];
export const PROFILE_SMOKE_RESULT_STATUSES = ["passed", "failed", "missing", "not_run", "not_applicable"];

const PROFILE_SMOKE_DEFINITIONS = {
  app: {
    id: "app-page-smoke",
    label: "frontend page smoke",
    kind: "page",
    scriptCandidates: ["smoke:app", "smoke", "test:smoke"],
    trigger: "run after lint, test, and typecheck all pass",
    successCriteria: [
      "start the local frontend preview or equivalent app shell target",
      "open one local page or static entrypoint",
      "assert one core UI/root marker is present before exiting 0",
    ],
    failureSemantics: [
      "exit non-zero when the page cannot open",
      "exit non-zero when the root marker or first interactive shell is missing",
      "report a short summary that can be copied into the conformance result bundle",
    ],
    reportContract: {
      section: "profile_smoke",
      resultStatusValues: PROFILE_SMOKE_RESULT_STATUSES,
      requiredFields: ["id", "label", "status", "summary"],
      optionalFields: ["command", "artifacts"],
    },
  },
  service: {
    id: "service-api-smoke",
    label: "service API smoke",
    kind: "api",
    scriptCandidates: ["smoke:service", "smoke", "test:smoke"],
    trigger: "run after lint, test, and typecheck all pass",
    successCriteria: [
      "boot the local service entrypoint or equivalent runtime shell",
      "call one health or success-path endpoint",
      "assert a 2xx response or an explicit success payload before exiting 0",
    ],
    failureSemantics: [
      "exit non-zero when the service fails to boot",
      "exit non-zero when no health/success endpoint responds correctly",
      "report a short summary that can be copied into the conformance result bundle",
    ],
    reportContract: {
      section: "profile_smoke",
      resultStatusValues: PROFILE_SMOKE_RESULT_STATUSES,
      requiredFields: ["id", "label", "status", "summary"],
      optionalFields: ["command", "artifacts"],
    },
  },
};

function firstRealScript(scripts = {}, candidates = []) {
  for (const scriptName of candidates) {
    const command = scripts?.[scriptName];
    if (isRealConformanceCommand(command)) {
      return {
        scriptName,
        command,
        runCommand: `npm run ${scriptName}`,
      };
    }
  }
  return null;
}

export function planNodeTsProfileSmoke(snapshot = {}) {
  const packageJson = snapshot.packageJson || {};
  const profileResolution = snapshot.profileResolution || resolveNodeTsProfile(snapshot);

  if (profileResolution.status === "ambiguous") {
    return {
      status: "ambiguous",
      profile: "",
      smokeTest: null,
      reasons: profileResolution.reasons || [],
      candidates: profileResolution.candidates || [],
    };
  }

  if (profileResolution.status !== "resolved") {
    return {
      status: "unresolved",
      profile: "",
      smokeTest: null,
      reasons: profileResolution.reasons || [],
      candidates: profileResolution.candidates || [],
    };
  }

  const profile = profileResolution.profile;
  if (profile === "library") {
    return {
      status: "not_applicable",
      profile,
      smokeTest: null,
      reasons: ["library profile does not require a runtime smoke contract"],
      candidates: [profile],
    };
  }

  const definition = PROFILE_SMOKE_DEFINITIONS[profile];
  const scriptMatch = firstRealScript(packageJson.scripts || {}, definition?.scriptCandidates || []);

  if (!definition) {
    return {
      status: "unresolved",
      profile,
      smokeTest: null,
      reasons: [`no smoke contract is defined for profile ${profile}`],
      candidates: [profile],
    };
  }

  return {
    status: scriptMatch ? "ready" : "missing",
    profile,
    candidates: [profile],
    reasons: scriptMatch ? [] : [`missing one of the required smoke scripts: ${definition.scriptCandidates.join(", ")}`],
    smokeTest: {
      id: definition.id,
      label: definition.label,
      kind: definition.kind,
      trigger: definition.trigger,
      command: scriptMatch?.runCommand || "",
      commandSource: scriptMatch?.scriptName || "",
      successCriteria: definition.successCriteria,
      failureSemantics: definition.failureSemantics,
      reportContract: definition.reportContract,
    },
  };
}
