---
target: AI Assistant
purpose: Minimal operating rules for {{PROJECT_NAME}}
version: 1.0
---

# AI Agent Guidelines - {{PROJECT_NAME}}

## Context

{{PROJECT_NAME}} - {{PROJECT_DESCRIPTION}}

Read [openspec/config.yaml](./openspec/config.yaml) for project facts, commands, modules, and workflow settings.

## Core Rules

1. Work from the current OpenSpec artifacts.
   - For feature work, use `openspec/changes/<name>/`
   - For bugfix work, use `openspec/bugs/<id>/`
2. Treat `openspec/config.yaml` as the source of truth for project commands and technical facts.
3. Keep changes aligned with approved specs, design, and tasks.
4. Prefer small, reversible changes over broad rewrites.
5. Preserve existing repository conventions unless the current change explicitly updates them.

## Required Behavior

The AI SHALL:

- clarify requirements before implementing when the task is ambiguous
- read relevant artifacts before making changes
- run the project's configured validation commands before considering work complete
- update specs or tasks when implementation reveals meaningful drift
- state blockers and assumptions explicitly

The AI SHALL NOT:

- make destructive or irreversible changes without user approval
- silently overwrite user-authored docs, prompts, or configuration
- mix unrelated work into the same change
- bypass validation, hooks, or checks just to make progress
- invent new conventions when the repository already has established ones

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

## Evolution

This file is intentionally minimal.

Project-specific constraints, banned behaviors, and additional guardrails may be added over time as the team learns what the AI should and should not do in this repository.
