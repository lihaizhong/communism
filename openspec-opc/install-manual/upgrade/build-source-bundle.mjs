#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

import { computeDigest } from "./src/manifest.mjs"
import { extractManagedCIJobs } from "./src/ci-files.mjs"
import { computeMarkdownPartDigests, supportsMarkdownFrontmatterMerge } from "./src/frontmatter-files.mjs"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const defaultSourceRoot = path.resolve(scriptDir, "../..")

function parseArgs(argv) {
  const options = {
    sourceRoot: defaultSourceRoot,
    out: null,
    aiConfigDir: null,
    ciType: null,
    version: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const nextValue = argv[index + 1]

    switch (arg) {
      case "--source-root":
        options.sourceRoot = path.resolve(nextValue)
        index += 1
        break
      case "--out":
        options.out = path.resolve(nextValue)
        index += 1
        break
      case "--ai-config-dir":
        options.aiConfigDir = nextValue
        index += 1
        break
      case "--version":
        options.version = nextValue
        index += 1
        break
      case "--ci-type":
        options.ciType = nextValue
        index += 1
        break
      default:
        throw new Error(`unknown argument: ${arg}`)
    }
  }

  if (!options.out) {
    throw new Error("--out is required")
  }
  if (!options.aiConfigDir) {
    throw new Error("--ai-config-dir is required")
  }

  return options
}

async function readWorkspaceVersion(sourceRoot) {
  const manifestPath = path.join(sourceRoot, "packages", "opc-guard-core", "package.json")
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"))
  return manifest.version
}

async function collectFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)))
      continue
    }
    if (entry.isFile()) {
      files.push(absolutePath)
    }
  }

  return files.sort()
}

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function copyManagedFile({ sourceRoot, outputRoot, relativeSourcePath, managedPath, managedAssets }) {
  const sourcePath = path.join(sourceRoot, relativeSourcePath)
  const destinationPath = path.join(outputRoot, "template", managedPath)

  await ensureParent(destinationPath)
  await fs.copyFile(sourcePath, destinationPath)

  managedAssets.push({
    path: managedPath,
    digest: computeDigest(destinationPath),
    type: "file",
    managedKind: managedPath === "AGENTS.md" ? "docs" : managedPath.startsWith("openspec/config")
      ? "config"
      : managedPath.startsWith("openspec/schemas")
        ? "schemas"
        : "docs",
  })
}

async function addCommands({ sourceRoot, outputRoot, aiConfigDir, managedAssets, managedCommands }) {
  const commandsRoot = path.join(sourceRoot, ".template", "agent-config", "commands")
  const commandFiles = await collectFiles(commandsRoot)

  for (const absolutePath of commandFiles) {
    const fileName = path.basename(absolutePath)
    const managedPath = path.posix.join(aiConfigDir, "commands", fileName)
    const destinationPath = path.join(outputRoot, "template", managedPath)

    await ensureParent(destinationPath)
    await fs.copyFile(absolutePath, destinationPath)

    const digest = computeDigest(destinationPath)
    const content = await fs.readFile(destinationPath, "utf8")
    const supportsMerge = supportsMarkdownFrontmatterMerge(managedPath, content)
    const partDigests = supportsMerge
      ? computeMarkdownPartDigests(content, managedPath)
      : { frontmatterDigest: null, bodyDigest: null }
    managedAssets.push({
      path: managedPath,
      digest,
      type: supportsMerge ? "merge" : "file",
      managedKind: "commands",
      mergeStrategy: supportsMerge ? "frontmatter-merge" : undefined,
      frontmatterDigest: partDigests.frontmatterDigest,
      bodyDigest: partDigests.bodyDigest,
    })
    managedCommands.push({
      id: fileName.replace(/\.md$/, ""),
      path: managedPath,
      digest,
    })
  }
}

