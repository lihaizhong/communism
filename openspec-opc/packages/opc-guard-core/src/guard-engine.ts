import type {
  ApplyReadyContext,
  GuardConfig,
  GuardDecision,
  GuardMessageSection,
  PathKind,
  Phase,
  PhaseEvidence,
  QualityCheckResult,
  TasksSummary,
  WorkItemQualityDocuments,
} from "./types.js"
import { APPLY_STATE_PATH } from "./constants.js"

export const DEFAULT_GUARD_CONFIG: GuardConfig = {
  minProposalChars: 120,
  minDesignChars: 200,
  minBugDocChars: 120,
  minChecklistItems: 2,
  minTaskTextChars: 8,
  taskPlaceholderPatterns: [
    /^todo$/i,
    /^tbd$/i,
    /^fix$/i,
    /^implement$/i,
    /^实现$/i,
    /^稍后处理$/i,
    /^done later$/i,
  ],
  verifyCommandPattern:
    /\b(npm\s+test|pnpm\s+test|yarn\s+test|bun\s+test|pytest|vitest|jest|go\s+test|cargo\s+test|cargo\s+nextest|eslint|ruff\s+check|tsc\b|tsc\s|biome\s+check|make\s+test|make\s+check|just\s+test|just\s+check)\b/i,
}

export const TEST_PATH_MARKERS = ["/test/", "/tests/", "__tests__", ".spec.", ".test.", "regression-test"]

export function normalizePath(filePath: string | null | undefined): string {
  return String(filePath || "").replace(/\\/g, "/").replace(/^\.\/+/, "")
}

export function isLikelyTestFilename(filePath: string): boolean {
  return /(^|\/)(test|tests)\b|(\.|-)(spec|test)\.[^.]+$/i.test(filePath)
}

export function classifyPath(filePath: string, applyStatePath = APPLY_STATE_PATH): PathKind {
  const normalized = normalizePath(filePath)
  if (!normalized) return "unknown"
  if (normalized === applyStatePath) return "state"
  if (TEST_PATH_MARKERS.some((marker) => normalized.includes(marker))) return "test"
  if (isLikelyTestFilename(normalized)) return "test"
  if (normalized.startsWith("openspec/")) return "doc"
  if (normalized.startsWith(".opencode/")) return "config"
  if (normalized === "AGENTS.md" || normalized === "CLAUDE.md" || normalized === "opencode.json") return "config"
  return "source"
}

export function countMeaningfulChars(content: string | null | undefined): number {
  return String(content || "").replace(/\s+/g, "").length
}

export function countHeadingMatches(content: string | null | undefined, aliases: string[][]): number {
  const lines = String(content || "").split("\n")
  let count = 0
  for (const aliasGroup of aliases) {
    if (
      lines.some((line) => {
        const normalized = line.trim().toLowerCase()
        if (!normalized.startsWith("##")) return false
        return aliasGroup.some((alias) => normalized.includes(alias))
      })
    ) {
      count += 1
    }
  }
  return count
}

export function hasSpecStructure(content: string | null | undefined): boolean {
  const value = String(content || "")
  return (
    /###\s+Requirement:/i.test(value) ||
    /####\s+Scenario:/i.test(value) ||
    /\bSHALL\b/.test(value) ||
    /\bGIVEN\b[\s\S]*\bWHEN\b[\s\S]*\bTHEN\b/i.test(value)
  )
}

