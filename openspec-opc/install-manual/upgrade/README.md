# OpenSpec OPC Upgrade Runtime

Template upgrade system for OpenSpec OPC. Manages the lifecycle of installed templates.

## Commands

### `check`
Check project state and verify trust root.

```bash
./cli.mjs check --project ./my-project --bundle ./template-bundle
```

### `dry-run`
Preview what would change (shows top 50 by default, use `--full` for all).

```bash
./cli.mjs dry-run --project ./my-project --bundle ./template-bundle
./cli.mjs dry-run --full --project ./my-project --bundle ./template-bundle
./cli.mjs dry-run --project ./my-project --bundle ./template-bundle --plan-out ./openspec/install-upgrade-plan.txt
```

### `stage5-upgrade-driver`
Render the exact existing-project upgrade command sequence from stage/task variables.

```bash
./stage5-upgrade-driver.mjs \
  --project ./my-project \
  --ai-config-dir .opencode \
  --ci-type github \
  --bundle-out ./my-project/.openspec/.cache/openspec-opc-upgrade-bundle \
  --plan-out ./my-project/openspec/install-upgrade-plan.txt \
  --execution-out ./my-project/.openspec/install-upgrade-sequence.json
```

The driver can emit either:
- shell-oriented output for humans
- JSON with ordered `steps`, conditions, and command payloads for AI executors

The JSON form now uses an explicit transition contract:
- `initialStepId` declares where execution begins
- `terminalStates` declares non-step terminal outcomes
- each step exposes `transitions: [{ on, to }]` instead of ad-hoc flow fields
- `runtimeStatusContract` declares the canonical CLI status/exit-code mapping: `0=success`, `1=failed`, `2=blocked`, `3=partial`
- each runtime-backed step exposes `resultMapping`, so the executor can translate CLI exit codes into workflow events without guessing

### `adopt`
Adopt an existing project that was installed without a lock file.

```bash
./cli.mjs adopt --project ./my-project --bundle ./template-bundle
```

### `apply`
Apply the upgrade. Requires a valid plan from `check` or `dry-run`.

```bash
./cli.mjs apply --project ./my-project --bundle ./template-bundle
```

### `rollback`
Rollback to the latest backup or a specific rollback package.

```bash
./cli.mjs rollback --project ./my-project
```

## Architecture

```
upgrade/
├── cli.mjs              # CLI entry point
├── stage5-upgrade-driver.mjs
│   # Renders the exact stage5 command sequence from task variables
├── src/
│   ├── types.mjs        # Core types and constants
│   ├── manifest.mjs     # Manifest parser and trust root verification
│   ├── lock.mjs         # Lock file manager
│   ├── plan.mjs         # Upgrade plan generator
│   ├── staging.mjs      # Staging workspace manager
│   └── runtime.mjs      # Main upgrade runtime
└── tests/
    └── upgrade.test.mjs # Test suite
```

## Key Features

- **Two-phase execution**: Changes are staged first, then applied
- **Per-project state**: Canonical lock state lives at `openspec/.openspec-opc-template-lock.json` with legacy `.openspec-opc/template-lock.json` compatibility
- **Trust root verification**: Validates bundle integrity before operations
- **Conflict detection**: Identifies user-modified assets
- **Suspected-managed assets**: Adopt workflow for legacy projects
- **Asset groups**: Changes are grouped for transaction boundaries
- **Rollback support**: Restores managed files and the template lock file
- **Preserved repo policy**: `AGENTS.md` keeps the repository-specific constraints block during upgrade
- **CI job merge**: Managed GitHub/GitLab jobs are updated without deleting unrelated user-owned jobs in the same file
- **Command/skill frontmatter merge**: Managed markdown commands and `SKILL.md` files preserve user-added frontmatter keys while still replacing the template body
- **Command/skill override blocks**: Explicit `Repository Overrides` preserve markers let downstream projects keep repository-specific body guidance across upgrades
- **Trap cleanup**: Staging directories are cleaned up on exit

## Exit Codes

- `0`: Success
- `1`: Failed (unrecoverable)
- `2`: Blocked (resolve conflicts and retry)
- `3`: Partial success (some groups failed)

Runtime status values follow the same contract:
- `success` -> exit code `0`
- `failed` -> exit code `1`
- `blocked` -> exit code `2`
- `partial` -> exit code `3`

## Testing

```bash
npm run test:upgrade
```
