# Upgrade Runtime - Getting Started

## What is the Upgrade Runtime?

The upgrade runtime manages template updates for projects that have already been installed with OpenSpec OPC. Instead of re-running the full installer, you can incrementally update your project when the template changes.

## When to Use

- **New template version released** - Update your project to get the latest changes
- **Legacy project adoption** - Convert projects installed before the lock file system
- **Drift detection** - Check if project files have diverged from the template

## Basic Workflow

When the runtime writes or migrates lock state, the canonical path is `.openspec-opc/.openspec-opc-template-lock.json`. Older projects that still have `.openspec-opc/template-lock.json` are read as legacy input and migrated on the next successful apply.

Recommended sequence for existing-project upgrades:

1. Run `stage5-upgrade-driver.mjs` first so you get the exact command sequence for the current project variables. If the executor prefers structured input, use `--format json` or `--execution-out`; the JSON includes `initialStepId`, `terminalStates`, per-step `transitions`, and the explicit runtime status / exit-code mapping contract.
2. Run `check --plan-out ...`.
3. Only if `check` reports `No lock file found` and you already know the project contains prior OpenSpec OPC traces, run `adopt --confirm-suspected`.
4. After `adopt`, rerun `dry-run --plan-out ...` to produce the final categorized summary.
5. Review that summary with the user.
6. Run `apply` only after explicit confirmation.

### 1. Check Project State

```bash
cd openspec-opc/install-manual/upgrade
./cli.mjs check --project /path/to/your/project --bundle /path/to/template-bundle
```

This verifies:
- Trust root integrity (bundle not corrupted)
- Lock file exists and is valid
- Current state matches expected state
- Whether the upgrade path can proceed directly or needs the one-time `adopt` fallback

### 2. Preview Changes

```bash
./cli.mjs dry-run --project /path/to/your/project --bundle /path/to/template-bundle
./cli.mjs dry-run --project /path/to/your/project --bundle /path/to/template-bundle --plan-out /path/to/your/project/.openspec-opc/install-upgrade-plan.txt
```

Shows what would change without actually changing anything:
- Files to replace
- Files to merge
- Files to preserve
- Conflicts (user-modified files)

Use `--full` to see all changes instead of top 50.
Use `--plan-out` to persist the categorized summary that the stage flow expects at `TEMPLATE_UPGRADE_PLAN_PATH`.

### 3. Resolve Conflicts

If conflicts are found, you'll see output like:

```
[conflict-user-modified] package.json: User modified this asset
```

Options:
- Restore the original file and re-apply your changes manually
- Skip the file (it won't be updated)

### 4. Apply Upgrade

```bash
./cli.mjs apply --project /path/to/your/project --bundle /path/to/template-bundle
```

This will:
1. Create a rollback package (backup)
2. Stage changes in a temp directory
3. Apply changes group by group
4. Update the lock file

If anything fails, the lock file won't be updated.

For managed merge assets, the runtime currently applies two higher-level merge contracts:
- `AGENTS.md` preserves the `Repository-Specific Constraints` block from the target project.
- Supported CI files update managed OpenSpec jobs while keeping unrelated user-owned jobs in place.
- Managed markdown commands and `SKILL.md` files preserve user-added frontmatter keys, but still treat body edits as conflicts instead of silently merging them.
- If a command or `SKILL.md` contains a `Repository Overrides` preserve block, edits inside that marked block are retained across upgrades.

### 5. Rollback (if needed)

```bash
# Rollback to latest backup
./cli.mjs rollback --project /path/to/your/project

# Or see all available rollbacks
./cli.mjs list-rollbacks --project /path/to/your/project
./cli.mjs rollback --project /path/to/your/project --id <rollback-id>
```

## Legacy Project Adoption

If you have a project installed before the lock file system:

```bash
./cli.mjs adopt --project /path/to/your/project --bundle /path/to/template-bundle
./cli.mjs adopt --project /path/to/your/project --bundle /path/to/template-bundle --confirm-suspected
```

This will:
1. Scan project for managed assets
2. Identify suspected-managed assets (files that differ from template)
3. Create a lock file with confirmed assets
4. Mark suspected assets for manual review

After `adopt`, rerun `dry-run --plan-out ...` before `apply`. Do not treat `adopt` as a substitute for the final preview step.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Failed (unrecoverable error) |
| 2 | Blocked (resolve conflicts and retry) |
| 3 | Partial success (some groups failed) |

When driving the runtime through `stage5-upgrade-driver.mjs`, use the same canonical mapping from the JSON contract:
- `success` -> `0`
- `failed` -> `1`
- `blocked` -> `2`
- `partial` -> `3`

## Safety Features

- **Trust root verification** - Validates bundle integrity before any changes
- **Staging** - Changes are staged before applied
- **Rollback packages** - Automatic backups before apply
- **Lock file updates** - Only updated after successful apply
- **Conflict detection** - User-modified files are flagged, not overwritten
- **Cleanup** - Temp directories are cleaned up on exit (even on Ctrl+C)

## Troubleshooting

### "No lock file found"

Run `adopt` first to initialize the lock file.

### "Trust root corrupted"

The template bundle may be incomplete or corrupted. Re-download or verify the bundle.

### "Plan is stale"

The project state changed since you ran `check` or `dry-run`. Re-run to generate a fresh plan.