export function evaluateChangeQuality(
  docs: WorkItemQualityDocuments,
  tasksSummary: TasksSummary,
  missing: string[],
  config: GuardConfig = DEFAULT_GUARD_CONFIG,
): QualityCheckResult {
  const failures: string[] = []
  if (missing.length > 0) return { ready: false, failures }

  const proposal = docs.proposal || ""
  const proposalChars = countMeaningfulChars(proposal)
  if (proposalChars < config.minProposalChars) {
    failures.push(
      `proposal.md is too short, found ${proposalChars} chars, need at least ${config.minProposalChars}`,
    )
  }
  const proposalSections = countHeadingMatches(proposal, [
    ["why", "背景", "问题", "为什么做"],
    ["what changes", "变更内容", "方案概述"],
    ["non-goals", "非目标", "不做什么"],
    ["risks", "风险"],
  ])
  if (proposalSections < 2) {
    failures.push(
      'proposal.md is missing structure, need at least 2 sections such as "Why", "What Changes", "Non-Goals", or "Risks"',
    )
  }

  const design = docs.design || ""
  const designChars = countMeaningfulChars(design)
  if (designChars < config.minDesignChars) {
    failures.push(`design.md is too short, found ${designChars} chars, need at least ${config.minDesignChars}`)
  }
  const designSections = countHeadingMatches(design, [
    ["architecture", "架构"],
    ["affected modules", "影响模块", "受影响模块"],
    ["constraints", "约束"],
    ["approach", "implementation approach", "实现方案", "技术方案"],
    ["data flow", "数据流"],
    ["tradeoffs", "权衡"],
    ["testing", "测试"],
  ])
  if (designSections < 2) {
    failures.push(
      'design.md is missing structure, need at least 2 sections such as "Architecture", "Affected Modules", "Constraints", or "Approach"',
    )
  }
  if (!/(affected modules|影响模块|受影响模块)/i.test(design)) {
    failures.push('design.md is missing an "Affected Modules" section or equivalent')
  }
  if (!/(constraints|约束)/i.test(design)) {
    failures.push('design.md is missing a "Constraints" section or equivalent')
  }

  const specContents = docs.specContents || []
  if (specContents.length === 0) {
    failures.push("specs/ must contain at least one spec markdown file")
  } else if (!specContents.some((content) => hasSpecStructure(content))) {
    failures.push(
      "specs/ is missing requirement or scenario structure, expected Requirement/Scenario or GIVEN/WHEN/THEN style content",
    )
  }

  if (tasksSummary.total < config.minChecklistItems) {
    failures.push(
      `tasks.md must contain at least ${config.minChecklistItems} checklist items, found ${tasksSummary.total}`,
    )
  }
  if (tasksSummary.total > 0 && tasksSummary.remaining === 0) {
    failures.push("tasks.md must contain at least 1 unfinished checklist item before implementation starts")
  }
  const weakTasks = tasksSummary.items.filter((item) => {
    if (countMeaningfulChars(item.text) < config.minTaskTextChars) return true
    return config.taskPlaceholderPatterns.some((pattern) => pattern.test(item.text))
  })
  if (weakTasks.length > 0) {
    failures.push(
      `tasks.md contains placeholder or low-signal tasks: ${weakTasks.map((item) => `"${item.text}"`).join(", ")}`,
    )
  }

  return { ready: failures.length === 0, failures }
}

export function evaluateBugfixQuality(
  docs: WorkItemQualityDocuments,
  missing: string[],
  config: GuardConfig = DEFAULT_GUARD_CONFIG,
): QualityCheckResult {
  const failures: string[] = []
  if (missing.length > 0) return { ready: false, failures }

  const bugReport = docs.bugReport || ""
  const bugChars = countMeaningfulChars(bugReport)
  if (bugChars < config.minBugDocChars) {
    failures.push(`bug-report.md is too short, found ${bugChars} chars, need at least ${config.minBugDocChars}`)
  }
  const bugSections = countHeadingMatches(bugReport, [
    ["symptom", "现象"],
    ["repro", "reproduction", "复现"],
    ["expected", "预期"],
    ["actual", "实际"],
    ["environment", "环境"],
    ["impact", "影响"],
  ])
  if (bugSections < 2) {
    failures.push(
      'bug-report.md is missing structure, need at least 2 sections such as "Symptom", "Repro", "Expected", "Actual", or "Environment"',
    )
  }

  const fixDoc = docs.fix || ""
  const fixChars = countMeaningfulChars(fixDoc)
  if (fixChars < config.minBugDocChars) {
    failures.push(`fix.md is too short, found ${fixChars} chars, need at least ${config.minBugDocChars}`)
  }
  const fixSections = countHeadingMatches(fixDoc, [
    ["root cause", "根因"],
    ["fix", "修复方案", "方案"],
    ["verification", "回归验证", "验证"],
    ["risk", "边界", "风险"],
  ])
  if (fixSections < 2) {
    failures.push(
      'fix.md is missing structure, need at least 2 sections such as "Root Cause", "Fix", "Verification", or "Risk"',
    )
  }

  return { ready: failures.length === 0, failures }
}

export function toPhaseEvidence(input?: Partial<PhaseEvidence>): PhaseEvidence {
  return {
    redTouchedTestFiles: [...new Set(input?.redTouchedTestFiles || [])],
    greenTouchedImplFiles: [...new Set(input?.greenTouchedImplFiles || [])],
    verifyCommands: [...new Set(input?.verifyCommands || [])],
  }
}

export function hasPhaseEvidence(evidence: Partial<PhaseEvidence> | undefined, key: keyof PhaseEvidence): boolean {
  return Array.isArray(evidence?.[key]) && (evidence?.[key]?.length || 0) > 0
}

export function shouldRecordVerifyCommand(command: string, config: GuardConfig = DEFAULT_GUARD_CONFIG): boolean {
  return config.verifyCommandPattern.test(command.trim())
}

export function formatGuardMessage(title: string, sections: GuardMessageSection[]): string {
  const lines = ["[opencode-spec-opc] Blocked by OpenSpec runtime guard.", title]
  for (const section of sections) {
    lines.push(`${section.label}:`)
    for (const item of section.items) {
      lines.push(`- ${item}`)
    }
  }
  return lines.join("\n")
}

