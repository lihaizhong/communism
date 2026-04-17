import {
  assertPhaseEntryAllowed,
  assertPhasePathAllowed,
  buildApplyLockExpiredDecision,
  buildApplyLockMissingDecision,
  buildApplyReadyFailureDecision,
  buildPhaseSessionDecision,
  buildTasksAlreadyCompleteDecision,
  DEFAULT_GUARD_CONFIG,
  hasDistinctPhaseSessions,
  isApplyStateExpired,
  isValidPhaseSession,
  shouldRecordVerifyCommand,
} from "@openspec-opc/guard-core/guard-engine"
import {
  APPLY_STATE_PATH,
  extractSelectionFromFile,
  reconcileApplyState,
  readApplyState,
  writeApplyState,
} from "@openspec-opc/guard-core/state-io"
import { captureSelectionFromPaths, isAlwaysAllowedPath, isToolMutation, resolveTargetPaths } from "@openspec-opc/guard-core/tooling"
import type { ApplyState, GuardDecision, RuntimeGuardOptions, SessionSelection } from "@openspec-opc/guard-core/types"
import { collectWorkflowState } from "@openspec-opc/guard-core/workflow-state"
import type { ToolArgsLike } from "@openspec-opc/guard-core/tooling"

export interface CodexEventContext {
  rootDir: string
  sessionId: string
  tool?: string
  args?: ToolArgsLike
}

export interface CodexGuardContext extends CodexEventContext {
  selection: SessionSelection | null
  applyState: ApplyState | null
}

export interface CodexAdapterState {
  sessionSelections: Map<string, SessionSelection>
}

export interface CodexAdapterHooks {
  beforeMutation?: (context: CodexGuardContext) => Promise<GuardDecision | null>
  afterMutation?: (context: CodexGuardContext) => Promise<void>
  onSessionCompact?: (context: CodexGuardContext) => Promise<string[]>
}

export interface CodexAdapterContract {
  state: CodexAdapterState
  resolveSelection: (sessionId: string) => SessionSelection | null
  rememberSelection: (sessionId: string, selection: SessionSelection | null) => void
  beforeMutation: (context: CodexEventContext) => Promise<GuardDecision | null>
  afterMutation: (context: CodexEventContext) => Promise<void>
  onSessionCompact: (context: CodexEventContext) => Promise<string[]>
}

