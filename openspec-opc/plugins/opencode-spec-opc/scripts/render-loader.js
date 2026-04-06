#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, "..")
const templatePath = path.join(pluginRoot, "templates", "opencode-spec-opc.js.tmpl")

async function main() {
  const targetRoot = path.resolve(process.argv[2] || process.cwd())
  const outputPath = path.join(targetRoot, ".opencode", "plugins", "opencode-spec-opc.js")

  const template = await fs.readFile(templatePath, "utf8")
  const content = template.replaceAll("__PLUGIN_INDEX_PATH__", path.join(pluginRoot, "index.js"))

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, content, "utf8")

  process.stdout.write(`${outputPath}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || String(error)}\n`)
  process.exit(1)
})
