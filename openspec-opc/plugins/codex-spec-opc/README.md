# codex-spec-opc

`codex-spec-opc` is the Codex-facing local plugin scaffold for OpenSpec OPC.

It currently reuses:

- the shared TypeScript guard core in [`opc-guard-core`](../../packages/opc-guard-core/)
- the Codex adapter/runtime/plugin implementation in this directory's `dist/`

## What exists

- `.codex-plugin/plugin.json` with concrete plugin metadata
- `hooks/index.mjs` that exposes `createPlugin`, `install`, and `register`
- `hooks.json` pointing at the local hook bridge entry

## Current limitation

The exact Codex local plugin hook manifest format has not been verified against
official runtime docs yet. `hooks.json` is therefore a provisional contract for
this repository's scaffold work, not a claim that the current Codex runtime
already consumes this file shape verbatim.

As of April 6, 2026, the official OpenAI docs we could verify cover:

- Codex product overview
- Docs MCP setup for Codex
- local shell / tool execution patterns

But they do not document a public, stable local plugin manifest format matching
this repository's `.codex-plugin/plugin.json` plus `hooks.json` shape.

References:

- https://platform.openai.com/docs/codex
- https://platform.openai.com/docs/docs-mcp
- https://platform.openai.com/docs/guides/tools-local-shell

## Integration direction

The intended runtime path is:

`codex-spec-opc/hooks/index.mjs`
-> `codex-spec-opc/dist/codex-plugin.js`
-> `codex-spec-opc/dist/codex-runtime.js`
-> shared OpenSpec OPC guard core
