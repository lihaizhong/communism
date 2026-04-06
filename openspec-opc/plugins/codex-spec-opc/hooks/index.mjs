import { createCodexPlugin } from "../dist/codex-plugin.js"

export function createPlugin(options = {}) {
  return createCodexPlugin(options)
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