async function addSkills({ sourceRoot, outputRoot, aiConfigDir, managedAssets, managedSkills }) {
  const skillsRoot = path.join(sourceRoot, ".template", "agent-config", "skills")
  const skillFiles = await collectFiles(skillsRoot)
  const skillIds = new Map()

  for (const absolutePath of skillFiles) {
    const relativeSkillPath = path.relative(skillsRoot, absolutePath)
    const skillId = relativeSkillPath.split(path.sep)[0]
    const managedPath = path.posix.join(aiConfigDir, "skills", ...relativeSkillPath.split(path.sep))
    const destinationPath = path.join(outputRoot, "template", managedPath)

    await ensureParent(destinationPath)
    await fs.copyFile(absolutePath, destinationPath)

    const digest = computeDigest(destinationPath)
    const content = await fs.readFile(destinationPath, "utf8")
    const supportsMerge = supportsMarkdownFrontmatterMerge(managedPath, content)
    const partDigests = supportsMerge
      ? computeMarkdownPartDigests(content, managedPath)
      : { frontmatterDigest: null, bodyDigest: null }
    managedAssets.push({
      path: managedPath,
      digest,
      type: supportsMerge ? "merge" : "file",
      managedKind: "skills",
      mergeStrategy: supportsMerge ? "frontmatter-merge" : undefined,
      frontmatterDigest: partDigests.frontmatterDigest,
      bodyDigest: partDigests.bodyDigest,
    })
    if (!skillIds.has(skillId)) {
      skillIds.set(skillId, {
        id: skillId,
        path: path.posix.join(aiConfigDir, "skills", skillId),
        digest,
      })
    }
  }

  for (const [, skill] of [...skillIds.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    managedSkills.push(skill)
  }
}

async function addCIConfig({ sourceRoot, outputRoot, ciType, managedAssets, managedCIJobs }) {
  if (!ciType || ciType === "other") {
    return
  }

  const ciMapping = {
    github: {
      sourcePath: path.join(sourceRoot, ".template", "ci-templates", "github-workflows", "openspec-archive.yml"),
      managedPath: ".github/workflows/openspec-archive.yml",
    },
    gitlab: {
      sourcePath: path.join(sourceRoot, ".template", "ci-templates", "gitlab-ci", "gitlab-ci.yml"),
      managedPath: ".gitlab-ci.yml",
    },
  }

  const entry = ciMapping[ciType]
  if (!entry) {
    throw new Error(`unsupported ci type: ${ciType}`)
  }

  const destinationPath = path.join(outputRoot, "template", entry.managedPath)
  await ensureParent(destinationPath)
  await fs.copyFile(entry.sourcePath, destinationPath)

  const digest = computeDigest(destinationPath)
  managedAssets.push({
    path: entry.managedPath,
    digest,
    type: "merge",
    managedKind: "ci",
    mergeStrategy: "ci-jobs",
  })

  const content = await fs.readFile(destinationPath, "utf8")
  managedCIJobs.push(...extractManagedCIJobs(entry.managedPath, content))
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const version = options.version || (await readWorkspaceVersion(options.sourceRoot))
  const outputRoot = options.out
  const managedAssets = []
  const managedCIJobs = []
  const managedCommands = []
  const managedSkills = []

  await fs.rm(outputRoot, { recursive: true, force: true })
  await fs.mkdir(path.join(outputRoot, "template"), { recursive: true })

  const agentsDestinationPath = path.join(outputRoot, "template", "AGENTS.md")
  await ensureParent(agentsDestinationPath)
  await fs.copyFile(path.join(options.sourceRoot, ".template", "AGENTS.md"), agentsDestinationPath)
  managedAssets.push({
    path: "AGENTS.md",
    digest: computeDigest(agentsDestinationPath),
    type: "merge",
    managedKind: "docs",
    mergeStrategy: "preserve-section",
    preserveSection: {
      startHeading: "## Repository-Specific Constraints",
      endHeading: "## Required Behavior",
    },
  })

  await copyManagedFile({
    sourceRoot: options.sourceRoot,
    outputRoot,
    relativeSourcePath: ".template/openspec/config.yaml",
    managedPath: "openspec/config.yaml",
    managedAssets,
  })

  const schemaFiles = await collectFiles(path.join(options.sourceRoot, ".template", "openspec", "schemas"))
  for (const absolutePath of schemaFiles) {
    const relativeSchemaPath = path.relative(path.join(options.sourceRoot, ".template"), absolutePath)
    await copyManagedFile({
      sourceRoot: options.sourceRoot,
      outputRoot,
      relativeSourcePath: path.posix.join(".template", ...relativeSchemaPath.split(path.sep)),
      managedPath: relativeSchemaPath.split(path.sep).join(path.posix.sep),
      managedAssets,
    })
  }

  await addCommands({
    sourceRoot: options.sourceRoot,
    outputRoot,
    aiConfigDir: options.aiConfigDir,
    managedAssets,
    managedCommands,
  })

  await addSkills({
    sourceRoot: options.sourceRoot,
    outputRoot,
    aiConfigDir: options.aiConfigDir,
    managedAssets,
    managedSkills,
  })

  await addCIConfig({
    sourceRoot: options.sourceRoot,
    outputRoot,
    ciType: options.ciType,
    managedAssets,
    managedCIJobs,
  })

  const manifest = {
    version,
    handler: "openspec-opc-template-upgrade",
    managedAssets: managedAssets.sort((left, right) => left.path.localeCompare(right.path)),
    managedCIJobs: managedCIJobs.sort((left, right) => left.name.localeCompare(right.name)),
    managedCommands,
    managedSkills,
  }

  await fs.writeFile(
    path.join(outputRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  )

  process.stdout.write(`${outputRoot}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || String(error)}\n`)
  process.exit(1)
})
