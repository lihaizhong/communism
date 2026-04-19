---
target: AI Assistant
purpose: Minimal operating rules for {{PROJECT_NAME}}
version: 1.0
---

# AI Agent Guidelines - {{PROJECT_NAME}}

## Context

{{PROJECT_NAME}} - {{PROJECT_DESCRIPTION}}

Read [openspec/config.yaml](./openspec/config.yaml) for project facts, commands, modules, and workflow settings.

## Principles

- Think Before Coding: state assumptions, surface ambiguity, ask before guessing
- Simplicity First: prefer the smallest change that solves the request
- Surgical Changes: touch only what the task requires
- Goal-Driven Execution: define success with checks, verify before finishing

## Core Rules

1. Work from the current OpenSpec artifacts.
   - For feature work, use `openspec/changes/<name>/`
   - For bugfix work, use `openspec/bugs/<id>/`
2. Treat `openspec/config.yaml` as the source of truth for project commands and technical facts.
3. Keep spec-driven changes aligned with approved specs, `test-contract.md`, design, and tasks.
4. Prefer small, reversible changes over broad rewrites.
5. Preserve existing repository conventions unless the current change explicitly updates them.

## Repository-Specific Constraints

Add repository-specific rules here if needed.

- Keep any added rules compatible with the Core Rules and Required Behavior in this file.
- Do not use this section to weaken validation, safety, or artifact requirements from the shared template.

## Required Behavior

Must:

- read relevant artifacts before making changes
- keep test-contract boundaries aligned with the spec before writing implementation
- run the project's configured validation commands before considering work complete
- update specs or tasks when implementation reveals meaningful drift

Must Not:

- make destructive or irreversible changes without user approval
- silently overwrite user-authored docs, prompts, or configuration
- mix unrelated work into the same change
- bypass validation, hooks, or checks just to make progress
- invent new conventions when the repository already has established ones
- add abstractions, flexibility, or configurability that the task did not ask for
- refactor adjacent code, comments, or formatting that the task does not require
- introduce placeholder code or future-facing hooks unless the current change needs them

## Stop And Ask

Stop and ask the user before continuing if:

- requirements are unclear in a way that affects implementation
- artifacts and codebase materially disagree
- the next step would overwrite existing user-authored rules or configuration
- validation fails for reasons unrelated to the current task
- the work requires widening scope beyond the approved change

## Workflow

Use the workflow that matches the task:

- `spec-driven` for new features and enhancements
- `bugfix` for defects and regressions
- `spike` for technical research and feasibility work

For spec-driven changes, make `test-contract.md` part of the normal artifact set.

Do not mix research, bugfix, and feature implementation in the same change unless the user explicitly approves it.

## Validation

Before completion, run the relevant project checks from `openspec/config.yaml`, such as:

- tests
- lint
- type-check, compiler checks, or static analysis
- format checks when configured

If a configured command is missing, use the nearest repository-native command already established in the codebase.

## Communication

When working with the user:

- report progress clearly
- explain the next meaningful step
- surface tradeoffs when they affect implementation
- pause with a specific question when blocked
