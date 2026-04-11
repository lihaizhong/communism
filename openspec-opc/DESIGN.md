# Design System — OpenSpec OPC

## Product Context

- **What this is:** OpenSpec OPC is a text-first AI development harness that turns spec-first, test-first, and runtime guard discipline into a concrete installation and execution workflow.
- **Who it's for:** Individual developers and small teams who want AI to work inside a constrained, auditable process instead of writing code opportunistically.
- **Primary surfaces:** Installer stages, stop-points, terminal result cards, human-readable reports, machine JSON artifacts, quick-start docs, and future scaffold lanes.
- **Project type:** Repository-native workflow product. The dominant experience is Markdown, YAML, shell output, and AI-facing instructions, not a browser UI.

## Design Goal

OpenSpec OPC should feel like a calm, strict, trustworthy toolchain.

The user should feel three things:

1. The system knows exactly where they are in the workflow.
2. The system will not pretend work is complete when it is not.
3. The output is structured enough for automation, but readable enough for a human skimming a terminal or report.

This is not a playful or decorative product. It is a procedural system with a strong opinion about execution discipline.

## Core Principles

### 1. Text First, Not UI First

All primary experiences must work in plain text:

- terminal output
- Markdown files
- YAML stage contracts
- machine-readable JSON artifacts

No design decision may depend on a GUI existing.

### 2. Trust Over Polish

The product should optimize for credibility before charm.

That means:

- explicit state labels
- explicit failure modes
- explicit next actions
- no vague success language
- no hiding incomplete work behind friendly prose

### 3. Fixed Hierarchy Beats Clever Formatting

Every repeated artifact should use a stable reading order.

Examples:

- result card section order
- report heading order
- gate order
- stop-point option order

If a reader has seen one OpenSpec OPC output, the next one should scan the same way.

### 4. New Lanes Extend, They Do Not Reinvent

Future lanes may add domain-specific checks, but they should reuse the same design language:

- same result-state semantics
- same report hierarchy
- same stop-point interaction shape
- same next-action framing

New lanes can append, not fork, the baseline.

### 5. Runtime Confidence Must Be Visible

If the system checks runtime confidence, that signal must appear in the output.

This is why `profile smoke` belongs in:

- stage planning
- task variables
- canonical result
- terminal result card
- human report
- machine JSON

Invisible checks do not build trust.

## Voice

### Tone

The tone is:

- direct
- procedural
- calm
- non-marketing
- explicit about state

The tone is not:

- cute
- hype-heavy
- vague
- apologetic
- anthropomorphic

### Copy Rules

- Prefer short declarative lines over long narrative paragraphs in operational output.
- Say what happened, then what the user should do next.
- Use precise nouns: `lane`, `profile`, `gate`, `artifact`, `result`, `stop-point`.
- Use `must` for hard requirements, `should` for recommendations, and avoid mixing them.
- Do not call incomplete work "done", "ready", or "successful".
- Do not use filler like "great news", "all set", or "you're good to go" unless the artifact state is actually `success`.

## Information Architecture

### Canonical Section Order

All installer result surfaces should preserve this order:

1. overall result
2. execution path
3. gate results
4. profile smoke
5. written changes
6. next actions
7. artifact paths
8. raw details

Rules:

- Terminal result cards may omit `raw details`.
- Human reports should include `raw details`.
- JSON should preserve the same conceptual hierarchy even if represented as keys instead of headings.

### Gate Order

The base Node/TS conformance order is fixed:

1. `lint`
2. `test`
3. `typecheck`

Future lanes may define different gate sets, but each lane must still have one fixed canonical order.

### Status Model

Result states are product language, not implementation accidents.

- `success`: required checks passed and required artifacts were produced
- `failed`: checks failed before meaningful write completion
- `partial_install`: writes occurred, but verification did not finish cleanly
- `legacy_fallback`: the installer intentionally used the old path instead of the new lane

