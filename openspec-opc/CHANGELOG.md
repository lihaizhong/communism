# Changelog

All notable changes to `openspec-opc` are documented in this file.

## 0.3.0 - 2026-04-22

This release unifies all OpenSpec OPC internal state under a single hidden directory and simplifies the task ledger filename.

### Changed

- **BREAKING**: Unified all openspec-opc internal state (lock, plan, bundle cache, apply state, rollback) under `.openspec-opc/` instead of scattering across `.openspec/`, `openspec/`, and `.openspec-opc/`.
  - Canonical lock path: `.openspec-opc/.openspec-opc-template-lock.json` (was `openspec/.openspec-opc-template-lock.json`)
  - Bundle cache: `.openspec-opc/.cache/openspec-opc-upgrade-bundle` (was `.openspec/.cache/...`)
  - Upgrade plan: `.openspec-opc/install-upgrade-plan.txt` (was `openspec/install-upgrade-plan.txt`)
  - Apply state: `.openspec-opc/.openspec-opc-state.json` (was `openspec/.openspec-opc-state.json`)
  - Install result/report/json: `.openspec-opc/install-result.txt`, `.openspec-opc/install-report.md`, `.openspec-opc/install-report.json` (was `openspec/...`)
  - Rollback remains at `.openspec-opc/rollback/`
  - Old canonical and legacy paths are still read for backward compatibility and migrated on the next successful apply.
- **BREAKING**: Renamed the task ledger from `harness-install-tasks.md` to `install-tasks.md` across all stages, templates, schema, and documentation.
- Bumped the lockstep workspace package versions to `0.3.0` for `@openspec-opc/guard-core`, `@openspec-opc/opencode-plugin`, and `@openspec-opc/codex-plugin`.

## 0.2.2 - 2026-04-19

This patch release adds the new spec-driven test-contract artifact to the shipped template set and tightens readiness validation so untouched scaffolds no longer pass as authored work.

### Added

- Added the tracked `test-contract.md` template under `.template/openspec/schemas/spec-driven/templates/` so new spec-driven work items can generate the required artifact end-to-end.
- Added a regression test in `packages/opc-guard-core/src/guard-engine.test.ts` to keep untouched `test-contract.md` scaffolds blocked by the quality gate.

### Changed

- Bumped the lockstep workspace package versions to `0.2.2` for `@openspec-opc/guard-core`, `@openspec-opc/opencode-plugin`, and `@openspec-opc/codex-plugin`.
- Tightened `test-contract.md` readiness checks so placeholder markers, guidance comments, and unfilled scaffold fields fail apply-readiness instead of passing on structure alone.
- Marked `install.md` with the current installer entry version `0.2.2` to keep installation entrypoints aligned with the released workspace packages.

## 0.2.1 - 2026-04-17

This patch release hardens apply-state consistency and streamlines multi-plugin maintenance.

### Added

- Added apply-state metadata normalization with `stateVersion` and `targetId`.
- Added atomic apply-state writes with lock-file coordination in `state-io`.
- Added `reconcileApplyState()` to recover stale apply state when selected work items no longer exist.
- Added workspace-level plugin maintenance helpers:
  `npm run build:plugins`, `npm run test:plugins`, and `npm run check:plugins`.
- Added cross-plugin maintenance checklist at `plugins/CHANGE-CHECKLIST.md`.

### Changed

- Updated both runtime adapters (`codex` and `opencode`) to reconcile apply state against live workflow scans before guard enforcement.
- Updated `README.md` to document plugin aggregate scripts and checklist entry points.

## 0.2.0 - 2026-04-11

This release turns `openspec-opc` into a publishable multi-package workspace with
installer contracts, runtime guard adapters, and a documented manual release path.

### Added

- Added the `@openspec-opc/guard-core` package to centralize runtime enforcement,
  state IO, tooling selection, and workflow-state collection.
- Added `@openspec-opc/opencode-plugin` as the formal OpenCode adapter and
  `@openspec-opc/codex-plugin` as the experimental Codex scaffold adapter.
- Added installer contract coverage for lane detection, profile smoke, rendered
  result cards, stop-point handling, and fixture walkthroughs.
- Added `node-ts-minimal`, `node-ts-app`, and `node-ts-service` install-manual
  fixtures with expected artifacts and real smoke/lint commands.
- Added preview and release utility scripts:
  `scripts/preview-demo.mjs`, `scripts/check-workspace-versions.mjs`,
  `scripts/pack-dry-run.mjs`, and `scripts/benchmark-guard.mjs`.
- Added workspace development and release documentation in
  `docs/08-workspace-development.md` and `docs/09-release.md`.

### Changed

- Reworked the installer flow and result-card contracts so stage validation and
  install-manual output stay aligned.
- Tightened lane and result contract rules, including correct `node-ts` library
  profile resolution and explicit profile-smoke gating.
- Simplified package builds to compile directly with `tsc`.
- Clarified `install.md`, onboarding links, and the OpenCode config guidance so
  installs point at `.opencode/opencode.json` instead of a bridge loader path.
- Documented the system design baseline in `DESIGN.md` and refreshed the main
  `README.md` to match the workspace/package architecture.

### Notes

- `@openspec-opc/codex-plugin` remains an experimental scaffold and should still
  be treated as a provisional integration surface.
- Publish the workspace packages in dependency order:
  `@openspec-opc/guard-core`, `@openspec-opc/opencode-plugin`,
  `@openspec-opc/codex-plugin`.