export function buildApplyReadyFailureDecision(context: ApplyReadyContext): GuardDecision {
  return {
    ok: false,
    code: "APPLY_READY_FAILED",
    title: "Business code writes are only allowed after the workflow is apply-ready.",
    sections: [
      {
        label: "context",
        items: [
          `current_session_selection=${context.currentSelection || "none"}`,
          `apply_ready_items=${context.applyReadyItems.length > 0 ? context.applyReadyItems.join(", ") : "none"}`,
        ],
      },
      ...(context.failedGates.length > 0
        ? [
            {
              label: "failed_gates",
              items: context.failedGates,
            },
          ]
        : []),
      {
        label: "next_steps",
        items: [
          "Create or select exactly one active change or bugfix",
          "Finish proposal/design/tasks or bug-report/fix until the quality gates pass",
          "Rerun /opsx-apply for that work item before writing business code",
        ],
      },
    ],
  }
}

export function buildPhaseEntryDecision(phase: Phase, reason: string, evidence: Partial<PhaseEvidence>): GuardDecision {
  const normalizedEvidence = toPhaseEvidence(evidence)
  return {
    ok: false,
    code: "PHASE_ENTRY_VIOLATION",
    title: `Current phase: ${phase}.`,
    sections: [
      {
        label: "reason",
        items: [reason],
      },
      {
        label: "phase_evidence",
        items: [
          `redTouchedTestFiles=${normalizedEvidence.redTouchedTestFiles.length}`,
          `greenTouchedImplFiles=${normalizedEvidence.greenTouchedImplFiles.length}`,
          `verifyCommands=${normalizedEvidence.verifyCommands.length}`,
        ],
      },
    ],
  }
}

export function renderDecision(decision: GuardDecision): string {
  if (decision.ok) return "ok"
  return formatGuardMessage(decision.title || "Blocked.", decision.sections || [])
}

export function buildApplyLockMissingDecision(input: {
  sessionId: string
  currentSelection: string | null
  applyReadyItems: string[]
  stateFileSummary: string
  commandHint: string
  applyStatePath: string
}): GuardDecision {
  return {
    ok: false,
    code: "APPLY_LOCK_MISSING",
    title: "Business code writes require an explicit /opsx-apply session lock.",
    sections: [
      {
        label: "context",
        items: [
          `current_runtime_session=${input.sessionId}`,
          `current_session_selection=${input.currentSelection || "none"}`,
          `apply_ready_items=${input.applyReadyItems.length > 0 ? input.applyReadyItems.join(", ") : "none"}`,
        ],
      },
      {
        label: "guard_state",
        items: [input.stateFileSummary],
      },
      {
        label: "next_steps",
        items: [
          `Rerun ${input.commandHint} for this work item`,
          `Confirm it refreshes ${input.applyStatePath} for session ${input.sessionId}`,
          "Continue implementation in the same session",
        ],
      },
    ],
  }
}

export function buildApplyLockExpiredDecision(input: {
  sessionId: string
  lastLockRefresh: string
  lockTtlMs: number
  commandHint: string
  applyStatePath: string
}): GuardDecision {
  return {
    ok: false,
    code: "APPLY_LOCK_EXPIRED",
    title: "The explicit apply lock has expired.",
    sections: [
      {
        label: "context",
        items: [
          `current_runtime_session=${input.sessionId}`,
          `last_lock_refresh=${input.lastLockRefresh}`,
          `lock_ttl_ms=${input.lockTtlMs}`,
        ],
      },
      {
        label: "next_steps",
        items: [
          `Rerun ${input.commandHint} for this work item`,
          `Refresh ${input.applyStatePath}`,
          "Continue implementation in the same session",
        ],
      },
    ],
  }
}

export function buildTasksAlreadyCompleteDecision(commandHint: string): GuardDecision {
  return {
    ok: false,
    code: "TASKS_ALREADY_COMPLETE",
    title: "The explicit apply lock is no longer valid because all tracked tasks are already complete.",
    sections: [
      {
        label: "next_steps",
        items: [
          "Review whether implementation is actually done",
          "If work remains, update tasks.md so at least one task is still open",
          `Rerun ${commandHint} only after the task list reflects remaining work`,
        ],
      },
    ],
  }
}

export function buildPhaseViolationDecision(phase: Phase, filePath: string, kind: PathKind): GuardDecision {
  return {
    ok: false,
    code: "PHASE_PATH_VIOLATION",
    title: `Current phase: ${phase}.`,
    sections: [
      {
        label: "target",
        items: [`path=${filePath}`, `classification=${kind}`],
      },
      {
        label: "rule",
        items: [
          phase === "red"
            ? "Red phase may only write tests and workflow documents"
            : phase === "green"
              ? "Green phase may write implementation code, but should not rewrite tests"
              : "Verify phase may not write business code",
        ],
      },
    ],
  }
}

