import assert from "node:assert/strict"
import test from "node:test"

import { DEFAULT_GUARD_CONFIG, evaluateChangeQuality } from "./guard-engine.js"

test("rejects untouched test-contract scaffold", () => {
  const result = evaluateChangeQuality(
    {
      proposal: [
        "## Why",
        "The workflow needs a dedicated contract so testing obligations stay explicit and reviewable before implementation begins.",
        "",
        "## What Changes",
        "Require a concrete test contract artifact and block apply-readiness when the document is still just scaffold text.",
      ].join("\n"),
      design: [
        "## Affected Modules",
        "- packages/opc-guard-core/src/guard-engine.ts",
        "",
        "## Constraints",
        "- Reject untouched scaffolds without blocking valid authored contracts.",
        "",
        "## Approach",
        "Detect unresolved placeholder markers, template guidance comments, and empty scaffold fields so the stock template cannot satisfy the quality gate by itself.",
      ].join("\n"),
      testContract: [
        "# Test Contract",
        "",
        "## Purpose",
        "",
        "<!-- What testing problem this contract constrains -->",
        "",
        "## Derived From",
        "",
        "<!-- Reference the spec requirements or scenarios this contract is derived from -->",
        "",
        "## Positive Anchors",
        "",
        "### Anchor: {{anchor_name}}",
        "",
        "- proves:",
        "- maps_to:",
        "- minimum_expected_signal:",
        "",
        "## Negative Obligations",
        "",
        "### Case: {{case_name}}",
        "",
        "- trigger:",
        "- expected_failure_or_guard:",
        "- maps_to:",
        "",
        "## Boundary Obligations",
        "",
        "### Boundary: {{boundary_name}}",
        "",
        "- boundary_dimension:",
        "- input_or_state:",
        "- expected_behavior:",
        "- maps_to:",
        "",
        "## Must-Not-Expand",
        "",
        "- cases AI must not invent in this change",
        "- environments explicitly excluded",
        "- integration depth explicitly excluded",
        "",
        "## Verify Evidence",
        "",
        "- commands that must be run",
        "- evidence artifacts expected",
        "- failure modes that must remain visible",
        "",
        "## Notes",
        "",
        "- temporary assumptions or references",
        "",
        "---",
        "",
        "_Test contract for OpenSpec spec-driven workflow_",
      ].join("\n"),
      specContents: [
        [
          "### Requirement: Test Contract Enforcement",
          "The workflow SHALL reject an untouched test-contract scaffold before implementation starts.",
          "",
          "#### Scenario: Placeholder scaffold",
          "GIVEN the stock test-contract template has not been authored",
          "WHEN readiness is evaluated",
          "THEN the workflow blocks apply-readiness with a scaffold-specific failure",
        ].join("\n"),
      ],
    },
    {
      total: 2,
      remaining: 1,
      complete: 1,
      items: [
        { done: false, text: "Reject untouched test contract scaffolds in the runtime guard" },
        { done: true, text: "Document the validation rule in the template workflow" },
      ],
    },
    [],
    {
      ...DEFAULT_GUARD_CONFIG,
      minProposalChars: 1,
      minDesignChars: 1,
      minTestContractChars: 1,
    },
  )

  assert.equal(result.ready, false)
  assert.ok(
    result.failures.includes(
      "test-contract.md still contains untouched scaffold placeholders; replace template markers and guidance comments with change-specific obligations and evidence",
    ),
  )
})
