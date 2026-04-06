import { createCodexAdapter } from "./codex-adapter.js"
import { createCodexRuntimeBridge } from "./codex-runtime.js"
import type { RuntimeGuardOptions } from "@openspec-opc/guard-core/types"
import type { ToolArgsLike } from "@openspec-opc/guard-core/tooling"

export interface CodexPluginEvent {
  sessionId: string
  rootDir: string
  tool?: string
  args?: ToolArgsLike
}

export interface CodexPluginBlockedResult {
  action: "block"
  message: string
  code?: string
}

export interface CodexPluginAllowedResult {
  action: "allow"
}

export type CodexPluginMutationResult = CodexPluginAllowedResult | CodexPluginBlockedResult

export interface CodexPluginHooks {
  onBeforeMutation: (handler: (event: CodexPluginEvent) => Promise<CodexPluginMutationResult>) => void
  onAfterMutation: (handler: (event: CodexPluginEvent) => Promise<void>) => void
  onSessionCompact: (handler: (event: CodexPluginEvent) => Promise<string[]>) => void
}

export interface CodexPluginContract {
  install: (hooks: CodexPluginHooks) => void
}

export function createCodexPlugin(options: RuntimeGuardOptions = {}): CodexPluginContract {
  const adapter = createCodexAdapter({}, options)
  const bridge = createCodexRuntimeBridge(adapter)

  return {
    install(hooks: CodexPluginHooks): void {
      hooks.onBeforeMutation(async (event: CodexPluginEvent): Promise<CodexPluginMutationResult> => {
        const result = await bridge.beforeMutation(event)
        if (result.ok) {
          return { action: "allow" }
        }

        return {
          action: "block",
          message: result.message || "Blocked by OpenSpec OPC guard.",
          code: result.decision?.code,
        }
      })

      hooks.onAfterMutation(async (event: CodexPluginEvent): Promise<void> => {
        await bridge.afterMutation(event)
      })

      hooks.onSessionCompact(async (event: CodexPluginEvent): Promise<string[]> => {
        return bridge.onSessionCompact(event)
      })
    },
  }
}
