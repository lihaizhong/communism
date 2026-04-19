import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { DEFAULT_GUARD_CONFIG } from "./guard-engine.js"
import { collectWorkflowState, readTextFile } from "./workflow-state.js"

async function writeFile(filePath: string, content: string | Buffer): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content)
}

const gb18030 = (hex: string) => Buffer.from(hex, "hex")

test("collects GB18030-encoded Windows OpenSpec markdown files", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "opc-guard-core-"))
  const workItemDir = path.join(rootDir, "openspec/changes/win-encoding")

  await writeFile(path.join(workItemDir, ".openspec.yaml"), "kind: change\nname: win-encoding\n")
  await writeFile(
    path.join(workItemDir, "proposal.md"),
    gb18030(
      "232320ceaacab2c3b4d7f60ad3c3bba7d0e8d2aad5e2b8f6c4dcc1a6c0b4cdeab3c9d5e6cab5d2b5cef1c1f7b3cca3acb2a2c7d2b5b1c7b0c1f7b3ccd4dab9d8bcfcb3a1beb0cfc2bbe1caa7b0dca3acd0e8d2aac3f7c8b7b1dfbde7bacdb7e7cfd5a1a30a0a232320b1e4b8fcc4dac8dd0ad4f6bcd3cec8b6a8b5c4b4a6c0edc2b7beb6a3acb1a3d6a4d6d0cec4cec4b5b5d4da2057696e646f777320bbb7beb3cfc2d2b2c4dccda8b9fdd6cac1bfc3c5a1a30a",
    ),
  )
  await writeFile(
    path.join(workItemDir, "design.md"),
    gb18030(
      "232320d3b0cfecc4a3bfe90a2d206f70656e737065632072756e74696d652067756172640a2d20776f726b666c6f7720737461746520636f6c6c6563746f720a0a232320d4bccaf80ab1d8d0ebbce6c8dd2057696e646f777320cfc2b3a3bcfbb5c4b1beb5d8b1e0c2ebcec4bcfea3accdaccab1b2bbc4dcc6c6bbb5205554462d3820cec4b5b5a1a30a0a232320bcbccaf5b7bdb0b80ab6c1c8a1206d61726b646f776e20cec4b5b5cab1cfc8d1cfb8f1b3a2cad4205554462d38a3accaa7b0dcbbf2b3f6cfd6cce6bbbbd7d6b7fbcab12066616c6c6261636b20b5bd2047423138303330a1a30a",
    ),
  )
  await writeFile(
    path.join(workItemDir, "test-contract.md"),
    [
      "# Test Contract",
      "",
      "## Purpose",
      "Constrain test scope for the workflow guard.",
      "",
      "## Derived From",
      "- Requirement: Windows Encoding",
      "",
      "## Positive Anchors",
      "### Anchor: decoded markdown",
      "- proves: GB18030 markdown is read correctly",
      "- maps_to: workflow state collection",
      "- minimum_expected_signal: decoded headings are visible",
      "",
      "## Negative Obligations",
      "### Case: malformed markdown",
      "- trigger: unreadable or placeholder content",
      "- expected_failure_or_guard: quality gate blocks readiness",
      "- maps_to: runtime guard quality check",
      "",
      "## Boundary Obligations",
      "### Boundary: non-UTF8 content",
      "- boundary_dimension: encoding",
      "- input_or_state: GB18030 markdown",
      "- expected_behavior: fallback decoding still yields readable text",
      "- maps_to: workflow state collection",
      "",
      "## Must-Not-Expand",
      "- do not invent new schemas",
      "- do not treat the contract as a happy-path spec",
      "",
      "## Verify Evidence",
      "- collectWorkflowState()",
      "- guard quality evaluation",
      "- ready item reporting",
    ].join("\n"),
  )
  await writeFile(
    path.join(workItemDir, "tasks.md"),
    gb18030(
      "2d205b205d20d4f6bcd32057696e646f777320b1e0c2ebb6c1c8a1bbd8b9e9b2e2cad40a2d205b205d20b1a3b3d6205554462d3820cec4b5b5b6c1c8a1d0d0ceaab2bbb1e40a",
    ),
  )
  await writeFile(
    path.join(workItemDir, "specs/ui.md"),
    [
      "### Requirement: Windows Encoding",
      "The guard SHALL read Windows-authored markdown files.",
      "",
      "#### Scenario: GB18030 markdown",
      "GIVEN a markdown file saved with GB18030",
      "WHEN workflow state is collected",
      "THEN quality gates use the decoded text",
    ].join("\n"),
  )

  assert.match(await readTextFile(path.join(workItemDir, "design.md")), /## 影响模块/)

  const state = await collectWorkflowState(rootDir, {
    ...DEFAULT_GUARD_CONFIG,
    minProposalChars: 80,
    minDesignChars: 120,
  })
  assert.equal(state.changes[0]?.ready, true)
  assert.deepEqual(state.changes[0]?.quality.failures, [])
  assert.equal(state.readyItems[0]?.name, "win-encoding")
})

test("missing test-contract blocks spec-driven readiness", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "opc-guard-core-"))
  const workItemDir = path.join(rootDir, "openspec/changes/missing-test-contract")

  await writeFile(path.join(workItemDir, ".openspec.yaml"), "kind: change\nname: missing-test-contract\n")
  await writeFile(
    path.join(workItemDir, "proposal.md"),
    [
      "## Why",
      "The workflow needs stronger test obligations.",
      "",
      "## What Changes",
      "Add a first-class test contract artifact.",
    ].join("\n"),
  )
  await writeFile(
    path.join(workItemDir, "design.md"),
    [
      "## Affected Modules",
      "- src/workflow-state.ts",
      "",
      "## Constraints",
      "- Keep the workflow deterministic",
      "",
      "## Approach",
      "Require a dedicated test-contract artifact before implementation starts.",
    ].join("\n"),
  )
  await writeFile(
    path.join(workItemDir, "tasks.md"),
    ["- [ ] Add the new artifact", "- [ ] Update runtime quality gates"].join("\n"),
  )
  await writeFile(
    path.join(workItemDir, "specs/ui.md"),
    [
      "### Requirement: Test Contract",
      "The workflow SHALL require a dedicated test contract artifact.",
    ].join("\n"),
  )

  const state = await collectWorkflowState(rootDir)
  assert.equal(state.changes[0]?.ready, false)
  assert.ok(state.changes[0]?.missing.includes("test-contract.md"))
})
