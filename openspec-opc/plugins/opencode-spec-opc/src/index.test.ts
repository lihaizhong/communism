import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { APPLY_STATE_PATH } from "@openspec-opc/guard-core/state-io"
import { createOpenSpecOPCPlugin } from "./index.js"

async function makeTempWorktree(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "opencode-spec-opc-"))
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content)
}

async function createChangeFixture(rootDir: string, overrides: Record<string, string> = {}): Promise<void> {
  const workItemDir = path.join(rootDir, "openspec/changes/add-dark-mode")
  await writeFile(path.join(workItemDir, ".openspec.yaml"), "kind: change\nname: add-dark-mode\n")
  await writeFile(
    path.join(workItemDir, "proposal.md"),
    overrides.proposal ??
      [
        "## Why",
        "Users need a dark mode because the current UI is hard to use at night and strains the eyes during long sessions.",
        "",
        "## What Changes",
        "Add a theme toggle, persist preference, and update shared layout tokens.",
        "",
        "## Non-Goals",
        "No redesign of existing components in this change.",
      ].join("\n"),
  )
  await writeFile(
    path.join(workItemDir, "design.md"),
    overrides.design ??
      [
        "## Affected Modules",
        "- src/theme/store.ts",
        "- src/layout/AppShell.tsx",
        "",
        "## Constraints",
        "- Must preserve existing SSR output",
        "- Must not break persisted settings",
        "",
        "## Approach",
        "Introduce a theme state model and map semantic tokens to light and dark palettes.",
      ].join("\n"),
  )
  await writeFile(
    path.join(workItemDir, "tasks.md"),
    overrides.tasks ??
      [
        "- [ ] Add theme state plumbing in the shared app shell",
        "- [ ] Persist the selected theme in user settings",
      ].join("\n"),
  )
  await writeFile(
    path.join(workItemDir, "specs/ui.md"),
    overrides.spec ??
      [
        "### Requirement: Theme Preference",
        "The application SHALL allow a signed-in user to choose a light or dark theme.",
        "",
        "#### Scenario: Persist selected theme",
        "GIVEN a user has selected dark mode",
        "WHEN they reload the app",
        "THEN the app shows dark mode again",
      ].join("\n"),
  )
}

async function writeApplyState(rootDir: string, state: object): Promise<void> {
  await writeFile(path.join(rootDir, APPLY_STATE_PATH), `${JSON.stringify(state, null, 2)}\n`)
}

async function selectChange(plugin: Awaited<ReturnType<ReturnType<typeof createOpenSpecOPCPlugin>>>, sessionId: string) {
  await plugin["tool.execute.after"](
    { tool: "bash", sessionId },
    { args: { command: "openspec --change add-dark-mode" }, context: [] },
  )
}

test("blocks placeholder tasks before apply-ready", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir, {
    tasks: ["- [ ] todo", "- [ ] fix"].join("\n"),
  })

  const pluginFactory = createOpenSpecOPCPlugin()
  const plugin = await pluginFactory({ worktree: rootDir })
  await selectChange(plugin, "sess-placeholder")

  await assert.rejects(
    plugin["tool.execute.before"](
      { tool: "write", sessionId: "sess-placeholder" },
      { args: { filePath: "src/app.js" }, context: [] },
    ),
    (error: Error) => {
      assert.match(error.message, /failed_gates:/i)
      assert.match(error.message, /tasks\.md contains placeholder or low-signal tasks/i)
      assert.match(error.message, /next_steps:/i)
      return true
    },
  )
})

test("allows quality-passing work items to reach apply lock checks", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)

  const pluginFactory = createOpenSpecOPCPlugin()
  const plugin = await pluginFactory({ worktree: rootDir })
  await selectChange(plugin, "sess-ready")

  await assert.rejects(
    plugin["tool.execute.before"](
      { tool: "write", sessionId: "sess-ready" },
      { args: { filePath: "src/app.js" }, context: [] },
    ),
    /Business code writes require an explicit \/opsx-apply session lock/i,
  )
})

