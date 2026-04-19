# Implementation Tasks

## Phase 1: Red (Write Tests)

**Owner:** red subagent

Red tasks should be derived from `test-contract.md`, especially Negative Obligations, Boundary Obligations, and selected Positive Anchors.

{{#tasks.red}}

### {{number}}. {{title}}

- [ ] {{action}}
- **Verifiable by:** Test fails
  {{/tasks.red}}

## Phase 2: Green (Make Tests Pass)

**Owner:** green subagent

{{#tasks.green}}

### {{number}}. {{title}}

- [ ] {{action}}
- **Verifiable by:** Test passes
  {{/tasks.green}}

## Phase 3: Refactor (Improve Code)

**Owner:** green subagent

{{#tasks.refactor}}

### {{number}}. {{title}}

- [ ] {{action}}
- **Verifiable by:** Tests still pass, code improved
  {{/tasks.refactor}}

## Verification Checklist

**Owner:** verify subagent

- [ ] All configured tests pass
- [ ] Configured lint or equivalent quality checks pass
- [ ] Configured type-check, compiler, or static analysis passes
- [ ] Configured format check passes if applicable

---

_Tasks organized using TDD Red-Green-Refactor cycle_
