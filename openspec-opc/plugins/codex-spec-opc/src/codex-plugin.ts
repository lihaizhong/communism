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
  onBeforeMutation?: (handler: (event: CodexPluginEvent) => Promise<CodexPluginMutationResult>) => void
  beforeMutation?: (handler: (event: CodexPluginEvent) => Promise<CodexPluginMutationResult>) => void
  registerBeforeMutation?: (handler: (event: CodexPluginEvent) => Promise<CodexPluginMutationResult>) => void
  onAfterMutation?: (handler: (event: CodexPluginEvent) => Promise<void>) => void
  afterMutation?: (handler: (event: CodexPluginEvent) => Promise<void>) => void
  registerAfterMutation?: (handler: (event: CodexPluginEvent) => Promise<void>) => void
  onSessionCompact?: (handler: (event: CodexPluginEvent) => Promise<string[]>) => void
  sessionCompact?: (handler: (event: CodexPluginEvent) => Promise<string[]>) => void
  registerSessionCompact?: (handler: (event: CodexPluginEvent) => Promise<string[]>) => void
}

export interface CodexPluginContract {
  install: (hooks: CodexPluginHooks) => void
}

type HookRegistrar<Handler> = (handler: Handler) => void

function resolveRegistrar<Handler>(
  hooks: CodexPluginHooks,
  names: readonly string[],
): HookRegistrar<Handler> | null {
  const hookRecord = hooks as Record<string, unknown>

  for (const name of names) {
    const registrar = hookRecord[name]
    if (typeof registrar === "function") {
      return registrar as HookRegistrar<Handler>
    }
  }

  return null
}

function registerHook<Handler>(
  hooks: CodexPluginHooks,
  names: readonly string[],
  handler: Handler,
): boolean {
  const registrar = resolveRegistrar<Handler>(hooks, names)
  if (!registrar) return false

  registrar(handler)
  return true
}

export function createCodexPlugin(options: RuntimeGuardOptions = {}): CodexPluginContract {
  const adapter = createCodexAdapter({}, options)
  const bridge = createCodexRuntimeBridge(adapter)

  return {
    install(hooks: CodexPluginHooks): void {
      registerHook(hooks, ["onBeforeMutation", "beforeMutation", "registerBeforeMutation"], async (
        event: CodexPluginEvent,
      ): Promise<CodexPluginMutationResult> => {
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

      registerHook(hooks, ["onAfterMutation", "afterMutation", "registerAfterMutation"], async (
        event: CodexPluginEvent,
      ): Promise<void> => {
        await bridge.afterMutation(event)
      })

      registerHook(hooks, ["onSessionCompact", "sessionCompact", "registerSessionCompact"], async (
        event: CodexPluginEvent,
      ): Promise<string[]> => {
        return bridge.onSessionCompact(event)
      })
    },
  }
}
