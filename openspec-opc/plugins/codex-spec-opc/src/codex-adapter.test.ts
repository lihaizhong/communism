import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { createCodexAdapter } from "./codex-adapter.js"
import { APPLY_STATE_PATH } from "@openspec-opc/guard-core/state-io"

async function makeTempWorktree() {
  return fs.mkdtemp(path.join(os.tmpdir(), "codex-adapter-"))
}

async function writeFile(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content)
}

async function createChangeFixture(rootDir: string, tasks?: string) {
  const workItemDir = path.join(rootDir, "openspec/changes/add-dark-mode")
  await writeFile(path.join(workItemDir, ".openspec.yaml"), "kind: change\nname: add-dark-mode\n")
  await writeFile(
    path.join(workItemDir, "proposal.md"),
    [
      "## Why",
      "Users need a dark mode because the current UI is hard to use at night and during long sessions.",
      "",
      "## What Changes",
      "Add theme toggle and persistence.",
    ].join("\n"),
  )
  await writeFile(
    path.join(workItemDir, "design.md"),
    [
      "## Affected Modules",
      "- src/app.js",
      "- src/theme/store.js",
      "",
      "## Constraints",
      "- Keep SSR stable",
      "- Preserve existing user settings semantics",
      "",
      "## Approach",
      "Add theme state, persist the chosen theme, and thread the value through the app shell so the UI can render the selected palette without breaking existing startup behavior.",
    ].join("\n"),
  )
  await writeFile(
    path.join(workItemDir, "tasks.md"),
    tasks ??
      ["- [ ] Add theme state plumbing to app shell", "- [ ] Persist user theme selection in settings"].join("\n"),
  )
  await writeFile(
    path.join(workItemDir, "specs/ui.md"),
    ["### Requirement: Theme Preference", "The application SHALL allow theme selection."].join("\n"),
  )
}

async function writeApplyState(rootDir: string, state: object) {
  await writeFile(path.join(rootDir, APPLY_STATE_PATH), `${JSON.stringify(state, null, 2)}\n`)
}

test("codex adapter returns apply-ready failure decision for placeholder tasks", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir, ["- [ ] todo", "- [ ] fix"].join("\n"))

  const adapter = createCodexAdapter()
  adapter.rememberSelection("sess-codex", { kind: "change", name: "add-dark-mode" })

  const decision = await adapter.beforeMutation({
    rootDir,
    sessionId: "sess-codex",
    tool: "write",
    args: { filePath: "src/app.js" },
  })

  assert.ok(decision)
  assert.equal(decision?.code, "APPLY_READY_FAILED")
  assert.ok(decision?.sections?.some((section) => section.label === "failed_gates"))
})

test("codex adapter returns null when apply lock and phase conditions are satisfied", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-codex-green",
    phase: "green",
    redSessionId: "sess-codex-red",
    greenSessionId: "sess-codex-green",
    verifySessionId: "sess-codex-verify",
    phaseEvidence: {
      redTouchedTestFiles: ["src/app.test.js"],
      greenTouchedImplFiles: [],
      verifyCommands: [],
    },
    updatedAt: new Date().toISOString(),
  })

  const adapter = createCodexAdapter()
  adapter.rememberSelection("sess-codex-green", { kind: "change", name: "add-dark-mode" })

  const decision = await adapter.beforeMutation({
    rootDir,
    sessionId: "sess-codex-green",
    tool: "write",
    args: { filePath: "src/app.js" },
  })

  assert.equal(decision, null)
})

test("codex adapter records verify command evidence on afterMutation", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-codex-verify",
    phase: "verify",
    redSessionId: "sess-codex-red",
    greenSessionId: "sess-codex-green",
    verifySessionId: "sess-codex-verify",
    phaseEvidence: {
      redTouchedTestFiles: ["src/app.test.js"],
      greenTouchedImplFiles: ["src/app.js"],
      verifyCommands: [],
    },
    updatedAt: new Date().toISOString(),
  })

  const adapter = createCodexAdapter()
  adapter.rememberSelection("sess-codex-verify", { kind: "change", name: "add-dark-mode" })

  await adapter.afterMutation({
    rootDir,
    sessionId: "sess-codex-verify",
    tool: "bash",
    args: { command: "npm test" },
  })

  const updatedState = JSON.parse(await fs.readFile(path.join(rootDir, APPLY_STATE_PATH), "utf8"))
  assert.deepEqual(updatedState.phaseEvidence.verifyCommands, ["npm test"])
})

test("codex adapter emits default guard summary on session compact", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)

  const adapter = createCodexAdapter()
  adapter.rememberSelection("sess-codex-compact", { kind: "change", name: "add-dark-mode" })

  const summary = await adapter.onSessionCompact({
    rootDir,
    sessionId: "sess-codex-compact",
  })

  assert.ok(summary.some((line) => line.includes("## OpenSpec OPC Guard State")))
  assert.ok(summary.some((line) => line.includes("selected_work_item: change:add-dark-mode")))
})

test("codex adapter blocks verify-phase bash mutations that target business code", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-codex-verify-bash",
    phase: "verify",
    redSessionId: "sess-codex-red",
    greenSessionId: "sess-codex-green",
    verifySessionId: "sess-codex-verify-bash",
    phaseEvidence: {
      redTouchedTestFiles: ["src/app.test.js"],
      greenTouchedImplFiles: ["src/app.js"],
      verifyCommands: ["npm test"],
    },
    updatedAt: new Date().toISOString(),
  })

  const adapter = createCodexAdapter()
  adapter.rememberSelection("sess-codex-verify-bash", { kind: "change", name: "add-dark-mode" })

  const decision = await adapter.beforeMutation({
    rootDir,
    sessionId: "sess-codex-verify-bash",
    tool: "bash",
    args: { command: "rm src/app.js" },
  })

  assert.ok(decision)
  assert.equal(decision?.code, "PHASE_PATH_VIOLATION")
})
