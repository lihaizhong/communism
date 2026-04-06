import { renderDecision } from "@openspec-opc/guard-core/guard-engine"
import type { CodexAdapterContract, CodexEventContext } from "./codex-adapter.js"
import type { GuardDecision } from "@openspec-opc/guard-core/types"

export interface CodexRuntimeMutationEvent extends CodexEventContext {}

export interface CodexRuntimeCompactEvent extends CodexEventContext {}

export interface CodexRuntimeResult {
  ok: boolean
  decision: GuardDecision | null
  message: string | null
}

export interface CodexRuntimeBridge {
  beforeMutation: (event: CodexRuntimeMutationEvent) => Promise<CodexRuntimeResult>
  afterMutation: (event: CodexRuntimeMutationEvent) => Promise<void>
  onSessionCompact: (event: CodexRuntimeCompactEvent) => Promise<string[]>
}

export function createCodexRuntimeBridge(adapter: CodexAdapterContract): CodexRuntimeBridge {
  return {
    async beforeMutation(event: CodexRuntimeMutationEvent): Promise<CodexRuntimeResult> {
      const decision = await adapter.beforeMutation(event)
      if (!decision) {
        return {
          ok: true,
          decision: null,
          message: null,
        }
      }

      return {
        ok: false,
        decision,
        message: renderDecision(decision),
      }
    },
    async afterMutation(event: CodexRuntimeMutationEvent): Promise<void> {
      await adapter.afterMutation(event)
    },
    async onSessionCompact(event: CodexRuntimeCompactEvent): Promise<string[]> {
      return adapter.onSessionCompact(event)
    },
  }
}
