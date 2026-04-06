import test from "node:test"
import assert from "node:assert/strict"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { access, readFile } from "node:fs/promises"

const codexPluginRoot = path.resolve(import.meta.dirname, "..")

test("codex plugin scaffold manifest points at local hooks entry", async () => {
  const manifestPath = path.join(codexPluginRoot, ".codex-plugin", "plugin.json")
  const hooksManifestPath = path.join(codexPluginRoot, "hooks.json")

  await access(manifestPath)
  await access(hooksManifestPath)

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
  const hooksManifest = JSON.parse(await readFile(hooksManifestPath, "utf8"))

  assert.equal(manifest.name, "codex-spec-opc")
  assert.equal(manifest.hooks, "./hooks.json")
  assert.equal(hooksManifest.entry, "./hooks/index.mjs")
})

test("codex plugin scaffold hook bridge re-exports install helpers", async () => {
  const hookModulePath = path.join(codexPluginRoot, "hooks", "index.mjs")
  await access(hookModulePath)

  const hookModule = await import(pathToFileURL(hookModulePath).href)

  assert.equal(typeof hookModule.createPlugin, "function")
  assert.equal(typeof hookModule.install, "function")
  assert.equal(typeof hookModule.register, "function")
  assert.equal(typeof hookModule.default, "object")
})
