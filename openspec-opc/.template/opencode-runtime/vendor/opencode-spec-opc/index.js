import fs from "node:fs/promises"
import path from "node:path"

const DEFAULT_OPTIONS = {
  failClosed: true,
  allowDocWrites: true,
  allowConfigWrites: true,
  applyLockTtlMs: 30 * 60 * 1000,
}

const sessionSelections = new Map()

const SPEC_CHANGE_ROOT = "openspec/changes"
const BUGFIX_ROOT = "openspec/bugs"
const ARCHIVE_SEGMENT = "/archive/"
const APPLY_STATE_PATH = "openspec/.opencode-spec-opc-state.json"
const TEST_PATH_MARKERS = ["/test/", "/tests/", "__tests__", ".spec.", ".test.", "regression-test"]

const DOC_SAFE_PREFIXES = ["openspec/"]
const CONFIG_SAFE_PREFIXES = [".opencode/"]

const DOC_SAFE_EXACT = new Set(["AGENTS.md", "CLAUDE.md"])
const CONFIG_SAFE_EXACT = new Set(["opencode.json", ".opencode/opencode.json"])

const MUTATING_BASH_PATTERN =
  /(^|\s)(rm|mv|cp|mkdir|touch|chmod|chown|sed\s+-i|perl\s+-i|tee|install|git\s+commit|git\s+add|git\s+mv|npm\s+install|npm\s+uninstall|pnpm\s+add|pnpm\s+remove|pnpm\s+install|yarn\s+add|yarn\s+remove|yarn\s+install|bun\s+add|bun\s+remove|bun\s+install)(\s|$)|>>?|(^|\s)cat\s+.*>>?/i

function normalizePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").replace(/^\.\/+/, "")
}

function classifyPath(filePath) {
  const normalized = normalizePath(filePath)
  if (!normalized) return "unknown"
  if (normalized === APPLY_STATE_PATH) return "state"
  if (TEST_PATH_MARKERS.some((marker) => normalized.includes(marker))) return "test"
  if (isLikelyTestFilename(normalized)) return "test"
  if (normalized.startsWith("openspec/")) return "doc"
  if (normalized.startsWith(".opencode/")) return "config"
  if (normalized === "AGENTS.md" || normalized === "CLAUDE.md" || normalized === "opencode.json") return "config"
  return "source"
}

function isLikelyTestFilename(filePath) {
  return /(^|\/)(test|tests)\b|(\.|-)(spec|test)\.[^.]+$/i.test(filePath)
}

function getSessionId(input) {
  return input?.sessionID || input?.sessionId || input?.session_id || "unknown"
}