test("allows openspec artifact writes in any phase", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-red",
    phase: "red",
    redSessionId: "sess-red",
    phaseEvidence: {
      redTouchedTestFiles: [],
      greenTouchedImplFiles: [],
    },
    updatedAt: new Date().toISOString(),
  })

  const pluginFactory = createOpenSpecOPCPlugin()
  const plugin = await pluginFactory({ worktree: rootDir })
  await selectChange(plugin, "sess-red")

  // OpenSpec artifacts should always be allowed, regardless of phase
  await plugin["tool.execute.before"](
    { tool: "write", sessionId: "sess-red" },
    { args: { filePath: "openspec/changes/add-dark-mode/design.md" }, context: [] },
  )
})

test("allows bash writes that only mutate openspec artifacts", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)

  const pluginFactory = createOpenSpecOPCPlugin()
  const plugin = await pluginFactory({ worktree: rootDir })

  for (const command of [
    "mkdir -p openspec/changes/add-dark-mode/specs && cat > openspec/changes/add-dark-mode/specs/ui.md",
    "mkdir -p openspec/changes/add-dark-mode/specs; cat > openspec/changes/add-dark-mode/specs/ui.md",
    "cp tmp/generated.md openspec/changes/add-dark-mode/specs/ui.test.md",
    "install -m 0644 tmp/generated.md openspec/changes/add-dark-mode/specs/ui.test.md",
  ]) {
    await assert.doesNotReject(
      plugin["tool.execute.before"]({ tool: "bash", sessionId: "sess-doc-bash" }, { args: { command }, context: [] }),
    )
  }
})

test("blocks green phase until red test evidence exists", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-green",
    phase: "green",
    greenSessionId: "sess-green",
    phaseEvidence: {
      redTouchedTestFiles: [],
      greenTouchedImplFiles: [],
    },
    updatedAt: new Date().toISOString(),
  })

  const pluginFactory = createOpenSpecOPCPlugin()
  const plugin = await pluginFactory({ worktree: rootDir })
  await selectChange(plugin, "sess-green")

  await assert.rejects(
    plugin["tool.execute.before"](
      { tool: "write", sessionId: "sess-green" },
      { args: { filePath: "src/app.js" }, context: [] },
    ),
    /Green phase requires red-phase test evidence first/i,
  )
})

test("records red test evidence and then allows green phase to reach lock checks", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)

  const pluginFactory = createOpenSpecOPCPlugin()
  const redPlugin = await pluginFactory({ worktree: rootDir })
  await selectChange(redPlugin, "sess-red-pass")
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-red-pass",
    phase: "red",
    redSessionId: "sess-red-pass",
    phaseEvidence: {
      redTouchedTestFiles: [],
      greenTouchedImplFiles: [],
    },
    updatedAt: new Date().toISOString(),
  })

  await redPlugin["tool.execute.before"](
    { tool: "write", sessionId: "sess-red-pass" },
    { args: { filePath: "src/app.test.js" }, context: [] },
  )
  await redPlugin["tool.execute.after"](
    { tool: "write", sessionId: "sess-red-pass" },
    { args: { filePath: "src/app.test.js" }, context: [] },
  )

  const updatedAfterRed = JSON.parse(await fs.readFile(path.join(rootDir, APPLY_STATE_PATH), "utf8")) as {
    phaseEvidence: { redTouchedTestFiles: string[] }
  }
  assert.deepEqual(updatedAfterRed.phaseEvidence.redTouchedTestFiles, ["src/app.test.js"])

  await writeApplyState(rootDir, {
    ...updatedAfterRed,
    sessionId: "sess-green-pass",
    phase: "green",
    greenSessionId: "sess-green-pass",
    updatedAt: new Date().toISOString(),
  })

  const greenPlugin = await pluginFactory({ worktree: rootDir })
  await selectChange(greenPlugin, "sess-green-pass")

  await assert.doesNotReject(
    greenPlugin["tool.execute.before"](
      { tool: "write", sessionId: "sess-green-pass" },
      { args: { filePath: "src/app.js" }, context: [] },
    ),
  )

  await greenPlugin["tool.execute.after"](
    { tool: "write", sessionId: "sess-green-pass" },
    { args: { filePath: "src/app.js" }, context: [] },
  )
  const updatedAfterGreen = JSON.parse(await fs.readFile(path.join(rootDir, APPLY_STATE_PATH), "utf8")) as {
    phaseEvidence: { greenTouchedImplFiles: string[] }
  }
  assert.deepEqual(updatedAfterGreen.phaseEvidence.greenTouchedImplFiles, ["src/app.js"])
})

