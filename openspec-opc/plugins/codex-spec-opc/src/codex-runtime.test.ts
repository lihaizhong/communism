import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { createCodexAdapter } from "./codex-adapter.js"
import { createCodexRuntimeBridge } from "./codex-runtime.js"
import { APPLY_STATE_PATH } from "@openspec-opc/guard-core/state-io"

async function makeTempWorktree() {
  return fs.mkdtemp(path.join(os.tmpdir(), "codex-runtime-"))
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

test("codex runtime bridge returns rendered guard message for blocked mutations", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir, ["- [ ] todo", "- [ ] fix"].join("\n"))

  const adapter = createCodexAdapter()
  adapter.rememberSelection("sess-runtime-blocked", { kind: "change", name: "add-dark-mode" })
  const bridge = createCodexRuntimeBridge(adapter)

  const result = await bridge.beforeMutation({
    rootDir,
    sessionId: "sess-runtime-blocked",
    tool: "write",
    args: { filePath: "src/app.js" },
  })

  assert.equal(result.ok, false)
  assert.equal(result.decision?.code, "APPLY_READY_FAILED")
  assert.match(result.message || "", /\[opencode-spec-opc\] Blocked by OpenSpec runtime guard\./)
})

test("codex runtime bridge passes through compact summaries", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-runtime-compact",
    phase: "verify",
    redSessionId: "sess-red",
    greenSessionId: "sess-green",
    verifySessionId: "sess-runtime-compact",
    phaseEvidence: {
      redTouchedTestFiles: ["src/app.test.js"],
      greenTouchedImplFiles: ["src/app.js"],
      verifyCommands: ["npm test"],
    },
    updatedAt: new Date().toISOString(),
  })

  const adapter = createCodexAdapter()
  adapter.rememberSelection("sess-runtime-compact", { kind: "change", name: "add-dark-mode" })
  const bridge = createCodexRuntimeBridge(adapter)

  const summary = await bridge.onSessionCompact({
    rootDir,
    sessionId: "sess-runtime-compact",
  })

  assert.ok(summary.some((line) => line.includes("selected_work_item: change:add-dark-mode")))
})
