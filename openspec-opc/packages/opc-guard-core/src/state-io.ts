import fs from "node:fs/promises"
import path from "node:path"

import type { ApplyState, SessionSelection } from "./types.js"
import { normalizePath } from "./guard-engine.js"
import { APPLY_STATE_PATH } from "./constants.js"

export const ARCHIVE_SEGMENT = "/archive/"
export { APPLY_STATE_PATH } from "./constants.js"

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
    return JSON.parse(raw) as ApplyState
  } catch {
    return null
  }
}

export async function writeApplyState(
  rootDir: string,
  applyState: ApplyState,
  applyStatePath = APPLY_STATE_PATH,
): Promise<void> {
  const statePath = path.join(rootDir, applyStatePath)
  await fs.mkdir(path.dirname(statePath), { recursive: true })
  await fs.writeFile(statePath, `${JSON.stringify(applyState, null, 2)}\n`)
}
