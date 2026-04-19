import fs from "node:fs/promises"
import path from "node:path"

import { DEFAULT_GUARD_CONFIG, evaluateBugfixQuality, evaluateChangeQuality } from "./guard-engine.js"
import { exists } from "./state-io.js"
import type {
  GuardConfig,
  TasksSummary,
  TasksSummaryItem,
  WorkItem,
  WorkItemKind,
  WorkflowState,
} from "./types.js"

export const SPEC_CHANGE_ROOT = "openspec/changes"
export const BUGFIX_ROOT = "openspec/bugs"

export async function readTextFile(filePath: string): Promise<string> {
  const bytes = await fs.readFile(filePath)
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "")
  } catch {
    return new TextDecoder("gb18030").decode(bytes).replace(/^\uFEFF/, "")
  }
}

export async function readIfExists(filePath: string): Promise<string> {
  if (!(await exists(filePath))) return ""
  return readTextFile(filePath)
}

export async function summarizeTasks(tasksPath: string): Promise<TasksSummary> {
  if (!(await exists(tasksPath))) {
    return { total: 0, remaining: 0, complete: 0, items: [] }
  }

  const content = await readTextFile(tasksPath)
  const items = Array.from(content.matchAll(/^- \[( |x)\]\s+(.+)$/gim), (match): TasksSummaryItem => ({
    done: match[1].toLowerCase() === "x",
    text: match[2].trim(),
  }))
  const complete = (content.match(/^- \[x\]/gim) || []).length
  const remaining = (content.match(/^- \[ \]/gim) || []).length
  return {
    total: complete + remaining,
    complete,
    remaining,
    items,
  }
}

export async function collectSpecContents(specsDir: string): Promise<string[]> {
  if (!(await exists(specsDir))) return []

  const results: string[] = []
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(absolute)
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        results.push(await readTextFile(absolute))
      }
    }
  }

  await walk(specsDir)
  return results
}

export async function evaluateWorkItemQuality(
  dir: string,
  kind: WorkItemKind,
  missing: string[],
  tasksSummary: TasksSummary,
  config: GuardConfig = DEFAULT_GUARD_CONFIG,
) {
  if (kind === "change") {
    return evaluateChangeQuality(
      {
        proposal: await readIfExists(path.join(dir, "proposal.md")),
        design: await readIfExists(path.join(dir, "design.md")),
        testContract: await readIfExists(path.join(dir, "test-contract.md")),
        specContents: await collectSpecContents(path.join(dir, "specs")),
      },
      tasksSummary,
      missing,
      config,
    )
  }

  return evaluateBugfixQuality(
    {
      bugReport: await readIfExists(path.join(dir, "bug-report.md")),
      fix: await readIfExists(path.join(dir, "fix.md")),
    },
    missing,
    config,
  )
}

export async function listWorkItems(
  rootDir: string,
  rootRelative: string,
  kind: WorkItemKind,
  requiredFiles: string[],
  config: GuardConfig = DEFAULT_GUARD_CONFIG,
): Promise<WorkItem[]> {
  const root = path.join(rootDir, rootRelative)
  if (!(await exists(root))) return []

  const entries = await fs.readdir(root, { withFileTypes: true })
  const items: WorkItem[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name === "archive") continue

    const dir = path.join(root, entry.name)
    if (!(await exists(path.join(dir, ".openspec.yaml")))) continue

    const missing: string[] = []
    for (const file of requiredFiles) {
      if (!(await exists(path.join(dir, file)))) {
        missing.push(file)
      }
    }

    const tasksSummary = await summarizeTasks(path.join(dir, "tasks.md"))
    const quality = await evaluateWorkItemQuality(dir, kind, missing, tasksSummary, config)
    items.push({
      kind,
      name: entry.name,
      relativeDir: `${rootRelative}/${entry.name}`,
      ready: missing.length === 0 && quality.ready,
      missing,
      tasksSummary,
      quality,
    })
  }

  return items
}

export async function collectWorkflowState(
  rootDir: string,
  config: GuardConfig = DEFAULT_GUARD_CONFIG,
): Promise<WorkflowState> {
  const changes = await listWorkItems(rootDir, SPEC_CHANGE_ROOT, "change", [
    "proposal.md",
    "design.md",
    "test-contract.md",
    "tasks.md",
  ], config)

  const bugfixes = await listWorkItems(rootDir, BUGFIX_ROOT, "bugfix", [
    "bug-report.md",
    "fix.md",
  ], config)

  const readyItems = [...changes, ...bugfixes].filter((item) => item.ready)
  return {
    changes,
    bugfixes,
    readyItems,
  }
}
