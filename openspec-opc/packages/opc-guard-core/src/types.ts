export type WorkItemKind = "change" | "bugfix"

export type Phase = "red" | "green" | "verify"

export type PathKind = "unknown" | "state" | "test" | "doc" | "config" | "source"

export type GuardFailureCode =
  | "APPLY_READY_FAILED"
  | "APPLY_LOCK_MISSING"
  | "APPLY_LOCK_EXPIRED"
  | "TASKS_ALREADY_COMPLETE"
  | "PHASE_PATH_VIOLATION"
  | "PHASE_SESSION_VIOLATION"
  | "PHASE_ENTRY_VIOLATION"

export interface PhaseEvidence {
  redTouchedTestFiles: string[]
  greenTouchedImplFiles: string[]
  verifyCommands: string[]
}

export interface ApplyState {
  stateVersion?: number
  targetId?: string
  mode: "apply"
  kind: WorkItemKind
  name: string
  sessionId: string
  phase?: Phase
  redSessionId?: string
  greenSessionId?: string
  verifySessionId?: string
  updatedAt?: string
  phaseEvidence?: Partial<PhaseEvidence>
}

export interface TasksSummaryItem {
  done: boolean
  text: string
}

export interface TasksSummary {
  total: number
  remaining: number
  complete: number
  items: TasksSummaryItem[]
}

export interface QualityCheckResult {
  ready: boolean
  failures: string[]
}

export interface WorkItemQualityDocuments {
  proposal?: string
  design?: string
  testContract?: string
  bugReport?: string
  fix?: string
  specContents?: string[]
}

export interface WorkItem {
  kind: WorkItemKind
  name: string
  relativeDir: string
  missing: string[]
  tasksSummary: TasksSummary
  quality: QualityCheckResult
  ready: boolean
}

export interface WorkflowState {
  changes: WorkItem[]
  bugfixes: WorkItem[]
  readyItems: WorkItem[]
}

export interface GuardMessageSection {
  label: string
  items: string[]
}

export interface GuardDecision {
  ok: boolean
  code?: GuardFailureCode
  title?: string
  sections?: GuardMessageSection[]
}

export interface ApplyReadyContext {
  currentSelection: string | null
  applyReadyItems: string[]
  failedGates: string[]
}

export interface SessionSelection {
  kind: WorkItemKind
  name: string
  updatedAt?: number
}

export interface GuardThresholds {
  minProposalChars: number
  minDesignChars: number
  minTestContractChars: number
  minBugDocChars: number
  minChecklistItems: number
  minTaskTextChars: number
}

export interface GuardConfig extends GuardThresholds {
  taskPlaceholderPatterns: RegExp[]
  verifyCommandPattern: RegExp
}

export interface RuntimeGuardOptions extends Partial<GuardConfig> {
  failClosed?: boolean
  allowDocWrites?: boolean
  allowConfigWrites?: boolean
  applyLockTtlMs?: number
}
