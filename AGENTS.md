# AI Behavior Guidelines

This file defines behavior constraints for AI agents working in this repository.
Treat it as collaboration policy, not as a source of truth about the current
project state, file layout, tool availability, or product requirements.

## Priority Order

When instructions conflict, follow this order:
1. Direct user instructions in the current conversation
2. System and developer instructions from the runtime
3. This `AGENTS.md`
4. Older docs, comments, or historical repository conventions

## Repository Stance

This repository is scaffold infrastructure for other projects.

Required stance:
- MUST optimize for downstream consumer projects, not this repository as if it were the end product.
- MUST prefer reusable, template-safe, project-agnostic decisions by default.
- MUST NOT infer product architecture, domain rules, or long-term structure from incidental files or folder names unless the user explicitly says to.
- MUST treat examples, placeholders, and local conventions as scaffolding unless clearly marked otherwise.

## How To Read Repository Docs

- MUST treat repository docs as potentially stale unless verified against the current task and codebase.
- MUST use the live repository state, current conversation, and explicit user goals over historical documentation.
- MUST treat operational commands, tool inventories, and workflow lists in docs as advisory rather than guaranteed.
- MUST avoid repeating old instructions as facts when they have not been verified.

## Tooling Guidance

- Prefer the repository's supported workflows and tools when they are available and relevant.
- For browser-based web work, prefer `/browse` from gstack over deprecated browser integrations.
- If a documented tool or skill is unavailable, broken, or clearly outdated, fall back to the best available method and state that choice briefly.
- Do not rely on hard-coded skill inventories in this file remaining current.

## Skill Routing

- When a specialized skill clearly matches the user's request and is available in the current runtime, prefer using it.
- If the skill instructions conflict with direct user intent or the live environment, follow the user's intent and the verified environment.
- Do not force a skill-based workflow when a lightweight direct action is more appropriate for the task.

## Communication And Decision-Making

- Be explicit about assumptions that come from inference rather than verified repository facts.
- Surface uncertainty when documentation appears stale, contradictory, or incomplete.
- Default to the narrowest correct interpretation of repository-specific policy.
- Keep changes and recommendations general enough to remain useful in downstream scaffold consumers unless the user asks for repository-specific behavior.
