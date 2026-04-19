#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(scriptDir, "..")
const cacheDir = path.join(workspaceRoot, ".npm-cache")

const packagePaths = [
  "packages/opc-guard-core/package.json",
  "plugins/opencode-spec-opc/package.json",
  "plugins/codex-spec-opc/package.json",
]

const bundlePaths = [
  "install.md",
  "README.md",
  "CHANGELOG.md",
  ".template",
  "install-manual/stage.schema.json",
  "install-manual/lanes/registry.json",
  "install-manual/lane-registry.mjs",
  "install-manual/profile-smoke-contract.mjs",
  "install-manual/conformance-contract.mjs",
  "install-manual/render-contract.mjs",
  "install-manual/stop-points.mjs",
  "install-manual/stages",
]

const localPackageDirs = [
  "packages/opc-guard-core",
  "plugins/opencode-spec-opc",
  "plugins/codex-spec-opc",
]

function parseArgs(argv) {
  const options = {
    outDir: "release-assets",
    withLocalPackages: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--with-local-packages") {
      options.withLocalPackages = true
      continue
    }
    if (arg === "--out-dir") {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error("--out-dir requires a value")
      }
      options.outDir = nextValue
      index += 1
      continue
    }
    throw new Error(`unknown argument: ${arg}`)
  }

  return options
}

async function readJson(relativePath) {
  const absolutePath = path.join(workspaceRoot, relativePath)
  return JSON.parse(await fs.readFile(absolutePath, "utf8"))
}

async function ensureWorkspaceVersion() {
  const manifests = await Promise.all(packagePaths.map((relativePath) => readJson(relativePath)))
  const versions = new Set(manifests.map((manifest) => manifest.version))
  if (versions.size !== 1) {
    throw new Error(`workspace package versions diverged: ${manifests.map((manifest) => `${manifest.name}@${manifest.version}`).join(", ")}`)
  }
  return manifests[0].version
}

async function copyPath(relativePath, destinationRoot) {
  const sourcePath = path.join(workspaceRoot, relativePath)
  const destinationPath = path.join(destinationRoot, relativePath)
  await fs.cp(sourcePath, destinationPath, { recursive: true })
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options)
    let stderr = ""

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} failed${stderr ? `\n${stderr}` : ""}`))
        return
      }
      resolve()
    })
  })
}

async function buildLocalPackages(destinationRoot) {
  const vendorDir = path.join(destinationRoot, "vendor", "npm")
  await fs.mkdir(vendorDir, { recursive: true })

  for (const relativeDir of localPackageDirs) {
    const cwd = path.join(workspaceRoot, relativeDir)
    await runCommand("npm", ["pack", "--pack-destination", vendorDir], {
      cwd,
      env: {
        ...process.env,
        npm_config_cache: cacheDir,
      },
      stdio: ["ignore", "inherit", "pipe"],
    })
  }

  const entries = await fs.readdir(vendorDir)
  return entries.filter((entry) => entry.endsWith(".tgz")).sort()
}

function buildBundleReadme({
  bundleName,
  version,
  withLocalPackages,
  localPackages,
}) {
  const localPackageSection = withLocalPackages
    ? [
        "## Included Local Package Fallback",
        "",
        "This bundle also includes local npm tarballs under `vendor/npm/`.",
        "Default installation should still prefer the public npm registry.",
        "Use the local tarballs only when registry access is unavailable or you need an audited offline fallback.",
        "",
        ...localPackages.map((fileName) => `- ${fileName}`),
        "",
      ]
    : []

  return [
    `# ${bundleName}`,
    "",
    `Version: ${version}`,
    "",
    "This bundle packages the OpenSpec OPC installer as a release asset.",
    "",
    "## Default Install Mode",
    "",
    "Use `install.md` as the AI entrypoint and keep npm registry installation as the default plugin resolution path.",
    "",
    "## Included Runtime Surface",
    "",
    "- `install.md`",
    "- `.template/`",
    "- runtime install-manual contracts and stage YAML files",
    "- `README.md` and `CHANGELOG.md` for consumer context",
    "",
    ...localPackageSection,
    "## Not Included",
    "",
    "- install-manual tests and fixtures",
    "- workspace release scripts",
    "- benchmark and preview test tooling",
    "",
    "## Expected Use",
    "",
    "1. Extract the archive.",
    "2. Give `install.md` to your AI executor.",
    "3. Let the installer resolve packages from npm by default.",
    "4. Use bundled local tarballs only as a fallback if this archive includes them.",
    "",
  ].join("\n")
}

async function writeBundleMetadata(destinationRoot, metadata) {
  await fs.writeFile(
    path.join(destinationRoot, "BUNDLE_MANIFEST.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  )
  await fs.writeFile(
    path.join(destinationRoot, "BUNDLE_README.md"),
    `${buildBundleReadme(metadata)}\n`,
    "utf8",
  )
  await fs.writeFile(path.join(destinationRoot, "VERSION"), `${metadata.version}\n`, "utf8")
}

async function createArchive(outputRoot, bundleName) {
  await runCommand("tar", ["-czf", `${bundleName}.tar.gz`, bundleName], {
    cwd: outputRoot,
    stdio: ["ignore", "inherit", "pipe"],
  })
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const version = await ensureWorkspaceVersion()
  const bundleName = `openspec-opc-installer-v${version}`
  const outputRoot = path.resolve(workspaceRoot, options.outDir)
  const bundleRoot = path.join(outputRoot, bundleName)

  await fs.mkdir(outputRoot, { recursive: true })
  await fs.rm(bundleRoot, { recursive: true, force: true })
  await fs.rm(path.join(outputRoot, `${bundleName}.tar.gz`), { force: true })

  for (const relativePath of bundlePaths) {
    await copyPath(relativePath, bundleRoot)
  }

  const localPackages = options.withLocalPackages ? await buildLocalPackages(bundleRoot) : []
  await writeBundleMetadata(bundleRoot, {
    bundleName,
    version,
    defaultInstallMode: "npm",
    includesLocalPackageFallback: options.withLocalPackages,
    includedPaths: bundlePaths,
    localPackages,
  })
  await createArchive(outputRoot, bundleName)

  process.stdout.write(`bundle directory: ${bundleRoot}\n`)
  process.stdout.write(`bundle archive: ${path.join(outputRoot, `${bundleName}.tar.gz`)}\n`)
  if (localPackages.length > 0) {
    process.stdout.write(`local package fallback: ${path.join(bundleRoot, "vendor", "npm")}\n`)
  }
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || String(error)}\n`)
  process.exit(1)
})