export function extractSelectionFromCommand(command: string | null | undefined): SessionSelection | null {
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

export function captureSelection(tool: string | undefined, outputArgs: ToolArgsLike): SessionSelection | null {
  if (tool === "bash") {
    return extractSelectionFromCommand(outputArgs?.command)
  }

  if (tool === "edit" || tool === "write") {
    return extractSelectionFromFile(outputArgs?.filePath)
  }

  return captureSelectionFromPaths(tool, outputArgs)
}

export function createCodexAdapter(
  hooks: CodexAdapterHooks = {},
  options: RuntimeGuardOptions = {},
): CodexAdapterContract {
  const state: CodexAdapterState = {
    sessionSelections: new Map<string, SessionSelection>(),
  }
  const resolvedOptions = {
    ...DEFAULT_GUARD_CONFIG,
    failClosed: true,
    allowDocWrites: true,
    allowConfigWrites: true,
    applyLockTtlMs: 30 * 60 * 1000,
    ...options,
  }

  function resolveSelection(sessionId: string): SessionSelection | null {
    return state.sessionSelections.get(sessionId) || null
  }

  function rememberSelection(sessionId: string, selection: SessionSelection | null): void {
    if (!selection) return
    state.sessionSelections.set(sessionId, {
      ...selection,
      updatedAt: Date.now(),
    })
  }

  async function buildGuardContext(
    context: CodexEventContext,
    applyStateOverride?: ApplyState | null,
  ): Promise<CodexGuardContext> {
    return {
      ...context,
      selection: resolveSelection(context.sessionId),
      applyState: typeof applyStateOverride === "undefined" ? await readApplyState(context.rootDir) : applyStateOverride,
    }
  }

  async function recordPhaseEvidence(context: CodexEventContext): Promise<void> {
    const selection = resolveSelection(context.sessionId)
    if (!selection) return

    const applyState = await readApplyState(context.rootDir)
    if (!applyState) return
    if (applyState.mode !== "apply") return
    if (applyState.kind !== selection.kind || applyState.name !== selection.name) return
    if (applyState.sessionId !== context.sessionId) return

    const phase = applyState.phase || "green"
    const phaseEvidence = {
      redTouchedTestFiles: [...new Set(applyState?.phaseEvidence?.redTouchedTestFiles || [])],
      greenTouchedImplFiles: [...new Set(applyState?.phaseEvidence?.greenTouchedImplFiles || [])],
      verifyCommands: [...new Set(applyState?.phaseEvidence?.verifyCommands || [])],
    }

    let changed = false
    const targetPaths = resolveTargetPaths(context.tool, context.args || {})
    const isTestPath = (filePath: string): boolean =>
      filePath.includes(".test.") ||
      filePath.includes(".spec.") ||
      filePath.includes("/test/") ||
      filePath.includes("/tests/")

    if (phase === "red") {
      for (const filePath of targetPaths) {
        if (filePath && isTestPath(filePath)) {
          if (!phaseEvidence.redTouchedTestFiles.includes(filePath)) {
            phaseEvidence.redTouchedTestFiles.push(filePath)
            changed = true
          }
        }
      }
    }

    if (phase === "green") {
      for (const filePath of targetPaths) {
        if (filePath && !filePath.startsWith("openspec/") && !filePath.startsWith(".opencode/")) {
          if (!phaseEvidence.greenTouchedImplFiles.includes(filePath)) {
            phaseEvidence.greenTouchedImplFiles.push(filePath)
            changed = true
          }
        }
      }
    }

    if (phase === "verify" && context.tool === "bash") {
      const command = String(context.args?.command || "").trim()
      if (shouldRecordVerifyCommand(command, resolvedOptions) && !phaseEvidence.verifyCommands.includes(command)) {
        phaseEvidence.verifyCommands.push(command)
        changed = true
      }
    }

    if (!changed) return
    await writeApplyState(context.rootDir, {
      ...applyState,
      phaseEvidence,
    })
  }

  return {
    state,
    resolveSelection,
    rememberSelection,
    async beforeMutation(context: CodexEventContext): Promise<GuardDecision | null> {
      const capturedSelection = captureSelection(context.tool, context.args || {})
      if (capturedSelection) {
        rememberSelection(context.sessionId, capturedSelection)
      }

      if (!isToolMutation(context.tool, context.args || {})) {
        const guardContext = await buildGuardContext(context)
        if (hooks.beforeMutation) {
          const hookDecision = await hooks.beforeMutation(guardContext)
          if (hookDecision) return hookDecision
        }
        return null
      }

      const targetPaths = resolveTargetPaths(context.tool, context.args || {})
      const allPathsAlwaysAllowed =
        targetPaths.length > 0 &&
        targetPaths.every((filePath) => isAlwaysAllowedPath(filePath, resolvedOptions))

      const workflowState = await collectWorkflowState(context.rootDir)
      const selection = resolveSelection(context.sessionId)
      const applyState = await reconcileApplyState(
        context.rootDir,
        await readApplyState(context.rootDir),
        workflowState,
      )
      const guardContext = await buildGuardContext(context, applyState)
      if (hooks.beforeMutation) {
        const hookDecision = await hooks.beforeMutation(guardContext)
        if (hookDecision) return hookDecision
      }

      const hasActiveApplySelection =
        selection &&
        applyState &&
        applyState.mode === "apply" &&
        applyState.kind === selection.kind &&
        applyState.name === selection.name &&
        applyState.sessionId === context.sessionId

      if (allPathsAlwaysAllowed && !hasActiveApplySelection) {
        return null
      }

      if (!resolvedOptions.failClosed && workflowState.readyItems.length === 0) {
        return null
      }

      if (!selection) {
        return buildApplyReadyFailureDecision({
          currentSelection: null,
          applyReadyItems: workflowState.readyItems.map((item) => `${item.kind}:${item.name}`),
          failedGates: [],
        })
      }

      const active = workflowState.readyItems.find(
        (item) => item.kind === selection.kind && item.name === selection.name,
      )
      if (!active) {
        const selectedItem = [...workflowState.changes, ...workflowState.bugfixes].find(
          (item) => item.kind === selection.kind && item.name === selection.name,
        )
        return buildApplyReadyFailureDecision({
          currentSelection: `${selection.kind}:${selection.name}`,
          applyReadyItems: workflowState.readyItems.map((item) => `${item.kind}:${item.name}`),
          failedGates: selectedItem?.quality?.failures || [],
        })
      }

      const hasApplyLock =
        applyState &&
        applyState.mode === "apply" &&
        applyState.kind === selection.kind &&
        applyState.name === selection.name &&
        applyState.sessionId === context.sessionId
      if (!hasApplyLock) {
        return buildApplyLockMissingDecision({
          sessionId: context.sessionId,
          currentSelection: `${selection.kind}:${selection.name}`,
          applyReadyItems: workflowState.readyItems.map((item) => `${item.kind}:${item.name}`),
          stateFileSummary: applyState
            ? `state_file=${applyState.kind}:${applyState.name} session=${applyState.sessionId || "unknown"}`
            : "state_file=missing",
          commandHint: selection.kind === "bugfix" ? "/opsx-bugfix" : "/opsx-apply",
          applyStatePath: APPLY_STATE_PATH,
        })
      }

      if (isApplyStateExpired(applyState.updatedAt, resolvedOptions.applyLockTtlMs)) {
        return buildApplyLockExpiredDecision({
          sessionId: context.sessionId,
          lastLockRefresh: applyState.updatedAt || "unknown",
          lockTtlMs: resolvedOptions.applyLockTtlMs,
          commandHint: selection.kind === "bugfix" ? "/opsx-bugfix" : "/opsx-apply",
          applyStatePath: APPLY_STATE_PATH,
        })
      }

      if (active.tasksSummary.total > 0 && active.tasksSummary.remaining === 0) {
        return buildTasksAlreadyCompleteDecision(selection.kind === "bugfix" ? "/opsx-bugfix" : "/opsx-apply")
      }

      const phase = applyState.phase || "green"
      if (
        !isValidPhaseSession(phase, context.sessionId, applyState) ||
        !hasDistinctPhaseSessions({
          redSessionId: applyState.redSessionId,
          greenSessionId: applyState.greenSessionId,
          verifySessionId: applyState.verifySessionId,
        })
      ) {
        return buildPhaseSessionDecision({
          phase,
          sessionId: context.sessionId,
          redSessionId: applyState.redSessionId,
          greenSessionId: applyState.greenSessionId,
          verifySessionId: applyState.verifySessionId,
        })
      }

      const phaseEntryDecision = assertPhaseEntryAllowed(
        phase,
        targetPaths,
        applyState.phaseEvidence || {},
        APPLY_STATE_PATH,
      )
      if (phaseEntryDecision) return phaseEntryDecision

      const phasePathDecision = assertPhasePathAllowed(phase, targetPaths, APPLY_STATE_PATH)
      if (phasePathDecision) return phasePathDecision

      return null
    },
    async afterMutation(context: CodexEventContext): Promise<void> {
      const capturedSelection = captureSelection(context.tool, context.args || {})
      if (capturedSelection) {
        rememberSelection(context.sessionId, capturedSelection)
      }

      await recordPhaseEvidence(context)

      const guardContext = await buildGuardContext(context)
      if (hooks.afterMutation) {
        await hooks.afterMutation(guardContext)
      }
    },
    async onSessionCompact(context: CodexEventContext): Promise<string[]> {
      const guardContext = await buildGuardContext(context)
      const defaultSummary = guardContext.selection
        ? [
            "## OpenSpec OPC Guard State",
            `- selected_work_item: ${guardContext.selection.kind}:${guardContext.selection.name}`,
            `- apply_state_file: ${APPLY_STATE_PATH}`,
            `- apply_lock_ttl_ms: ${resolvedOptions.applyLockTtlMs}`,
            "- invariant: do not mutate business code until the selected work item is apply-ready",
            "- invariant: do not mutate business code until /opsx-apply refreshes the apply state file for this session",
            "- invariant: do not mutate business code if the apply lock is expired or all tracked tasks are already complete",
            "- invariant: red, green, verify phases must use different session ids",
            "- invariant: red writes tests, green writes implementation, verify does not write business code",
            "- invariant: spec/config/doc writes under openspec/ and .opencode/ remain allowed",
          ]
        : []
      const hookSummary = hooks.onSessionCompact ? await hooks.onSessionCompact(guardContext) : []
      return [...defaultSummary, ...hookSummary]
    },
  }
}
