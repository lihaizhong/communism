import fs from "node:fs/promises"
import path from "node:path"

import type { ApplyState, SessionSelection, WorkflowState } from "./types.js"
import { normalizePath } from "./guard-engine.js"
import { APPLY_STATE_PATH, APPLY_STATE_VERSION } from "./constants.js"

export const ARCHIVE_SEGMENT = "/archive/"
export { APPLY_STATE_PATH } from "./constants.js"

const LOCK_RETRY_DELAY_MS = 20
const LOCK_RETRY_COUNT = 50

export function extractSelectionFromFile(filePath: string | null | undefined): SessionSelection | null {
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

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function readApplyState(rootDir: string, applyStatePath = APPLY_STATE_PATH): Promise<ApplyState | null> {
  const statePath = path.join(rootDir, applyStatePath)
  if (!(await exists(statePath))) return null

  try {
    const raw = await fs.readFile(statePath, "utf8")
    return normalizeApplyState(JSON.parse(raw) as ApplyState)
  } catch {
    return null
  }
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function withStateFileLock<T>(statePath: string, fn: () => Promise<T>): Promise<T> {
  const lockPath = `${statePath}.lock`
  let handle: Awaited<ReturnType<typeof fs.open>> | null = null
  for (let attempt = 0; attempt < LOCK_RETRY_COUNT; attempt += 1) {
    try {
      handle = await fs.open(lockPath, "wx")
      break
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | null | undefined)?.code
      if (code !== "EEXIST") throw error
      await delay(LOCK_RETRY_DELAY_MS)
    }
  }

  if (!handle) {
    throw new Error(`Failed to acquire apply-state lock after ${LOCK_RETRY_COUNT} retries: ${lockPath}`)
  }

  try {
    return await fn()
  } finally {
    await handle.close().catch(() => undefined)
    await fs.unlink(lockPath).catch(() => undefined)
  }
}

function buildTargetId(kind: ApplyState["kind"], name: string): string {
  return `${kind}:${name}`
}

function normalizeApplyState(state: ApplyState): ApplyState {
  return {
    ...state,
    stateVersion: typeof state.stateVersion === "number" ? state.stateVersion : APPLY_STATE_VERSION,
    targetId: state.targetId || buildTargetId(state.kind, state.name),
  }
}

function isWorkItemPresent(workflowState: WorkflowState, applyState: ApplyState): boolean {
  return [...workflowState.changes, ...workflowState.bugfixes].some(
    (item) => item.kind === applyState.kind && item.name === applyState.name,
  )
}

export async function reconcileApplyState(
  rootDir: string,
  applyState: ApplyState | null,
  workflowState: WorkflowState,
  applyStatePath = APPLY_STATE_PATH,
): Promise<ApplyState | null> {
  if (!applyState) return null

  const normalized = normalizeApplyState(applyState)
  const stillExists = isWorkItemPresent(workflowState, normalized)
  const reconciled: ApplyState = stillExists
    ? normalized
    : {
      ...normalized,
      phase: "red",
      redSessionId: undefined,
      greenSessionId: undefined,
      verifySessionId: undefined,
      phaseEvidence: {},
    }

  if (JSON.stringify(reconciled) !== JSON.stringify(applyState)) {
    await writeApplyState(rootDir, reconciled, applyStatePath)
  }
  return reconciled
}

export async function writeApplyState(
  rootDir: string,
  applyState: ApplyState,
  applyStatePath = APPLY_STATE_PATH,
): Promise<void> {
  const statePath = path.join(rootDir, applyStatePath)
  const normalized = normalizeApplyState({
    ...applyState,
    updatedAt: applyState.updatedAt || new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(statePath), { recursive: true })
  await withStateFileLock(statePath, async () => {
    const tempPath = `${statePath}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(tempPath, `${JSON.stringify(normalized, null, 2)}\n`)
    await fs.rename(tempPath, statePath)
  })
}