These labels should never be replaced with softer synonyms in rendered output.

## Stop-Point Design Language

### Option Order

Shared stop-points must preserve:

1. `recommended`
2. `custom`
3. `abort`

That order is part of the design system. It establishes:

- the preferred path
- the escape hatch for experts
- the explicit exit

### Stop-Point Copy

Stop-points should:

- state why the flow paused
- show the safest next move
- preserve user agency

They should not:

- sound punitive
- bury the reason below the options
- imply success when the flow is waiting on user input

## Artifact Language

### Terminal Result Card

The terminal result card is the primary artifact.

It should be:

- compact
- line-oriented
- copy-paste friendly
- readable without Markdown rendering

It is the source of truth for stage 6 summary display.

### Human Report

The human report is the review artifact.

It should:

- keep explicit headings
- preserve the same logical order as the terminal card
- add room for explanation without changing state semantics

### Machine JSON

The JSON artifact is the contract artifact.

It should:

- use stable field names
- prefer explicit status strings over inferred meaning
- mirror human-visible concepts closely enough that a reader can map one to the other

## Profile-Specific Runtime Confidence

### App

`app` profiles must expose runtime confidence as a page-level smoke check.

The language should communicate:

- what command ran
- what minimum user-visible proof passed
- why that matters

Preferred summary shape:

- `frontend page smoke: passed | npm run smoke | app root marker is present`

### Service

`service` profiles must expose runtime confidence as an API smoke check.

Preferred summary shape:

- `service API smoke: passed | npm run smoke | health endpoint returned ok`

### Library

`library` profiles must never fake runtime confidence.

They should explicitly say:

- `runtime smoke: not_applicable | not applicable for library profile`

`not_applicable` is better than omission because it preserves trust and explains why the field exists.

## Formatting Rules

### Markdown

- Use short headings.
- Prefer flat lists.
- Keep repeated sections structurally identical across files.
- Use tables only when the user benefits from side-by-side comparison.

### Terminal Output

- One line per fact.
- Avoid wrapping meaning across multiple lines when a single line will do.
- Use `label: value` or `- item: value` patterns consistently.

### Paths and Commands

- Show exact paths when reporting artifacts.
- Show exact commands when reporting gates and smoke checks.
- Never imply a command ran if only its existence was detected.

## Anti-Patterns

Do not introduce any of the following into installer/output surfaces:

- decorative banners that drown out state
- emoji-driven severity systems
- inconsistent synonyms for the same result state
- hidden required checks
- ambiguous "warning" language with no next action
- polished prose that obscures a failing gate
- profile-specific wording that breaks the global section order

## Scope Rules

This document governs:

- installer copy
- stop-point copy
- result cards
- human reports
- machine-visible result semantics when they map to user-facing concepts
- future scaffold lane output conventions

This document does not attempt to define:

- marketing site branding
- browser UI styling
- arbitrary downstream project UI choices

If a future surface is primarily textual and belongs to OpenSpec OPC itself, this document applies.

## Implementation Guidance

When adding a new lane or output surface:

1. Reuse the canonical section order unless there is a strong reason not to.
2. Reuse existing result-state semantics before inventing new ones.
3. Reuse `recommended / custom / abort` for stop-points.
4. Make runtime confidence visible if the lane checks it.
5. Add tests that lock both the contract and the rendered output.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-11 | Established repo-level text-first design system | Installer/result language had stabilized enough to promote into a reusable baseline |
| 2026-04-11 | Fixed canonical order to result -> execution path -> gates -> profile smoke -> changes -> next actions -> artifacts -> raw details | Stable scan order matters more than local formatting freedom |
| 2026-04-11 | Kept `legacy_fallback` as a first-class rendered result state | Falling back is operationally different from failing and must remain visible |
| 2026-04-11 | Required explicit `not_applicable` for library profile smoke | Omission hides intent; explicit inapplicability preserves trust |
