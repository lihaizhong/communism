import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { APPLY_STATE_PATH, LEGACY_APPLY_STATE_PATH } from "./constants.js"
import { reconcileApplyState, readApplyState, writeApplyState } from "./state-io.js"
import type { ApplyState } from "./types.js"

async function makeTempWorktree(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "opc-state-io-"))
}

async function writeJson(rootDir: string, relativePath: string, value: object): Promise<void> {
  const absolutePath = path.join(rootDir, relativePath)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`)
}

function applyState(name: string): ApplyState {
  return {
    mode: "apply",
    kind: "change",
    name,
    sessionId: `sess-${name}`,
  }
}

test("writes and reads apply state from the openspec-opc state path", async () => {
  const rootDir = await makeTempWorktree()
  await writeApplyState(rootDir, applyState("new-path"))

  assert.equal(JSON.parse(await fs.readFile(path.join(rootDir, APPLY_STATE_PATH), "utf8")).name, "new-path")
  assert.equal((await readApplyState(rootDir))?.name, "new-path")
})

test("ignores the legacy opencode-named apply state path", async () => {
  const rootDir = await makeTempWorktree()
  await writeJson(rootDir, LEGACY_APPLY_STATE_PATH, applyState("legacy-path"))

  assert.equal(await readApplyState(rootDir), null)
})

test("prefers the openspec-opc apply state when both state files exist", async () => {
  const rootDir = await makeTempWorktree()
  await writeJson(rootDir, LEGACY_APPLY_STATE_PATH, applyState("legacy-path"))
  await writeJson(rootDir, APPLY_STATE_PATH, applyState("new-path"))

  assert.equal((await readApplyState(rootDir))?.name, "new-path")
})

test("writeApplyState backfills metadata fields", async () => {
  const rootDir = await makeTempWorktree()
  await writeApplyState(rootDir, applyState("meta-path"))
  const state = await readApplyState(rootDir)

  assert.equal(state?.stateVersion, 1)
  assert.equal(state?.targetId, "change:meta-path")
  assert.ok(state?.updatedAt)
})

test("reconcileApplyState resets phase evidence for missing work items", async () => {
  const rootDir = await makeTempWorktree()
  await writeApplyState(rootDir, {
    ...applyState("stale"),
    phase: "verify",
    redSessionId: "sess-red",
    greenSessionId: "sess-green",
    verifySessionId: "sess-verify",
    phaseEvidence: {
      redTouchedTestFiles: ["src/app.test.ts"],
      greenTouchedImplFiles: ["src/app.ts"],
      verifyCommands: ["npm test"],
    },
  })

  const reconciled = await reconcileApplyState(rootDir, await readApplyState(rootDir), {
    changes: [],
    bugfixes: [],
    readyItems: [],
  })

  assert.equal(reconciled?.phase, "red")
  assert.equal(reconciled?.redSessionId, undefined)
  assert.equal(reconciled?.greenSessionId, undefined)
  assert.equal(reconciled?.verifySessionId, undefined)
  assert.deepEqual(reconciled?.phaseEvidence, {})
})
