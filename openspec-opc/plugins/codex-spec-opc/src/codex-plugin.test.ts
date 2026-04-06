import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { createCodexPlugin } from "./codex-plugin.js"
import { APPLY_STATE_PATH } from "@openspec-opc/guard-core/state-io"

async function makeTempWorktree() {
  return fs.mkdtemp(path.join(os.tmpdir(), "codex-plugin-"))
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

test("codex plugin install wires beforeMutation to block invalid writes", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir, ["- [ ] todo", "- [ ] fix"].join("\n"))

  let beforeHandler = null as null | ((event: any) => Promise<any>)
  const plugin = createCodexPlugin()
  plugin.install({
    onBeforeMutation(handler) {
      beforeHandler = handler
    },
    onAfterMutation() {},
    onSessionCompact() {},
  })

  assert.ok(beforeHandler)
  const result = await beforeHandler!({
    rootDir,
    sessionId: "sess-plugin-block",
    tool: "bash",
    args: { command: "openspec --change add-dark-mode" },
  })

  assert.equal(result.action, "allow")

  const blocked = await beforeHandler!({
    rootDir,
    sessionId: "sess-plugin-block",
    tool: "write",
    args: { filePath: "src/app.js" },
  })

  assert.equal(blocked.action, "block")
  assert.equal(blocked.code, "APPLY_READY_FAILED")
  assert.match(blocked.message, /Blocked by OpenSpec runtime guard/)
})

test("codex plugin install wires compact hook to summary output", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-plugin-compact",
    phase: "verify",
    redSessionId: "sess-red",
    greenSessionId: "sess-green",
    verifySessionId: "sess-plugin-compact",
    phaseEvidence: {
      redTouchedTestFiles: ["src/app.test.js"],
      greenTouchedImplFiles: ["src/app.js"],
      verifyCommands: ["npm test"],
    },
    updatedAt: new Date().toISOString(),
  })

  let beforeHandler = null as null | ((event: any) => Promise<any>)
  let compactHandler = null as null | ((event: any) => Promise<string[]>)
  const plugin = createCodexPlugin()
  plugin.install({
    onBeforeMutation(handler) {
      beforeHandler = handler
    },
    onAfterMutation() {},
    onSessionCompact(handler) {
      compactHandler = handler
    },
  })

  await beforeHandler!({
    rootDir,
    sessionId: "sess-plugin-compact",
    tool: "bash",
    args: { command: "openspec --change add-dark-mode" },
  })

  const summary = await compactHandler!({
    rootDir,
    sessionId: "sess-plugin-compact",
  })

  assert.ok(summary.some((line) => line.includes("selected_work_item: change:add-dark-mode")))
})
