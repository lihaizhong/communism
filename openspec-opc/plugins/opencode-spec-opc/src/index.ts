import {
  assertPhaseEntryAllowed,
  assertPhasePathAllowed,
  buildApplyLockExpiredDecision,
  buildApplyLockMissingDecision,
  buildApplyReadyFailureDecision,
  buildPhaseSessionDecision,
  buildTasksAlreadyCompleteDecision,
  DEFAULT_GUARD_CONFIG,
  classifyPath as classifyCorePath,
  hasDistinctPhaseSessions,
  isApplyStateExpired,
  isValidPhaseSession,
  normalizePath as normalizeCorePath,
  renderDecision,
  shouldRecordVerifyCommand,
} from "@openspec-opc/guard-core/guard-engine"
import {
  APPLY_STATE_PATH,
  extractSelectionFromFile,
  reconcileApplyState,
  readApplyState,
  writeApplyState,
} from "@openspec-opc/guard-core/state-io"
import {
  captureSelectionFromPaths,
  isAlwaysAllowedPath,
  isToolMutation,
  resolveTargetPaths,
} from "@openspec-opc/guard-core/tooling"
import { collectWorkflowState } from "@openspec-opc/guard-core/workflow-state"

export interface OpenCodeLikeInput {
  tool?: string
  sessionID?: string
  sessionId?: string
  session_id?: string
}

export interface OpenCodeLikeArgs {
  filePath?: string
  patchText?: string
  command?: string
}

export interface OpenCodeLikeOutput {
  args?: OpenCodeLikeArgs
  context: string[]
}

export interface OpenCodeAdapterOptions {
  failClosed?: boolean
  allowDocWrites?: boolean
  allowConfigWrites?: boolean
  applyLockTtlMs?: number
}

export interface OpenCodeSelection {
  kind: "change" | "bugfix"
  name: string
  updatedAt?: number
}

export interface OpenCodePluginContext {
  worktree?: string
  directory?: string
}

export interface OpenCodePluginHooks {
  "tool.execute.before": (input: OpenCodeLikeInput, output: OpenCodeLikeOutput) => Promise<void>
  "tool.execute.after": (input: OpenCodeLikeInput, output: OpenCodeLikeOutput) => Promise<void>
  "experimental.session.compacting": (input: OpenCodeLikeInput, output: OpenCodeLikeOutput) => Promise<void>
}

const DEFAULT_OPTIONS: Required<OpenCodeAdapterOptions> = {
  failClosed: true,
  allowDocWrites: true,
  allowConfigWrites: true,
  applyLockTtlMs: 30 * 60 * 1000,
}

const sessionSelections = new Map<string, OpenCodeSelection>()

function getSessionId(input: OpenCodeLikeInput | null | undefined): string {
  return input?.sessionID || input?.sessionId || input?.session_id || "unknown"
}

