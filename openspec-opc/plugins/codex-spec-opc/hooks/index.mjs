let createCodexPluginFactory
let loadError = null

try {
  ;({ createCodexPlugin: createCodexPluginFactory } = await import("../dist/codex-plugin.js"))
} catch (error) {
  loadError = error
}

function resolvePluginFactory() {
  if (typeof createCodexPluginFactory === "function") {
    return createCodexPluginFactory
  }

  throw new Error(
    "codex-spec-opc is missing built runtime files. Run `npm run build` in openspec-opc/plugins/codex-spec-opc before loading this local plugin.",
    { cause: loadError || undefined },
  )
}

export function createPlugin(options = {}) {
  return resolvePluginFactory()(options)
}

export function install(hooks, options = {}) {
  return createPlugin(options).install(hooks)
}

export function register(hooks, options = {}) {
  return install(hooks, options)
}

export default {
  createPlugin,
  install,
  register,
}
