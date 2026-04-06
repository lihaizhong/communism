import type { SessionSelection } from "./types.js"
import { normalizePath } from "./guard-engine.js"
import { extractSelectionFromFile } from "./state-io.js"

export const DOC_SAFE_PREFIXES = ["openspec/"]
export const CONFIG_SAFE_PREFIXES = [".opencode/"]
export const DOC_SAFE_EXACT = new Set(["AGENTS.md", "CLAUDE.md"])
export const CONFIG_SAFE_EXACT = new Set(["opencode.json", ".opencode/opencode.json"])

export const MUTATING_BASH_PATTERN =
  /(^|\s)(rm|mv|cp|mkdir|touch|chmod|chown|sed\s+-i|perl\s+-i|tee|install|git\s+commit|git\s+add|git\s+mv|npm\s+install|npm\s+uninstall|pnpm\s+add|pnpm\s+remove|pnpm\s+install|yarn\s+add|yarn\s+remove|yarn\s+install|bun\s+add|bun\s+remove|bun\s+install)(\s|$)|>>?|(^|\s)cat\s+.*>>?/i

export interface GuardAllowOptions {
  allowDocWrites?: boolean
  allowConfigWrites?: boolean
}

export interface ToolArgsLike {
  filePath?: string
  patchText?: string
  command?: string
}

export interface ToolInputLike {
  tool?: string
}

function unquoteShellToken(token: string): string {
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    return token.slice(1, -1)
  }
  return token
}

function tokenizeShellWords(command: string): string[] {
  const matches = command.match(/"[^"]*"|'[^']*'|[^\s]+/g)
  if (!matches) return []
  return matches.map((token) => unquoteShellToken(token))
}

function stripLeadingAssignments(tokens: string[]): string[] {
  let index = 0
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index])) {
    index += 1
  }
  return tokens.slice(index)
}

function collectNonOptionArgs(tokens: string[], startIndex = 0): string[] {
  const results: string[] = []
  for (const token of tokens.slice(startIndex)) {
    if (!token || token === "--") continue
    if (token.startsWith("-")) continue
    results.push(token)
  }
  return results
}

export function parseBashMutationPaths(command: string | null | undefined): string[] {
  const value = String(command || "").trim()
  if (!value) return []

  const normalized = new Set<string>()
  const record = (token: string | null | undefined) => {
    const candidate = normalizePath(token)
    if (!candidate) return
    normalized.add(candidate)
  }

  for (const match of value.matchAll(/(?:^|[^\d])>>?\s*("[^"]*"|'[^']*'|[^\s|&;]+)/g)) {
    record(match[1])
  }

  const tokens = stripLeadingAssignments(tokenizeShellWords(value))
  if (tokens.length === 0) return [...normalized]

  const commandName = tokens[0]
  const subcommand = tokens[1]

  if (commandName === "git" && subcommand === "mv") {
    for (const token of collectNonOptionArgs(tokens, 2)) record(token)
    return [...normalized]
  }

  if (commandName === "rm" || commandName === "touch" || commandName === "mkdir") {
    for (const token of collectNonOptionArgs(tokens, 1)) record(token)
    return [...normalized]
  }

  if (commandName === "cp" || commandName === "mv") {
    for (const token of collectNonOptionArgs(tokens, 1)) record(token)
    return [...normalized]
  }

  if (commandName === "chmod" || commandName === "chown") {
    const args = collectNonOptionArgs(tokens, 1)
    for (const token of args.slice(1)) record(token)
    return [...normalized]
  }

  if (commandName === "sed" || commandName === "perl") {
    const args = collectNonOptionArgs(tokens, 1)
    if (args.length > 0) record(args[args.length - 1])
    return [...normalized]
  }

  if (commandName === "tee") {
    for (const token of collectNonOptionArgs(tokens, 1)) record(token)
    return [...normalized]
  }

  if (commandName === "install") {
    const args = collectNonOptionArgs(tokens, 1)
    for (const token of args) record(token)
    return [...normalized]
  }

  if (commandName === "cat" && normalized.size > 0) {
    return [...normalized]
  }

  return [...normalized]
}

export function isAlwaysAllowedPath(filePath: string | null | undefined, options: GuardAllowOptions): boolean {
  const normalized = normalizePath(filePath)
  if (!normalized) return false

  if (options.allowDocWrites) {
    if (DOC_SAFE_EXACT.has(normalized)) return true
    if (DOC_SAFE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true
  }

  if (options.allowConfigWrites) {
    if (CONFIG_SAFE_EXACT.has(normalized)) return true
    if (CONFIG_SAFE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true
  }

  return false
}

export function parsePatchPaths(patchText: string | null | undefined): string[] {
  const text = String(patchText || "")
  const matches = text.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)
  return Array.from(matches, (match) => normalizePath(match[1]))
}

export function resolveTargetPaths(tool: string | undefined, args: ToolArgsLike): string[] {
  if (tool === "edit" || tool === "write") {
    return [normalizePath(args?.filePath)]
  }

  if (tool === "apply_patch") {
    return parsePatchPaths(args?.patchText)
  }

  if (tool === "bash") {
    return parseBashMutationPaths(args?.command)
  }

  return []
}

export function isToolMutation(tool: string | undefined, args: ToolArgsLike): boolean {
  if (tool === "edit" || tool === "write" || tool === "apply_patch") return true
  if (tool !== "bash") return false
  return MUTATING_BASH_PATTERN.test(String(args?.command || ""))
}

export function captureSelectionFromPaths(tool: string | undefined, outputArgs: ToolArgsLike): SessionSelection | null {
  if (tool === "edit" || tool === "write") {
    return extractSelectionFromFile(outputArgs?.filePath)
  }

  if (tool === "apply_patch") {
    for (const filePath of parsePatchPaths(outputArgs?.patchText)) {
      const selection = extractSelectionFromFile(filePath)
      if (selection) return selection
    }
  }

  return null
}