function extractSelectionFromCommand(command: string | null | undefined): OpenCodeSelection | null {
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

function normalizePath(filePath: string | null | undefined): string {
  return normalizeCorePath(filePath)
}

function classifyPath(filePath: string | null | undefined): string {
  return classifyCorePath(normalizePath(filePath), APPLY_STATE_PATH)
}

function rememberSelection(sessionId: string, selection: OpenCodeSelection | null): void {
  if (!selection?.name) return
  sessionSelections.set(sessionId, {
    ...selection,
    updatedAt: Date.now(),
  })
}

function buildDenyMessage(state: Awaited<ReturnType<typeof collectWorkflowState>>, selection: OpenCodeSelection | null): string {
  const selectedItem = selection
    ? [...state.changes, ...state.bugfixes].find((item) => item.kind === selection.kind && item.name === selection.name)
    : null
  const readyItems =
    state.readyItems.length === 0 ? [] : state.readyItems.map((item) => `${item.kind}:${item.name}`)
  const failedGates = selectedItem?.quality?.failures?.length ? selectedItem.quality.failures : []
  return renderDecision(
    buildApplyReadyFailureDecision({
      currentSelection: selection ? `${selection.kind}:${selection.name}` : null,
      applyReadyItems: readyItems,
      failedGates,
    }),
  )
}

function buildApplyStateMessage(
  state: Awaited<ReturnType<typeof collectWorkflowState>>,
  selection: OpenCodeSelection | null,
  applyState: Awaited<ReturnType<typeof readApplyState>>,
  sessionId: string,
): string {
  const commandHint = selection?.kind === "bugfix" ? "/opsx-bugfix" : "/opsx-apply"
  return renderDecision(
    buildApplyLockMissingDecision({
      sessionId,
      currentSelection: selection ? `${selection.kind}:${selection.name}` : null,
      applyReadyItems: state.readyItems.map((item) => `${item.kind}:${item.name}`),
      stateFileSummary: applyState
        ? `state_file=${applyState.kind}:${applyState.name} session=${applyState.sessionId || "unknown"}`
        : "state_file=missing",
      commandHint,
      applyStatePath: APPLY_STATE_PATH,
    }),
  )
}

function buildExpiredApplyStateMessage(
  selection: OpenCodeSelection | null,
  applyState: Awaited<ReturnType<typeof readApplyState>>,
  sessionId: string,
  options: Required<OpenCodeAdapterOptions>,
): string {
  const commandHint = selection?.kind === "bugfix" ? "/opsx-bugfix" : "/opsx-apply"
  return renderDecision(
    buildApplyLockExpiredDecision({
      sessionId,
      lastLockRefresh: applyState?.updatedAt || "unknown",
      lockTtlMs: options.applyLockTtlMs,
      commandHint,
      applyStatePath: APPLY_STATE_PATH,
    }),
  )
}

function buildCompletedTasksLockMessage(selection: OpenCodeSelection | null): string {
  const commandHint = selection?.kind === "bugfix" ? "/opsx-bugfix" : "/opsx-apply"
  return renderDecision(buildTasksAlreadyCompleteDecision(commandHint))
}

function buildPhaseSessionMessage(
  phase: "red" | "green" | "verify",
  sessionId: string,
  applyState: NonNullable<Awaited<ReturnType<typeof readApplyState>>>,
): string {
  return renderDecision(
    buildPhaseSessionDecision({
      phase,
      sessionId,
      redSessionId: applyState.redSessionId,
      greenSessionId: applyState.greenSessionId,
      verifySessionId: applyState.verifySessionId,
    }),
  )
}

async function maybeRecordPhaseEvidence(
  rootDir: string,
  input: OpenCodeLikeInput,
  args: OpenCodeLikeArgs,
): Promise<void> {
  const tool = input?.tool
  const sessionId = getSessionId(input)
  const selection = sessionSelections.get(sessionId)
  if (!selection) return

  const applyState = await readApplyState(rootDir)
  if (!applyState) return
  if (applyState.mode !== "apply") return
  if (applyState.kind !== selection.kind || applyState.name !== selection.name) return
  if (applyState.sessionId !== sessionId) return

  const phase = applyState.phase || "green"
  const phaseEvidence = {
    redTouchedTestFiles: [...new Set(applyState.phaseEvidence?.redTouchedTestFiles || [])],
    greenTouchedImplFiles: [...new Set(applyState.phaseEvidence?.greenTouchedImplFiles || [])],
    verifyCommands: [...new Set(applyState.phaseEvidence?.verifyCommands || [])],
  }

  let changed = false
  const targetPaths = resolveTargetPaths(tool, args)
  if (phase === "red") {
    for (const filePath of targetPaths) {
      if (classifyPath(filePath) === "test" && !phaseEvidence.redTouchedTestFiles.includes(filePath)) {
        phaseEvidence.redTouchedTestFiles.push(filePath)
        changed = true
      }
    }
  }

  if (phase === "green") {
    for (const filePath of targetPaths) {
      if (classifyPath(filePath) === "source" && !phaseEvidence.greenTouchedImplFiles.includes(filePath)) {
        phaseEvidence.greenTouchedImplFiles.push(filePath)
        changed = true
      }
    }
  }

  if (phase === "verify" && tool === "bash") {
    const command = String(args?.command || "").trim()
    if (shouldRecordVerifyCommand(command, DEFAULT_GUARD_CONFIG) && !phaseEvidence.verifyCommands.includes(command)) {
      phaseEvidence.verifyCommands.push(command)
      changed = true
    }
  }

  if (!changed) return
  await writeApplyState(rootDir, {
    ...applyState,
    phaseEvidence,
  })
}

async function enforceWorkflow(
  rootDir: string,
  tool: string | undefined,
  args: OpenCodeLikeArgs,
  options: Required<OpenCodeAdapterOptions>,
  input: OpenCodeLikeInput,
): Promise<void> {
  if (!isToolMutation(tool, args)) return

  const targetPaths = resolveTargetPaths(tool, args)
  const allPathsAlwaysAllowed =
    targetPaths.length > 0 && targetPaths.every((filePath) => isAlwaysAllowedPath(filePath, options))

  const state = await collectWorkflowState(rootDir)
  const sessionId = getSessionId(input)
  const selection = sessionSelections.get(sessionId) || null
  const applyState = await reconcileApplyState(rootDir, await readApplyState(rootDir), state)

  const hasActiveApplySelection =
    selection &&
    applyState &&
    applyState.mode === "apply" &&
    applyState.kind === selection.kind &&
    applyState.name === selection.name &&
    applyState.sessionId === sessionId

  if (allPathsAlwaysAllowed) return
  if (!options.failClosed && state.readyItems.length === 0) return
  if (!selection) throw new Error(buildDenyMessage(state, null))

  const active = state.readyItems.find((item) => item.kind === selection.kind && item.name === selection.name)
  if (!active) throw new Error(buildDenyMessage(state, selection))

  const hasApplyLock =
    applyState &&
    applyState.mode === "apply" &&
    applyState.kind === selection.kind &&
    applyState.name === selection.name &&
    applyState.sessionId === sessionId

  if (!hasApplyLock) {
    throw new Error(buildApplyStateMessage(state, selection, applyState, sessionId))
  }

  if (isApplyStateExpired(applyState.updatedAt, options.applyLockTtlMs)) {
    throw new Error(buildExpiredApplyStateMessage(selection, applyState, sessionId, options))
  }

  if (active.tasksSummary.total > 0 && active.tasksSummary.remaining === 0) {
    throw new Error(buildCompletedTasksLockMessage(selection))
  }

  const phase = applyState.phase || "green"
  if (
    !isValidPhaseSession(phase, sessionId, applyState) ||
    !hasDistinctPhaseSessions({
      redSessionId: applyState.redSessionId,
      greenSessionId: applyState.greenSessionId,
      verifySessionId: applyState.verifySessionId,
    })
  ) {
    throw new Error(buildPhaseSessionMessage(phase, sessionId, applyState))
  }

  const phaseEntryDecision = assertPhaseEntryAllowed(
    phase,
    targetPaths,
    applyState.phaseEvidence || {},
    APPLY_STATE_PATH,
  )
  if (phaseEntryDecision) throw new Error(renderDecision(phaseEntryDecision))

  const phasePathDecision = assertPhasePathAllowed(phase, targetPaths, APPLY_STATE_PATH)
  if (phasePathDecision) throw new Error(renderDecision(phasePathDecision))
}

function maybeCaptureSelection(input: OpenCodeLikeInput, outputArgs: OpenCodeLikeArgs): void {
  const sessionId = getSessionId(input)
  const selection =
    input?.tool === "bash"
      ? extractSelectionFromCommand(outputArgs?.command)
      : input?.tool === "edit" || input?.tool === "write"
        ? extractSelectionFromFile(outputArgs?.filePath)
        : captureSelectionFromPaths(input?.tool, outputArgs || {})
  if (selection) rememberSelection(sessionId, selection)
}

export function createOpenSpecOPCPlugin(userOptions: OpenCodeAdapterOptions = {}) {
  const options: Required<OpenCodeAdapterOptions> = {
    ...DEFAULT_OPTIONS,
    ...userOptions,
  }

  return async function OpenSpecOPCPlugin(ctx: OpenCodePluginContext): Promise<OpenCodePluginHooks> {
    const rootDir = ctx.worktree || ctx.directory || process.cwd()

    return {
      "tool.execute.before": async (input, output) => {
        maybeCaptureSelection(input, output?.args || {})
        await enforceWorkflow(rootDir, input?.tool, output?.args || {}, options, input)
      },

      "tool.execute.after": async (input, output) => {
        maybeCaptureSelection(input, output?.args || {})
        await maybeRecordPhaseEvidence(rootDir, input, output?.args || {})
      },

      "experimental.session.compacting": async (input, output) => {
        const selection = sessionSelections.get(getSessionId(input))
        if (!selection) return

        output.context.push(
          [
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
          ].join("\n"),
        )
      },
    }
  }
}

export const OpenSpecOPCPlugin = createOpenSpecOPCPlugin()
