#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(rootDir, "..")

const packagePaths = [
  "packages/opc-guard-core/package.json",
  "plugins/opencode-spec-opc/package.json",
  "plugins/codex-spec-opc/package.json",
]

async function readJson(relativePath) {
  const absolutePath = path.join(workspaceRoot, relativePath)
  const raw = await fs.readFile(absolutePath, "utf8")
  return JSON.parse(raw)
}

async function main() {
  const packages = await Promise.all(
    packagePaths.map(async (relativePath) => ({
      relativePath,
      manifest: await readJson(relativePath),
    })),
  )

  const versions = new Map()
  for (const pkg of packages) {
    versions.set(pkg.manifest.name, pkg.manifest.version)
  }

  const uniqueVersions = new Set(versions.values())
  if (uniqueVersions.size !== 1) {
    const details = Array.from(versions.entries())
      .map(([name, version]) => `${name}: ${version}`)
      .join("\n")
    throw new Error(`Workspace package versions diverged:\n${details}`)
  }

  for (const pkg of packages) {
    const dependencies = pkg.manifest.dependencies || {}
    for (const [dependencyName, dependencyVersion] of Object.entries(dependencies)) {
      if (!versions.has(dependencyName)) continue
      const expectedVersion = versions.get(dependencyName)
      if (dependencyVersion !== expectedVersion) {
        throw new Error(
          `${pkg.manifest.name} depends on ${dependencyName}@${String(dependencyVersion)}, expected ${expectedVersion}`,
        )
      }
    }
  }

  process.stdout.write("workspace versions are aligned\n")
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || String(error)}\n`)
  process.exit(1)
})
