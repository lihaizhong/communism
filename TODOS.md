# TODOs

## OpenSpec OPC Runtime Guard Benchmark

- **What:** Add a benchmark for `collectWorkflowState()` / mutating hook latency with 10, 100, and 500 active OpenSpec work items.
- **Why:** Runtime guard checks currently scan `openspec/changes` and `openspec/bugs` on mutating tool calls. Large downstream repositories may feel edit latency if the scan cost grows.
- **Pros:** Gives future cache work a real baseline instead of optimizing by guesswork.
- **Cons:** Adds one maintenance surface; keep it out of the release gate until the benchmark is stable enough to avoid flaky local runs.
- **Context:** During `/plan-eng-review` for the OpenSpec OPC open-source refactor, we chose not to implement workflow-state caching in the release-critical cleanup. The follow-up should measure hook latency after the state path and core helper refactor lands, then decide whether caching is worth the safety complexity.
- **Depends on / blocked by:** Complete the OpenSpec OPC full architecture cleanup first, especially the state path rename and core helper extraction.

## OpenSpec OPC App Profile Smoke-Test Contract

- **What:** Define a frontend page smoke-test contract for the `Node/TS` `app` profile in the OpenSpec OPC conformance system.
- **Why:** The new lane architecture will prove `lint / test / typecheck`, but app-shaped projects eventually need a minimal “page opens and core frontend path is alive” guarantee to match the product promise.
- **Pros:** Extends conformance from static quality gates into user-visible runtime confidence for frontend projects.
- **Cons:** Adds profile-specific runtime assumptions and can easily over-generalize if introduced before the base lane is stable.
- **Context:** During `/plan-ceo-review` for the installer lane redesign, we deliberately kept page smoke tests out of the first `Node/TS` lane so the first release could focus on lane registry, profiles, conformance artifacts, and real execution of `lint / test / typecheck`. This follow-up should define when an `app` profile is eligible for smoke testing, what the minimum check is, and how it is reported in conformance results.
- **Effort estimate:** M (human team) → S with CC+gstack
- **Priority:** P2
- **Depends on / blocked by:** Ship the first `Node/TS` reference lane with registry, profiles, conformance report/JSON, and fixture coverage.

## OpenSpec OPC Service Profile API Smoke-Test Contract

- **What:** Define an API smoke-test contract for the `Node/TS` `service` profile in the OpenSpec OPC conformance system.
- **Why:** Service-shaped projects need a minimal proof that the process can start and at least one health or success path can respond, not just that static quality gates pass.
- **Pros:** Moves the service profile closer to the user outcome of “call the API and it works,” which is part of the product promise behind the installer redesign.
- **Cons:** Introduces runtime boot and environment assumptions that should not be forced into the first lane release before the base conformance model is stable.
- **Context:** During `/plan-ceo-review` for the installer lane redesign, we deferred API smoke testing so the first release could establish the lane registry, canonical error model, conformance engine, and fixture-backed `Node/TS` profiles without broadening scope into service runtime orchestration too early. This follow-up should define the minimum viable service smoke test, failure semantics, and how it plugs into conformance reporting.
- **Effort estimate:** M (human team) → S with CC+gstack
- **Priority:** P2
- **Depends on / blocked by:** Ship the first `Node/TS` reference lane and stabilize the `service` profile contract.

## OpenSpec OPC Node/TS Fixture Conformance Projects

- **What:** Add `app / service / library` fixture sample projects for the `Node/TS` reference lane and run them in repository development / CI as conformance proof inputs.
- **Why:** The first implementation batch now intentionally stops before fixture proofing so the core architecture can land with less complexity. This TODO captures the next-phase evidence layer that proves the lane contract works against real project shapes instead of only internal logic.
- **Pros:** Catches drift between the lane registry, shared base, profiles, and canonical result model; gives future lane work a stable proof harness; keeps fixture execution out of the end-user install hot path while still making the platform trustworthy.
- **Cons:** Adds sample-project maintenance cost and broadens CI surface area; if pulled into the first batch, it meaningfully delays delivery of the core installer refactor.
- **Context:** During `/plan-eng-review` on 2026-04-10, the first implementation batch was intentionally reduced to `lane registry + Node/TS shared base/profile + canonical conformance engine + report/JSON + stage adapters`. Fixture conformance was explicitly deferred to the next batch rather than dropped, so this entry preserves that decision with enough context to resume later.
- **Effort estimate:** M (human team) → S with CC+gstack
- **Priority:** P2
- **Depends on / blocked by:** Ship the first reduced implementation batch and stabilize the new registry, engine, result model, and stage adapters first.

## Repo-Wide Installer Output DESIGN.md

- **What:** Create a repo-level `DESIGN.md` that promotes the installer/output language decisions from the current `openspec-opc` plan into a reusable design baseline for future scaffold lanes and user-facing CLI/report surfaces.
- **Why:** The current design review added a strong installer-specific design language to the plan, but without a repo-wide design source of truth, future lanes and scaffold outputs can still drift in tone, state labels, hierarchy, and report structure.
- **Pros:** Turns one-off plan decisions into durable design constraints; gives future Java/Python lanes a reusable output language; reduces drift in stop-point copy, result-card hierarchy, and report formatting.
- **Cons:** Broadens scope beyond the current installer lane; risks over-generalizing before the first lane ships and proves which design rules actually hold up in practice.
- **Context:** During `/plan-design-review` on 2026-04-11, we intentionally kept this work out of the current installer-lane plan. The review added a minimal `Installer Design Language` section to the plan file, but explicitly stopped short of creating a repo-wide `DESIGN.md`. This TODO captures that next-phase consolidation step with enough context to revisit later.
- **Effort estimate:** M (human team) → S with CC+gstack
- **Priority:** P2
- **Depends on / blocked by:** Ship the first `Node/TS` installer lane and validate that the current output language is stable enough to promote into a repo-wide design system.

## OpenSpec OPC Zero-Install DX Preview

- **What:** Add a zero-install preview surface for OpenSpec OPC, such as a hosted sandbox, scripted interactive demo, or equivalent "see the magical moment before installing" experience.
- **Why:** The current DX plan can realistically reach a competitive `2-5` minute time-to-first-value once the README hero, installer promise, golden path, and default first run land, but it still requires developers to wire the tool into their own repo before they experience the product's core value.
- **Pros:** Lowers first-contact friction, increases landing-page conversion, and creates a path from competitive tier toward champion-tier onboarding without weakening the real installer flow.
- **Cons:** Higher implementation and maintenance cost; easy to build a polished but misleading demo because OpenSpec OPC's real value depends on the developer's own repository and AI workflow.
- **Context:** During `/plan-devex-review` on 2026-04-11, we intentionally kept this out of the first implementation batch. The current batch should first land the developer-facing installer promise, three-step golden path, expected-output contracts, first-run bridge, troubleshooting path, and upgrade journey. This TODO captures the next-phase DX advantage work without expanding the current implementation scope.
- **Effort estimate:** L (human team) → M with CC+gstack
- **Priority:** P3
- **Depends on / blocked by:** Ship the first `Node/TS` installer lane and validate that the default first-run experience, result card, and trust signals are stable enough to mirror in a preview experience.
