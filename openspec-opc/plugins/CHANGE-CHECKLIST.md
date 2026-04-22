# Cross-Plugin Change Checklist

Use this checklist whenever a change can affect both runtime plugins (`codex-spec-opc`, `opencode-spec-opc`).

## 1) Scope

- [ ] Confirm whether the change touches shared guard behavior in `packages/opc-guard-core`.
- [ ] Confirm whether the change touches runtime-specific bridge logic in `plugins/codex-spec-opc` and/or `plugins/opencode-spec-opc`.

## 2) Sync points

- [ ] If `state-io.ts` changed, verify both plugins still read/write/apply-reconcile state consistently.
- [ ] If `guard-engine.ts` changed, verify both plugins still render compatible deny/allow behavior.
- [ ] If `tooling.ts` changed, verify path extraction/mutation detection behavior in both runtimes.
- [ ] If selection capture changed, ensure command/file-path parsing is aligned across both plugins.

## 3) Tests

- [ ] Run `npm run test:core`.
- [ ] Run `npm run test:plugins`.
- [ ] If packaging/scaffold code changed, run full `npm test`.

## 4) Release sanity

- [ ] Confirm `.openspec-opc/.openspec-opc-state.json` compatibility is preserved (or migration is documented).
- [ ] Update plugin READMEs when user-facing behavior, lock semantics, or phase invariants changed.
- [ ] Include cross-runtime verification notes in PR description.