export function buildPhaseSessionDecision(input: {
  phase: Phase
  sessionId: string
  redSessionId?: string
  greenSessionId?: string
  verifySessionId?: string
}): GuardDecision {
  return {
    ok: false,
    code: "PHASE_SESSION_VIOLATION",
    title: `Current phase: ${input.phase}.`,
    sections: [
      {
        label: "context",
        items: [
          `current_runtime_session=${input.sessionId}`,
          `red_session=${input.redSessionId || "unset"}`,
          `green_session=${input.greenSessionId || "unset"}`,
          `verify_session=${input.verifySessionId || "unset"}`,
        ],
      },
      {
        label: "rule",
        items: ["Each phase must run in a different subagent session"],
      },
    ],
  }
}

export function isApplyStateExpired(updatedAt: string | undefined, lockTtlMs: number): boolean {
  if (!updatedAt) return true
  const timestamp = Date.parse(updatedAt)
  if (Number.isNaN(timestamp)) return true
  return Date.now() - timestamp > lockTtlMs
}

export function hasDistinctPhaseSessions(input: {
  redSessionId?: string
  greenSessionId?: string
  verifySessionId?: string
}): boolean {
  const present = [input.redSessionId, input.greenSessionId, input.verifySessionId].filter(Boolean)
  return new Set(present).size === present.length
}

export function isValidPhaseSession(phase: Phase, sessionId: string, input: {
  redSessionId?: string
  greenSessionId?: string
  verifySessionId?: string
}): boolean {
  if (phase === "red") return input.redSessionId === sessionId
  if (phase === "green") return input.greenSessionId === sessionId
  if (phase === "verify") return input.verifySessionId === sessionId
  return false
}

export function targetPathsContainKind(
  targetPaths: string[],
  expectedKind: PathKind,
  applyStatePath = APPLY_STATE_PATH,
): boolean {
  return targetPaths.some((filePath) => classifyPath(filePath, applyStatePath) === expectedKind)
}

export function assertPhasePathAllowed(
  phase: Phase,
  targetPaths: string[],
  applyStatePath = APPLY_STATE_PATH,
): GuardDecision | null {
  for (const filePath of targetPaths) {
    const kind = classifyPath(filePath, applyStatePath)
    if (kind === "doc" || kind === "config" || kind === "state") continue
    if (phase === "red" && kind !== "test") {
      return buildPhaseViolationDecision(phase, normalizePath(filePath), kind)
    }
    if (phase === "green" && kind === "test") {
      return buildPhaseViolationDecision(phase, normalizePath(filePath), kind)
    }
    if (phase === "verify" && (kind === "test" || kind === "source")) {
      return buildPhaseViolationDecision(phase, normalizePath(filePath), kind)
    }
  }
  return null
}

export function assertPhaseEntryAllowed(
  phase: Phase,
  targetPaths: string[],
  evidence: Partial<PhaseEvidence>,
  applyStatePath = APPLY_STATE_PATH,
): GuardDecision | null {
  if (phase === "red") {
    if (!hasPhaseEvidence(evidence, "redTouchedTestFiles") && !targetPathsContainKind(targetPaths, "test", applyStatePath)) {
      return buildPhaseEntryDecision(
        phase,
        "Red phase must start by writing at least one test file before continuing with doc-only updates.",
        evidence,
      )
    }
    return null
  }

  if (phase === "green") {
    if (!hasPhaseEvidence(evidence, "redTouchedTestFiles")) {
      return buildPhaseEntryDecision(
        phase,
        "Green phase requires red-phase test evidence first. Start in red and write at least one test file.",
        evidence,
      )
    }
    if (!hasPhaseEvidence(evidence, "greenTouchedImplFiles") && !targetPathsContainKind(targetPaths, "source", applyStatePath)) {
      return buildPhaseEntryDecision(
        phase,
        "Green phase must start by writing at least one implementation file before continuing with doc-only updates.",
        evidence,
      )
    }
    return null
  }

  if (phase === "verify" && !hasPhaseEvidence(evidence, "greenTouchedImplFiles")) {
    return buildPhaseEntryDecision(
      phase,
      "Verify phase requires green-phase implementation evidence first.",
      evidence,
    )
  }
  if (phase === "verify" && !hasPhaseEvidence(evidence, "verifyCommands") && targetPaths.length > 0) {
    return buildPhaseEntryDecision(
      phase,
      "Verify phase must run at least one validation command before writing summary or workflow documents.",
      evidence,
    )
  }

  return null
}