function isAlwaysAllowedPath(filePath, options) {
  const normalized = normalizePath(filePath)
  if (!normalized) return false
  if (options.allowDocWrites) {
    if (DOC_SAFE_EXACT.has(normalized)) return true
    if (DOC_SAFE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true
  }

  if (options.allowConfigWrites) {
    if (CONFIG_SAFE_EXACT.has(normalized)) return true
    if (CONFIG_SAFE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true
  }

  return false
}

function parsePatchPaths(patchText) {
  const text = String(patchText || "")
  const matches = text.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)
  return Array.from(matches, (match) => normalizePath(match[1]))
}

function extractSelectionFromCommand(command) {
  const value = String(command || "")
  let match = value.match(/--change\s+["']?([a-zA-Z0-9._-]+)["']?/)
  if (match) return { kind: "change", name: match[1] }

  match = value.match(/--bugfix\s+["']?([a-zA-Z0-9._-]+)["']?/)
  if (match) return { kind: "bugfix", name: match[1] }

  match = value.match(/openspec\/changes\/([a-zA-Z0-9._-]+)\//)
  if (match) return { kind: "change", name: match[1] }

  match = value.match(/openspec\/bugs\/([a-zA-Z0-9._-]+)\//)
  if (match) return { kind: "bugfix", name: match[1] }

  return null
}

function extractSelectionFromFile(filePath) {
  const normalized = normalizePath(filePath)
  let match = normalized.match(/^openspec\/changes\/([^/]+)\//)
  if (match && !normalized.includes(ARCHIVE_SEGMENT)) {
    return { kind: "change", name: match[1] }
  }

  match = normalized.match(/^openspec\/bugs\/([^/]+)\//)
  if (match && !normalized.includes(ARCHIVE_SEGMENT)) {
    return { kind: "bugfix", name: match[1] }
  }

  return null
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readApplyState(rootDir) {
  const statePath = path.join(rootDir, APPLY_STATE_PATH)
  if (!(await exists(statePath))) return null

  try {
    const raw = await fs.readFile(statePath, "utf8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function listWorkItems(rootDir, rootRelative, kind, requiredFiles) {
  const root = path.join(rootDir, rootRelative)
  if (!(await exists(root))) return []

  const entries = await fs.readdir(root, { withFileTypes: true })
  const items = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name === "archive") continue

    const dir = path.join(root, entry.name)
    if (!(await exists(path.join(dir, ".openspec.yaml")))) continue

    const missing = []
    for (const file of requiredFiles) {
      if (!(await exists(path.join(dir, file)))) {
        missing.push(file)
      }
    }

    const tasksSummary = await summarizeTasks(path.join(dir, "tasks.md"))
    items.push({
      kind,
      name: entry.name,
      dir,
      relativeDir: `${rootRelative}/${entry.name}`,
      ready: missing.length === 0,
      missing,
      tasksSummary,
    })
  }

  return items
}

async function summarizeTasks(tasksPath) {
  if (!(await exists(tasksPath))) {
    return { total: 0, remaining: 0, complete: 0 }
  }

  const content = await fs.readFile(tasksPath, "utf8")
  const complete = (content.match(/^- \[x\]/gim) || []).length
  const remaining = (content.match(/^- \[ \]/gim) || []).length
  return {
    total: complete + remaining,
    complete,
    remaining,
  }
}

async function collectWorkflowState(rootDir) {
  const changes = await listWorkItems(rootDir, SPEC_CHANGE_ROOT, "change", [
    "proposal.md",
    "design.md",
    "tasks.md",
  ])

  const bugfixes = await listWorkItems(rootDir, BUGFIX_ROOT, "bugfix", [
    "bug-report.md",
    "fix.md",
  ])

  const readyItems = [...changes, ...bugfixes].filter((item) => item.ready)
  return {
    changes,
    bugfixes,
    readyItems,
  }
}

function rememberSelection(sessionId, selection) {
  if (!selection?.name) return
  sessionSelections.set(sessionId, {
    ...selection,
    updatedAt: Date.now(),
  })
}

function resolveTargetPaths(tool, args) {
  if (tool === "edit" || tool === "write") {
    return [normalizePath(args?.filePath)]
  }

  if (tool === "apply_patch") {
    return parsePatchPaths(args?.patchText)
  }

  return []
}

function isToolMutation(tool, args) {
  if (tool === "edit" || tool === "write" || tool === "apply_patch") return true
  if (tool !== "bash") return false
  return MUTATING_BASH_PATTERN.test(String(args?.command || ""))
}

function buildDenyMessage(state, selection) {
  const readySummary =
    state.readyItems.length === 0
      ? "No apply-ready OpenSpec work item was found."
      : `Apply-ready items: ${state.readyItems.map((item) => `${item.kind}:${item.name}`).join(", ")}.`

  const selectionSummary = selection
    ? `Current session selection: ${selection.kind}:${selection.name}.`
    : "Current session selection: none."

  return [
    "[opencode-spec-opc] Blocked by OpenSpec runtime guard.",
    "Business code writes are only allowed after the workflow is apply-ready.",
    readySummary,
    selectionSummary,
    "Next step: create/specify a single active change or bugfix, finish proposal/design/tasks (or bug-report/fix), then continue via /opsx-apply.",
  ].join(" ")
}

function buildApplyStateMessage(state, selection, applyState, sessionId) {
  const readySummary =
    state.readyItems.length === 0
      ? "No apply-ready OpenSpec work item was found."
      : `Apply-ready items: ${state.readyItems.map((item) => `${item.kind}:${item.name}`).join(", ")}.`

  const selectionSummary = selection
    ? `Current session selection: ${selection.kind}:${selection.name}.`
    : "Current session selection: none."

  const stateSummary = applyState
    ? `Guard state file exists for ${applyState.kind}:${applyState.name} in session ${applyState.sessionId || "unknown"}.`
    : "Guard state file is missing."

  const commandHint = selection?.kind === "bugfix" ? "/opsx-bugfix" : "/opsx-apply"

  return [
    "[opencode-spec-opc] Blocked by OpenSpec runtime guard.",
    "Business code writes require an explicit /opsx-apply session lock.",
    readySummary,
    selectionSummary,
    stateSummary,
    `Current runtime session: ${sessionId}.`,
    `Next step: rerun ${commandHint} for this work item so it refreshes ${APPLY_STATE_PATH}, then continue implementation in the same session.`,
  ].join(" ")
}

function buildExpiredApplyStateMessage(selection, applyState, sessionId, options) {
  const commandHint = selection?.kind === "bugfix" ? "/opsx-bugfix" : "/opsx-apply"
  return [
    "[opencode-spec-opc] Blocked by OpenSpec runtime guard.",
    "The explicit apply lock has expired.",
    `Current runtime session: ${sessionId}.`,
    `Lock TTL: ${options.applyLockTtlMs}ms.`,
    `Last lock refresh: ${applyState?.updatedAt || "unknown"}.`,
    `Next step: rerun ${commandHint} for this work item so it refreshes ${APPLY_STATE_PATH}, then continue implementation in the same session.`,
  ].join(" ")
}

function buildCompletedTasksLockMessage(selection) {
  const commandHint = selection?.kind === "bugfix" ? "/opsx-bugfix" : "/opsx-apply"
  return [
    "[opencode-spec-opc] Blocked by OpenSpec runtime guard.",
    "The explicit apply lock is no longer valid because all tracked tasks are already complete.",
    `Next step: review whether implementation is actually done, or rerun ${commandHint} only after updating tasks to reflect remaining work.`,
  ].join(" ")
}

function buildPhaseViolationMessage(phase, filePath) {
  const normalized = normalizePath(filePath)
  const kind = classifyPath(normalized)
  return [
    "[opencode-spec-opc] Blocked by OpenSpec runtime guard.",
    `Current phase: ${phase}.`,
    `Target path: ${normalized}.`,
    `Target classification: ${kind}.`,
    phase === "red"
      ? "Red phase may only write tests and workflow documents."
      : phase === "green"
        ? "Green phase may write implementation code, but should not rewrite tests."
        : "Verify phase may not write business code.",
  ].join(" ")
}

function buildPhaseSessionMessage(phase, sessionId, applyState) {
  return [
    "[opencode-spec-opc] Blocked by OpenSpec runtime guard.",
    `Current phase: ${phase}.`,
    `Current runtime session: ${sessionId}.`,
    `Recorded phase sessions: red=${applyState?.redSessionId || "unset"}, green=${applyState?.greenSessionId || "unset"}, verify=${applyState?.verifySessionId || "unset"}.`,
    "Each phase must run in a different subagent session.",
  ].join(" ")
}

function isApplyStateExpired(applyState, options) {
  if (!applyState?.updatedAt) return true
  const timestamp = Date.parse(applyState.updatedAt)
  if (Number.isNaN(timestamp)) return true
  return Date.now() - timestamp > options.applyLockTtlMs
}

function hasDistinctPhaseSessions(applyState) {
  const red = applyState?.redSessionId
  const green = applyState?.greenSessionId
  const verify = applyState?.verifySessionId
  const present = [red, green, verify].filter(Boolean)
  return new Set(present).size === present.length
}

function isValidPhaseSession(phase, sessionId, applyState) {
  if (phase === "red") return applyState?.redSessionId === sessionId
  if (phase === "green") return applyState?.greenSessionId === sessionId
  if (phase === "verify") return applyState?.verifySessionId === sessionId
  return false
}

function enforcePhasePathRules(phase, targetPaths) {
  for (const filePath of targetPaths) {
    const kind = classifyPath(filePath)
    if (kind === "doc" || kind === "config" || kind === "state") continue
    if (phase === "red" && kind !== "test") {
      throw new Error(buildPhaseViolationMessage(phase, filePath))
    }
    if (phase === "green" && kind === "test") {
      throw new Error(buildPhaseViolationMessage(phase, filePath))
    }
    if (phase === "verify" && (kind === "test" || kind === "source")) {
      throw new Error(buildPhaseViolationMessage(phase, filePath))
    }
  }
}

async function enforceWorkflow(rootDir, tool, args, options, input) {
  if (!isToolMutation(tool, args)) return

  const targetPaths = resolveTargetPaths(tool, args)
  if (targetPaths.length > 0 && targetPaths.every((filePath) => isAlwaysAllowedPath(filePath, options))) {
    return
  }

  const state = await collectWorkflowState(rootDir)
  const sessionId = getSessionId(input)
  const selection = sessionSelections.get(sessionId)
  const applyState = await readApplyState(rootDir)

  if (!options.failClosed && state.readyItems.length === 0) {
    return
  }

  if (!selection) {
    throw new Error(buildDenyMessage(state, null))
  }

  const active = state.readyItems.find(
    (item) => item.kind === selection.kind && item.name === selection.name,
  )

  if (!active) {
    throw new Error(buildDenyMessage(state, selection))
  }

  const hasApplyLock =
    applyState &&
    applyState.mode === "apply" &&
    applyState.kind === selection.kind &&
    applyState.name === selection.name &&
    applyState.sessionId === sessionId

  if (!hasApplyLock) {
    throw new Error(buildApplyStateMessage(state, selection, applyState, sessionId))
  }

  if (isApplyStateExpired(applyState, options)) {
    throw new Error(buildExpiredApplyStateMessage(selection, applyState, sessionId, options))
  }

  if (active.tasksSummary.total > 0 && active.tasksSummary.remaining === 0) {
    throw new Error(buildCompletedTasksLockMessage(selection))
  }

  const phase = applyState.phase || "green"
  if (!isValidPhaseSession(phase, sessionId, applyState) || !hasDistinctPhaseSessions(applyState)) {
    throw new Error(buildPhaseSessionMessage(phase, sessionId, applyState))
  }

  enforcePhasePathRules(phase, targetPaths)
}

function maybeCaptureSelection(input, outputArgs) {
  const sessionId = getSessionId(input)
  const tool = input?.tool

  if (tool === "bash") {
    rememberSelection(sessionId, extractSelectionFromCommand(outputArgs?.command))
    return
  }

  if (tool === "edit" || tool === "write") {
    rememberSelection(sessionId, extractSelectionFromFile(outputArgs?.filePath))
    return
  }

  if (tool === "apply_patch") {
    for (const filePath of parsePatchPaths(outputArgs?.patchText)) {
      const selection = extractSelectionFromFile(filePath)
      if (selection) {
        rememberSelection(sessionId, selection)
        return
      }
    }
  }
}

export function createOpenSpecOPCPlugin(userOptions = {}) {
  const options = {
    ...DEFAULT_OPTIONS,
    ...userOptions,
  }

  return async function OpenSpecOPCPlugin(ctx) {
    const rootDir = ctx.worktree || ctx.directory || process.cwd()

    return {
      "tool.execute.before": async (input, output) => {
        maybeCaptureSelection(input, output?.args)
        await enforceWorkflow(rootDir, input?.tool, output?.args || {}, options, input)
      },

      "tool.execute.after": async (input, output) => {
        maybeCaptureSelection(input, output?.args)
      },

      "experimental.session.compacting": async (input, output) => {
        const selection = sessionSelections.get(getSessionId(input))
        if (!selection) return

        output.context.push([
          "## OpenSpec OPC Guard State",
          `- selected_work_item: ${selection.kind}:${selection.name}`,
          `- apply_state_file: ${APPLY_STATE_PATH}`,
          `- apply_lock_ttl_ms: ${options.applyLockTtlMs}`,
          "- invariant: do not mutate business code until the selected work item is apply-ready",
          "- invariant: do not mutate business code until /opsx-apply refreshes the apply state file for this session",
          "- invariant: do not mutate business code if the apply lock is expired or all tracked tasks are already complete",
          "- invariant: red, green, verify phases must use different session ids",
          "- invariant: red writes tests, green writes implementation, verify does not write business code",
          "- invariant: spec/config/doc writes under openspec/ and .opencode/ remain allowed",
        ].join("\n"))
      },
    }
  }
}

export const OpenSpecOPCPlugin = createOpenSpecOPCPlugin()
