#!/usr/bin/env node

import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(rootDir, "..")
const cacheDir = path.join(workspaceRoot, ".npm-cache")

const packages = [
  "packages/opc-guard-core",
  "plugins/opencode-spec-opc",
  "plugins/codex-spec-opc",
]

function runPackDryRun(relativeDir) {
  return new Promise((resolve, reject) => {
    const cwd = path.join(workspaceRoot, relativeDir)
    const child = spawn("npm", ["pack", "--dry-run"], {
      cwd,
      env: {
        ...process.env,
        npm_config_cache: cacheDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`npm pack --dry-run failed for ${relativeDir}\n${stderr || stdout}`))
        return
      }
      resolve(stdout.trim())
    })
  })
}

async function main() {
  for (const relativeDir of packages) {
    const output = await runPackDryRun(relativeDir)
    process.stdout.write(`\n## ${relativeDir}\n${output}\n`)
  }
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || String(error)}\n`)
  process.exit(1)
})