test("allows openspec artifact writes in verify phase", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-verify",
    phase: "verify",
    verifySessionId: "sess-verify",
    redSessionId: "sess-red-before-verify",
    greenSessionId: "sess-green-before-verify",
    phaseEvidence: {
      redTouchedTestFiles: ["src/app.test.js"],
      greenTouchedImplFiles: ["src/app.js"],
      verifyCommands: [],
    },
    updatedAt: new Date().toISOString(),
  })

  const pluginFactory = createOpenSpecOPCPlugin()
  const plugin = await pluginFactory({ worktree: rootDir })
  await selectChange(plugin, "sess-verify")

  // OpenSpec artifacts should always be allowed, even in verify phase
  await plugin["tool.execute.before"](
    { tool: "write", sessionId: "sess-verify" },
    { args: { filePath: "openspec/changes/add-dark-mode/verification.md" }, context: [] },
  )
})

test("records verify commands and then allows verify-phase summary writes", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-verify-pass",
    phase: "verify",
    verifySessionId: "sess-verify-pass",
    redSessionId: "sess-red-before-verify-pass",
    greenSessionId: "sess-green-before-verify-pass",
    phaseEvidence: {
      redTouchedTestFiles: ["src/app.test.js"],
      greenTouchedImplFiles: ["src/app.js"],
      verifyCommands: [],
    },
    updatedAt: new Date().toISOString(),
  })

  const pluginFactory = createOpenSpecOPCPlugin()
  const plugin = await pluginFactory({ worktree: rootDir })
  await selectChange(plugin, "sess-verify-pass")

  await plugin["tool.execute.after"](
    { tool: "bash", sessionId: "sess-verify-pass" },
    { args: { command: "npm test" }, context: [] },
  )

  const updatedAfterVerify = JSON.parse(await fs.readFile(path.join(rootDir, APPLY_STATE_PATH), "utf8")) as {
    phaseEvidence: { verifyCommands: string[] }
  }
  assert.deepEqual(updatedAfterVerify.phaseEvidence.verifyCommands, ["npm test"])

  await assert.doesNotReject(
    plugin["tool.execute.before"](
      { tool: "write", sessionId: "sess-verify-pass" },
      { args: { filePath: "openspec/changes/add-dark-mode/verification.md" }, context: [] },
    ),
  )
})

test("blocks verify-phase bash mutations that target business code", async () => {
  const rootDir = await makeTempWorktree()
  await createChangeFixture(rootDir)
  await writeApplyState(rootDir, {
    mode: "apply",
    kind: "change",
    name: "add-dark-mode",
    sessionId: "sess-verify-bash",
    phase: "verify",
    verifySessionId: "sess-verify-bash",
    redSessionId: "sess-red-before-verify-bash",
    greenSessionId: "sess-green-before-verify-bash",
    phaseEvidence: {
      redTouchedTestFiles: ["src/app.test.js"],
      greenTouchedImplFiles: ["src/app.js"],
      verifyCommands: ["npm test"],
    },
    updatedAt: new Date().toISOString(),
  })

  const pluginFactory = createOpenSpecOPCPlugin()
  const plugin = await pluginFactory({ worktree: rootDir })
  await selectChange(plugin, "sess-verify-bash")

  await assert.rejects(
    plugin["tool.execute.before"](
      { tool: "bash", sessionId: "sess-verify-bash" },
      { args: { command: "rm src/app.js" }, context: [] },
    ),
    /Verify phase may not write business code/i,
  )
})
