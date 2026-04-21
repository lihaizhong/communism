/**
 * Upgrade Runtime Tests (using Node.js built-in test runner)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync, chmodSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { computeDigestString } from '../src/manifest.mjs';
import { readLock, writeLock, createLock } from '../src/lock.mjs';
import { check, apply, rollback } from '../src/runtime.mjs';
import { generateUpgradePlan, formatPlan, groupActionsByGroup } from '../src/plan.mjs';
import { createStagingWorkspace, applyStagedChanges } from '../src/staging.mjs';
import { mergePreservedSection } from '../src/managed-files.mjs';
import { extractManagedCIJobs, mergeManagedCIJobs } from '../src/ci-files.mjs';
import { computeMarkdownPartDigests, mergeMarkdownFrontmatter } from '../src/frontmatter-files.mjs';

const cliPath = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const buildSourceBundlePath = fileURLToPath(new URL('../build-source-bundle.mjs', import.meta.url));
const stage5UpgradeDriverPath = fileURLToPath(new URL('../stage5-upgrade-driver.mjs', import.meta.url));

describe('Manifest', () => {
  it('should compute digest', () => {
    const digest = computeDigestString('hello world');
    assert.strictEqual(digest.length, 64);
    assert.strictEqual(typeof digest, 'string');
  });
});

describe('Lock File', () => {
  let tempDir;
  
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'opc-test-'));
  });
  
  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });
  
  it('should read and write lock', () => {
    const lock = {
      version: '1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        { path: 'package.json', digest: 'abc123', status: 'managed' }
      ]
    };
    
    writeLock(tempDir, lock);
    const read = readLock(tempDir);
    
    assert.notStrictEqual(read, null);
    assert.strictEqual(read.version, '1.0.0');
    assert.strictEqual(read.assets.length, 1);
  });
  
  it('should return null for missing lock', () => {
    const read = readLock(tempDir);
    assert.strictEqual(read, null);
  });
});

describe('Staging', () => {
  it('should create and cleanup staging', () => {
    const staging = createStagingWorkspace();
    
    assert.ok(staging.path);
    assert.ok(staging.cleanup);
    
    // Cleanup should work
    staging.cleanup();
  });
});

describe('Plan Generation', () => {
  let projectDir;
  let bundleDir;
  
  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'opc-project-'));
    bundleDir = mkdtempSync(join(tmpdir(), 'opc-bundle-'));
    
    // Create project files
    writeFileSync(join(projectDir, 'package.json'), '{"name": "test"}');
    
    // Create bundle
    mkdirSync(join(bundleDir, 'template'), { recursive: true });
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '1.0.0',
        handler: 'node-ts',
        managedAssets: [
          { path: 'package.json', digest: computeDigestString('{"name": "test"}'), type: 'file' }
        ]
      })
    );
    writeFileSync(
      join(bundleDir, 'template', 'package.json'),
      '{"name": "test"}'
    );
  });
  
  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(bundleDir, { recursive: true, force: true });
  });
  
  it('should generate plan for project without lock', () => {
    const plan = generateUpgradePlan(projectDir, bundleDir);
    
    assert.ok(plan);
    assert.strictEqual(plan.fromVersion, null);
    assert.ok(plan.actions.length > 0);
    assert.strictEqual(plan.actions[0].type, 'conflict');
  });
  
  it('should detect user-modified assets', () => {
    // Create lock with original digest
    const lock = {
      version: '1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        { 
          path: 'package.json', 
          digest: computeDigestString('{"name": "test"}'), 
          status: 'managed' 
        }
      ]
    };
    writeLock(projectDir, lock);
    
    // Modify file
    writeFileSync(join(projectDir, 'package.json'), '{"name": "modified"}');
    
    const plan = generateUpgradePlan(projectDir, bundleDir);
    
    assert.ok(plan);
    const conflict = plan.actions.find(a => a.type === 'conflict');
    assert.ok(conflict, 'Should detect conflict for modified file');
  });
  
  it('should handle missing managed assets', () => {
    // Create lock
    const lock = {
      version: '1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        { path: 'package.json', digest: computeDigestString('{"name": "test"}'), status: 'managed' }
      ]
    };
    writeLock(projectDir, lock);
    
    // Delete file
    rmSync(join(projectDir, 'package.json'));
    
    const plan = generateUpgradePlan(projectDir, bundleDir);
    
    assert.ok(plan);
    const replace = plan.actions.find(a => a.type === 'replace');
    assert.ok(replace, 'Should mark missing file for replacement');
  });

  it('should delete stale managed assets that were removed from the template', () => {
    mkdirSync(join(projectDir, '.opencode', 'commands'), { recursive: true });
    writeFileSync(join(projectDir, '.opencode', 'commands', 'opsx-archive.md'), '# old command');
    writeLock(projectDir, {
      version: '1.0.0',
      sourceVersion: 'openspec-opc@1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        {
          path: '.opencode/commands/opsx-archive.md',
          digest: computeDigestString('# old command'),
          status: 'managed',
          type: 'file',
          managedKind: 'commands'
        }
      ]
    });

    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '2.0.0',
        handler: 'node-ts',
        managedAssets: []
      })
    );

    const plan = generateUpgradePlan(projectDir, bundleDir);
    const deletion = plan.actions.find((action) => action.type === 'delete');
    assert.ok(deletion);
    assert.strictEqual(deletion.path, '.opencode/commands/opsx-archive.md');
  });

  it('should conflict when a frontmatter-merge asset body changed locally', () => {
    mkdirSync(join(projectDir, '.opencode', 'commands'), { recursive: true });
    mkdirSync(join(bundleDir, 'template', '.opencode', 'commands'), { recursive: true });
    const lockedCommand = `---\ndescription: Base\nmetadata:\n  author: openspec\n---\n\nBase body.\n`;
    const localCommand = `---\ndescription: Base\nmetadata:\n  author: openspec\n  localAlias: keep-me\n---\n\nUser changed body.\n`;
    const templateCommand = `---\ndescription: Updated\nmetadata:\n  author: openspec\n  version: "2.0"\n---\n\nTemplate body.\n`;
    const lockedParts = computeMarkdownPartDigests(lockedCommand, '.opencode/commands/opsx-propose.md');

    writeFileSync(join(projectDir, '.opencode', 'commands', 'opsx-propose.md'), localCommand);
    writeLock(projectDir, {
      version: '1.0.0',
      sourceVersion: 'openspec-opc@1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        {
          path: '.opencode/commands/opsx-propose.md',
          digest: computeDigestString(lockedCommand),
          status: 'managed',
          type: 'merge',
          managedKind: 'commands',
          mergeStrategy: 'frontmatter-merge',
          frontmatterDigest: lockedParts.frontmatterDigest,
          bodyDigest: lockedParts.bodyDigest
        }
      ]
    });
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '2.0.0',
        handler: 'node-ts',
        managedAssets: [
          {
            path: '.opencode/commands/opsx-propose.md',
            digest: computeDigestString(templateCommand),
            type: 'merge',
            managedKind: 'commands',
            mergeStrategy: 'frontmatter-merge',
            ...computeMarkdownPartDigests(templateCommand, '.opencode/commands/opsx-propose.md')
          }
        ]
      })
    );
    writeFileSync(join(bundleDir, 'template', '.opencode', 'commands', 'opsx-propose.md'), templateCommand);

    const plan = generateUpgradePlan(projectDir, bundleDir);
    const conflict = plan.actions.find((action) => action.type === 'conflict');
    assert.ok(conflict);
    assert.match(conflict.reason, /Local managed body changed/);
  });
});

describe('Runtime', () => {
  let projectDir;
  let bundleDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'opc-project-'));
    bundleDir = mkdtempSync(join(tmpdir(), 'opc-bundle-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(bundleDir, { recursive: true, force: true });
  });

  it('check should return blocked instead of throwing when lock is missing', () => {
    mkdirSync(join(bundleDir, 'template'), { recursive: true });
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '1.0.0',
        handler: 'node-ts',
        managedAssets: []
      })
    );

    const result = check(projectDir, bundleDir);

    assert.strictEqual(result.status, 'blocked');
    assert.match(result.failures[0].message, /Run adopt to initialize/);
  });

  it('apply then rollback should restore the previous lock and remove new files', () => {
    mkdirSync(join(bundleDir, 'template'), { recursive: true });
    writeFileSync(join(projectDir, 'package.json'), '{"name":"v1"}');
    writeLock(projectDir, {
      version: '1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        {
          path: 'package.json',
          digest: computeDigestString('{"name":"v1"}'),
          status: 'managed'
        }
      ]
    });

    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '2.0.0',
        handler: 'node-ts',
        managedAssets: [
          { path: 'package.json', digest: computeDigestString('{"name":"v2"}'), type: 'file' },
          { path: 'README.md', digest: computeDigestString('# bundled'), type: 'file' }
        ]
      })
    );
    writeFileSync(join(bundleDir, 'template', 'package.json'), '{"name":"v2"}');
    writeFileSync(join(bundleDir, 'template', 'README.md'), '# bundled');

    const applyResult = apply(projectDir, bundleDir);
    assert.strictEqual(applyResult.status, 'success');
    assert.strictEqual(readLock(projectDir)?.version, '2.0.0');
    assert.ok(existsSync(join(projectDir, 'README.md')));

    const rollbackResult = rollback(projectDir);
    assert.strictEqual(rollbackResult.status, 'success');
    assert.strictEqual(readFileSync(join(projectDir, 'package.json'), 'utf-8'), '{"name":"v1"}');
    assert.strictEqual(existsSync(join(projectDir, 'README.md')), false);
    assert.strictEqual(readLock(projectDir)?.version, '1.0.0');
  });

  it('apply should create rollback package before making changes for partial recovery', () => {
    mkdirSync(join(bundleDir, 'template'), { recursive: true });
    writeFileSync(join(projectDir, 'package.json'), '{"name":"v1"}');
    writeLock(projectDir, {
      version: '1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        {
          path: 'package.json',
          digest: computeDigestString('{"name":"v1"}'),
          status: 'managed'
        }
      ]
    });

    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '2.0.0',
        handler: 'node-ts',
        managedAssets: [
          { path: 'package.json', digest: computeDigestString('{"name":"v2"}'), type: 'file' }
        ]
      })
    );
    writeFileSync(join(bundleDir, 'template', 'package.json'), '{"name":"v2"}');

    // Verify rollback package is created before apply completes
    const applyResult = apply(projectDir, bundleDir);
    
    // Apply should succeed
    assert.strictEqual(applyResult.status, 'success');
    assert.strictEqual(applyResult.newLockVersion, '2.0.0');
    
    // File should be updated
    assert.strictEqual(readFileSync(join(projectDir, 'package.json'), 'utf-8'), '{"name":"v2"}');
    
    // Rollback should restore to v1
    const rollbackResult = rollback(projectDir);
    assert.strictEqual(rollbackResult.status, 'success');
    assert.strictEqual(readFileSync(join(projectDir, 'package.json'), 'utf-8'), '{"name":"v1"}');
    assert.strictEqual(readLock(projectDir)?.version, '1.0.0');
  });

  it('apply should preserve repository-specific constraints in AGENTS.md', () => {
    mkdirSync(join(bundleDir, 'template'), { recursive: true });
    const currentAgents = `# AI Agent Guidelines - Demo\n\n## Repository-Specific Constraints\n\nCustom repo rule.\n\n## Required Behavior\n\nMust:\n\n- keep tests green\n`;
    const templateAgents = `# AI Agent Guidelines - Demo\n\n## Repository-Specific Constraints\n\nAdd repository-specific rules here if needed.\n\n## Required Behavior\n\nMust:\n\n- read relevant artifacts before making changes\n`;

    writeFileSync(join(projectDir, 'AGENTS.md'), currentAgents);
    writeLock(projectDir, {
      version: '1.0.0',
      sourceVersion: 'openspec-opc@1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        {
          path: 'AGENTS.md',
          digest: computeDigestString(currentAgents),
          status: 'managed',
          type: 'merge',
          managedKind: 'docs',
          mergeStrategy: 'preserve-section',
          preserveSection: {
            startHeading: '## Repository-Specific Constraints',
            endHeading: '## Required Behavior'
          }
        }
      ]
    });

    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '2.0.0',
        handler: 'node-ts',
        managedAssets: [
          {
            path: 'AGENTS.md',
            digest: computeDigestString(templateAgents),
            type: 'merge',
            managedKind: 'docs',
            mergeStrategy: 'preserve-section',
            preserveSection: {
              startHeading: '## Repository-Specific Constraints',
              endHeading: '## Required Behavior'
            }
          }
        ]
      })
    );
    writeFileSync(join(bundleDir, 'template', 'AGENTS.md'), templateAgents);

    const applyResult = apply(projectDir, bundleDir);
    assert.strictEqual(applyResult.status, 'success');
    const merged = readFileSync(join(projectDir, 'AGENTS.md'), 'utf-8');
    assert.match(merged, /Custom repo rule\./);
    assert.match(merged, /read relevant artifacts before making changes/);
    assert.doesNotMatch(merged, /Add repository-specific rules here if needed\./);
  });

  it('apply should converge merge assets on same-version reruns', () => {
    mkdirSync(join(projectDir, '.opencode', 'commands'), { recursive: true });
    mkdirSync(join(bundleDir, 'template', '.opencode', 'commands'), { recursive: true });

    const currentAgents = `# AI Agent Guidelines - Demo\n\n## Repository-Specific Constraints\n\nCustom repo rule.\n\n## Required Behavior\n\nMust:\n\n- keep tests green\n`;
    const templateAgents = `# AI Agent Guidelines - Demo\n\n## Repository-Specific Constraints\n\nAdd repository-specific rules here if needed.\n\n## Required Behavior\n\nMust:\n\n- read relevant artifacts before making changes\n`;
    const lockedCommand = `---\ndescription: Base\nmetadata:\n  author: openspec\n---\n\nBase body.\n`;
    const currentCommand = `---\ndescription: Base\nmetadata:\n  author: openspec\n  localAlias: keep-me\n---\n\nBase body.\n`;
    const templateCommand = `---\ndescription: Updated\nmetadata:\n  author: openspec\n  version: "2.0"\n---\n\nTemplate body.\n\n## Repository Overrides\n\n<!-- OPENSPEC-PRESERVE:BEGIN repository-overrides -->\nAdd repository-specific command guidance here. This block is preserved across template upgrades.\n<!-- OPENSPEC-PRESERVE:END repository-overrides -->\n`;
    const lockedParts = computeMarkdownPartDigests(lockedCommand, '.opencode/commands/opsx-propose.md');

    writeFileSync(join(projectDir, 'AGENTS.md'), currentAgents);
    writeFileSync(join(projectDir, '.opencode', 'commands', 'opsx-propose.md'), currentCommand);
    writeLock(projectDir, {
      version: '1.0.0',
      sourceVersion: 'openspec-opc@1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        {
          path: 'AGENTS.md',
          digest: computeDigestString(currentAgents),
          status: 'managed',
          type: 'merge',
          managedKind: 'docs',
          mergeStrategy: 'preserve-section',
          preserveSection: {
            startHeading: '## Repository-Specific Constraints',
            endHeading: '## Required Behavior'
          }
        },
        {
          path: '.opencode/commands/opsx-propose.md',
          digest: computeDigestString(lockedCommand),
          status: 'managed',
          type: 'merge',
          managedKind: 'commands',
          mergeStrategy: 'frontmatter-merge',
          frontmatterDigest: lockedParts.frontmatterDigest,
          bodyDigest: lockedParts.bodyDigest
        }
      ]
    });

    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '2.0.0',
        handler: 'node-ts',
        managedAssets: [
          {
            path: 'AGENTS.md',
            digest: computeDigestString(templateAgents),
            type: 'merge',
            managedKind: 'docs',
            mergeStrategy: 'preserve-section',
            preserveSection: {
              startHeading: '## Repository-Specific Constraints',
              endHeading: '## Required Behavior'
            }
          },
          {
            path: '.opencode/commands/opsx-propose.md',
            digest: computeDigestString(templateCommand),
            type: 'merge',
            managedKind: 'commands',
            mergeStrategy: 'frontmatter-merge',
            ...computeMarkdownPartDigests(templateCommand, '.opencode/commands/opsx-propose.md')
          }
        ]
      })
    );
    writeFileSync(join(bundleDir, 'template', 'AGENTS.md'), templateAgents);
    writeFileSync(join(bundleDir, 'template', '.opencode', 'commands', 'opsx-propose.md'), templateCommand);

    const applyResult = apply(projectDir, bundleDir);
    assert.strictEqual(applyResult.status, 'success');

    const nextPlan = generateUpgradePlan(projectDir, bundleDir);
    assert.deepStrictEqual(
      nextPlan.actions.map((action) => ({ path: action.path, type: action.type })),
      [
        { path: 'AGENTS.md', type: 'preserve' },
        { path: '.opencode/commands/opsx-propose.md', type: 'preserve' }
      ]
    );
  });

  it('apply should remove stale managed command files from the project', () => {
    mkdirSync(join(projectDir, '.opencode', 'commands'), { recursive: true });
    mkdirSync(join(bundleDir, 'template'), { recursive: true });
    writeFileSync(join(projectDir, '.opencode', 'commands', 'opsx-archive.md'), '# stale');
    writeLock(projectDir, {
      version: '1.0.0',
      sourceVersion: 'openspec-opc@1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        {
          path: '.opencode/commands/opsx-archive.md',
          digest: computeDigestString('# stale'),
          status: 'managed',
          type: 'file',
          managedKind: 'commands'
        }
      ]
    });
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '2.0.0',
        handler: 'node-ts',
        managedAssets: []
      })
    );

    const applyResult = apply(projectDir, bundleDir);
    assert.strictEqual(applyResult.status, 'success');
    assert.strictEqual(existsSync(join(projectDir, '.opencode', 'commands', 'opsx-archive.md')), false);
    assert.strictEqual(readLock(projectDir)?.version, '2.0.0');
  });

  it('apply should merge managed CI jobs without deleting user-owned jobs', () => {
    mkdirSync(join(projectDir, '.github', 'workflows'), { recursive: true });
    mkdirSync(join(bundleDir, 'template', '.github', 'workflows'), { recursive: true });
    const currentWorkflow = `name: OpenSpec Archive\non:\n  workflow_dispatch:\njobs:\n  archive:\n    runs-on: ubuntu-22.04\n    steps:\n      - run: echo old archive\n  custom_checks:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo keep me\n`;
    const templateWorkflow = `name: OpenSpec Archive\non:\n  release:\n    types: [published]\n  workflow_dispatch:\njobs:\n  archive:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo upgraded archive\n`;

    writeFileSync(join(projectDir, '.github', 'workflows', 'openspec-archive.yml'), currentWorkflow);
    writeLock(projectDir, {
      version: '1.0.0',
      sourceVersion: 'openspec-opc@1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        {
          path: '.github/workflows/openspec-archive.yml',
          digest: computeDigestString(currentWorkflow),
          status: 'managed',
          type: 'merge',
          managedKind: 'ci',
          mergeStrategy: 'ci-jobs'
        }
      ]
    });

    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '2.0.0',
        handler: 'node-ts',
        managedAssets: [
          {
            path: '.github/workflows/openspec-archive.yml',
            digest: computeDigestString(templateWorkflow),
            type: 'merge',
            managedKind: 'ci',
            mergeStrategy: 'ci-jobs'
          }
        ],
        managedCIJobs: [
          {
            path: '.github/workflows/openspec-archive.yml',
            name: 'archive',
            digest: computeDigestString('runs-on: ubuntu-latest\nsteps:\n  - run: echo upgraded archive\n'),
            mergeStrategy: 'replace'
          }
        ]
      })
    );
    writeFileSync(join(bundleDir, 'template', '.github', 'workflows', 'openspec-archive.yml'), templateWorkflow);

    const applyResult = apply(projectDir, bundleDir);
    assert.strictEqual(applyResult.status, 'success');

    const merged = readFileSync(join(projectDir, '.github', 'workflows', 'openspec-archive.yml'), 'utf-8');
    assert.match(merged, /echo upgraded archive/);
    assert.match(merged, /custom_checks:/);
    assert.match(merged, /echo keep me/);
  });

  it('apply should preserve user-added frontmatter keys in managed command files', () => {
    mkdirSync(join(projectDir, '.opencode', 'commands'), { recursive: true });
    mkdirSync(join(bundleDir, 'template', '.opencode', 'commands'), { recursive: true });
    const lockedCommand = `---\ndescription: Base\nmetadata:\n  author: openspec\n---\n\nBase body.\n`;
    const currentCommand = `---\ndescription: Base\nmetadata:\n  author: openspec\n  localAlias: keep-me\n---\n\nBase body.\n`;
    const templateCommand = `---\ndescription: Updated\nmetadata:\n  author: openspec\n  version: "2.0"\n---\n\nTemplate body.\n`;
    const lockedParts = computeMarkdownPartDigests(lockedCommand, '.opencode/commands/opsx-propose.md');

    writeFileSync(join(projectDir, '.opencode', 'commands', 'opsx-propose.md'), currentCommand);
    writeLock(projectDir, {
      version: '1.0.0',
      sourceVersion: 'openspec-opc@1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        {
          path: '.opencode/commands/opsx-propose.md',
          digest: computeDigestString(lockedCommand),
          status: 'managed',
          type: 'merge',
          managedKind: 'commands',
          mergeStrategy: 'frontmatter-merge',
          frontmatterDigest: lockedParts.frontmatterDigest,
          bodyDigest: lockedParts.bodyDigest
        }
      ]
    });
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '2.0.0',
        handler: 'node-ts',
        managedAssets: [
          {
            path: '.opencode/commands/opsx-propose.md',
            digest: computeDigestString(templateCommand),
            type: 'merge',
            managedKind: 'commands',
            mergeStrategy: 'frontmatter-merge',
            ...computeMarkdownPartDigests(templateCommand, '.opencode/commands/opsx-propose.md')
          }
        ]
      })
    );
    writeFileSync(join(bundleDir, 'template', '.opencode', 'commands', 'opsx-propose.md'), templateCommand);

    const applyResult = apply(projectDir, bundleDir);
    assert.strictEqual(applyResult.status, 'success');
    const merged = readFileSync(join(projectDir, '.opencode', 'commands', 'opsx-propose.md'), 'utf-8');
    assert.match(merged, /localAlias: keep-me/);
    assert.match(merged, /description: Updated/);
    assert.match(merged, /Template body\./);
    assert.doesNotMatch(merged, /Base body\./);
  });

  it('apply should preserve repository override blocks in managed skill files', () => {
    mkdirSync(join(projectDir, '.opencode', 'skills', 'openspec-propose'), { recursive: true });
    mkdirSync(join(bundleDir, 'template', '.opencode', 'skills', 'openspec-propose'), { recursive: true });
    const lockedSkill = `---\nname: openspec-propose\ndescription: Base skill\n---\n\nShared intro.\n\n## Repository Overrides\n\n<!-- OPENSPEC-PRESERVE:BEGIN repository-overrides -->\nRepository-specific skill guidance.\n<!-- OPENSPEC-PRESERVE:END repository-overrides -->\n`;
    const currentSkill = `---\nname: openspec-propose\ndescription: Base skill\nmetadata:\n  localAlias: keep-me\n---\n\nShared intro.\n\n## Repository Overrides\n\n<!-- OPENSPEC-PRESERVE:BEGIN repository-overrides -->\nKeep this repo-specific note.\n<!-- OPENSPEC-PRESERVE:END repository-overrides -->\n`;
    const templateSkill = `---\nname: openspec-propose\ndescription: Updated skill\n---\n\nUpdated intro.\n\n## Repository Overrides\n\n<!-- OPENSPEC-PRESERVE:BEGIN repository-overrides -->\nAdd repository-specific skill guidance here. This block is preserved across template upgrades.\n<!-- OPENSPEC-PRESERVE:END repository-overrides -->\n`;
    const lockedParts = computeMarkdownPartDigests(lockedSkill, '.opencode/skills/openspec-propose/SKILL.md');

    writeFileSync(join(projectDir, '.opencode', 'skills', 'openspec-propose', 'SKILL.md'), currentSkill);
    writeLock(projectDir, {
      version: '1.0.0',
      sourceVersion: 'openspec-opc@1.0.0',
      handler: 'node-ts',
      installedAt: new Date().toISOString(),
      assets: [
        {
          path: '.opencode/skills/openspec-propose/SKILL.md',
          digest: computeDigestString(lockedSkill),
          status: 'managed',
          type: 'merge',
          managedKind: 'skills',
          mergeStrategy: 'frontmatter-merge',
          frontmatterDigest: lockedParts.frontmatterDigest,
          bodyDigest: lockedParts.bodyDigest
        }
      ]
    });
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '2.0.0',
        handler: 'node-ts',
        managedAssets: [
          {
            path: '.opencode/skills/openspec-propose/SKILL.md',
            digest: computeDigestString(templateSkill),
            type: 'merge',
            managedKind: 'skills',
            mergeStrategy: 'frontmatter-merge',
            ...computeMarkdownPartDigests(templateSkill, '.opencode/skills/openspec-propose/SKILL.md')
          }
        ]
      })
    );
    writeFileSync(join(bundleDir, 'template', '.opencode', 'skills', 'openspec-propose', 'SKILL.md'), templateSkill);

    const applyResult = apply(projectDir, bundleDir);
    assert.strictEqual(applyResult.status, 'success');
    const merged = readFileSync(join(projectDir, '.opencode', 'skills', 'openspec-propose', 'SKILL.md'), 'utf-8');
    assert.match(merged, /description: Updated skill/);
    assert.match(merged, /Updated intro\./);
    assert.match(merged, /Keep this repo-specific note\./);
    assert.match(merged, /localAlias: keep-me/);
    assert.doesNotMatch(merged, /Add repository-specific skill guidance here/);
  });
});

describe('Error Paths', () => {
  let projectDir;
  let bundleDir;
  
  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'opc-project-'));
    bundleDir = mkdtempSync(join(tmpdir(), 'opc-bundle-'));
  });
  
  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(bundleDir, { recursive: true, force: true });
  });
  
  it('should handle corrupted manifest', () => {
    writeFileSync(join(bundleDir, 'manifest.json'), 'not-json');
    
    assert.throws(() => {
      generateUpgradePlan(projectDir, bundleDir);
    }, /Unexpected token/);
  });
  
  it('should handle empty project directory', () => {
    mkdirSync(join(bundleDir, 'template'), { recursive: true });
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '1.0.0',
        handler: 'node-ts',
        managedAssets: [
          { path: 'package.json', digest: 'abc123', type: 'file' }
        ]
      })
    );
    writeFileSync(
      join(bundleDir, 'template', 'package.json'),
      '{}'
    );
    
    const plan = generateUpgradePlan(projectDir, bundleDir);
    
    assert.ok(plan);
    assert.strictEqual(plan.fromVersion, null);
  });
  
  it('should handle corrupted lock file', () => {
    // Write invalid lock
    mkdirSync(join(projectDir, 'openspec'), { recursive: true });
    writeFileSync(
      join(projectDir, 'openspec', '.openspec-opc-template-lock.json'),
      'not-json'
    );
    
    const lock = readLock(projectDir);
    assert.strictEqual(lock, null);
  });
});

describe('Staging Edge Cases', () => {
  it('should handle staging cleanup after error', () => {
    const staging = createStagingWorkspace();
    
    // Verify staging exists
    assert.ok(staging.path);
    
    // Simulate error then cleanup
    staging.cleanup();
    
    // Cleanup should be idempotent
    staging.cleanup();
  });
  
  it('should handle multiple staging workspaces', () => {
    const staging1 = createStagingWorkspace();
    const staging2 = createStagingWorkspace();
    
    assert.notStrictEqual(staging1.path, staging2.path);
    
    staging1.cleanup();
    staging2.cleanup();
  });
});

describe('Trust Root Verification', () => {
  let bundleDir;
  
  beforeEach(() => {
    bundleDir = mkdtempSync(join(tmpdir(), 'opc-bundle-'));
  });
  
  afterEach(() => {
    rmSync(bundleDir, { recursive: true, force: true });
  });
  
  it('should detect missing template files', async () => {
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        version: '1.0.0',
        handler: 'node-ts',
        managedAssets: [
          { path: 'missing.txt', digest: 'abc123', type: 'file' }
        ]
      })
    );
    
    const { verifyTrustRoot } = await import('../src/manifest.mjs');
    const result = verifyTrustRoot(bundleDir);
    
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});

describe('Rollback Package', () => {
  let projectDir;
  
  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'opc-project-'));
    
    // Create project files
    mkdirSync(join(projectDir, '.openspec-opc'), { recursive: true });
    mkdirSync(join(projectDir, 'openspec'), { recursive: true });
    writeFileSync(join(projectDir, 'package.json'), '{"name": "original"}');
    writeFileSync(join(projectDir, 'README.md'), '# Original');
    writeFileSync(join(projectDir, 'openspec', '.openspec-opc-template-lock.json'), '{"version":"1.0.0","handler":"node-ts","assets":[]}');
  });
  
  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });
  
  it('should create and restore rollback package', async () => {
    const { createRollbackPackage, restoreFromRollback, listRollbackPackages } = await import('../src/rollback.mjs');
    
    // Create rollback package
    const assets = [
      { path: 'package.json' },
      { path: 'README.md' }
    ];
    
    const rollbackId = createRollbackPackage(projectDir, '1.0.0', assets);
    
    assert.ok(rollbackId);
    
    // Verify package exists
    const packages = listRollbackPackages(projectDir);
    assert.strictEqual(packages.length, 1);
    assert.strictEqual(packages[0].version, '1.0.0');
    
    // Modify files
    writeFileSync(join(projectDir, 'package.json'), '{"name": "modified"}');
    writeFileSync(join(projectDir, 'README.md'), '# Modified');
    
    // Restore from rollback
    const { restored, failed } = restoreFromRollback(projectDir, rollbackId);
    
    assert.strictEqual(restored.length, 3);
    assert.strictEqual(failed.length, 0);
    
    // Verify restoration
    const pkgContent = readFileSync(join(projectDir, 'package.json'), 'utf-8');
    const readmeContent = readFileSync(join(projectDir, 'README.md'), 'utf-8');
    
    assert.strictEqual(pkgContent, '{"name": "original"}');
    assert.strictEqual(readmeContent, '# Original');
  });
  
  it('should handle missing rollback package', async () => {
    const { restoreFromRollback } = await import('../src/rollback.mjs');
    
    assert.throws(() => {
      restoreFromRollback(projectDir, 'nonexistent');
    }, /Rollback package not found/);
  });
  
  it('should cleanup old rollback packages', async () => {
    const { createRollbackPackage, listRollbackPackages } = await import('../src/rollback.mjs');
    
    // Create 6 rollback packages (max is 5)
    for (let i = 0; i < 6; i++) {
      createRollbackPackage(projectDir, `1.0.${i}`, [{ path: 'package.json' }]);
    }
    
    const packages = listRollbackPackages(projectDir);
    
    // Should have cleaned up oldest, keeping 5
    assert.ok(packages.length <= 5, 'Should cleanup old rollback packages');
  });
});

describe('CLI', () => {
  it('should fail cleanly when no bundle can be discovered', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'opc-project-'));

    try {
      const result = spawnSync(process.execPath, [cliPath, 'check', '--project', projectDir], {
        encoding: 'utf-8'
      });

      assert.strictEqual(result.status, 1);
      assert.match(result.stderr, /Bundle not found/);
      assert.doesNotMatch(result.stderr, /require is not defined/);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('should accept --confirm-suspected during adopt', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'opc-project-'));
    const bundleDir = mkdtempSync(join(tmpdir(), 'opc-bundle-'));

    try {
      mkdirSync(join(bundleDir, 'template'), { recursive: true });
      writeFileSync(join(projectDir, 'package.json'), '{"name":"local"}');
      writeFileSync(
        join(bundleDir, 'manifest.json'),
        JSON.stringify({
          version: '1.0.0',
          handler: 'node-ts',
          managedAssets: [
            {
              path: 'package.json',
              digest: computeDigestString('{"name":"template"}'),
              type: 'file'
            }
          ]
        })
      );
      writeFileSync(join(bundleDir, 'template', 'package.json'), '{"name":"template"}');

      const result = spawnSync(
        process.execPath,
        [cliPath, 'adopt', '--project', projectDir, '--bundle', bundleDir, '--confirm-suspected'],
        { encoding: 'utf-8' }
      );

      assert.strictEqual(result.status, 0);
      assert.match(result.stdout, /Confirmed suspected assets/);
      assert.match(result.stdout, /Adopted project/);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
      rmSync(bundleDir, { recursive: true, force: true });
    }
  });

  it('list-rollbacks should not require a bundle', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'opc-project-'));

    try {
      const result = spawnSync(process.execPath, [cliPath, 'list-rollbacks', '--project', projectDir], {
        encoding: 'utf-8'
      });

      assert.strictEqual(result.status, 0);
      assert.match(result.stdout, /No rollback packages found/);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('dry-run should write a categorized plan report when --plan-out is provided', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'opc-project-'));
    const bundleDir = mkdtempSync(join(tmpdir(), 'opc-bundle-'));
    const planOutPath = join(projectDir, 'openspec', 'install-upgrade-plan.txt');

    try {
      mkdirSync(join(projectDir, '.opencode', 'commands'), { recursive: true });
      mkdirSync(join(bundleDir, 'template', '.opencode', 'commands'), { recursive: true });
      const lockedCommand = `---\ndescription: Base\nmetadata:\n  author: openspec\n---\n\nBase body.\n`;
      const currentCommand = `---\ndescription: Base\nmetadata:\n  author: openspec\n  localAlias: keep-me\n---\n\nBase body.\n`;
      const templateCommand = `---\ndescription: Updated\nmetadata:\n  author: openspec\n  version: "2.0"\n---\n\nTemplate body.\n\n## Repository Overrides\n\n<!-- OPENSPEC-PRESERVE:BEGIN repository-overrides -->\nAdd repository-specific command guidance here. This block is preserved across template upgrades.\n<!-- OPENSPEC-PRESERVE:END repository-overrides -->\n`;
      const lockedParts = computeMarkdownPartDigests(lockedCommand, '.opencode/commands/opsx-propose.md');

      writeFileSync(join(projectDir, '.opencode', 'commands', 'opsx-propose.md'), currentCommand);
      writeLock(projectDir, {
        version: '1.0.0',
        sourceVersion: 'openspec-opc@1.0.0',
        handler: 'node-ts',
        installedAt: new Date().toISOString(),
        assets: [
          {
            path: '.opencode/commands/opsx-propose.md',
            digest: computeDigestString(lockedCommand),
            status: 'managed',
            type: 'merge',
            managedKind: 'commands',
            mergeStrategy: 'frontmatter-merge',
            frontmatterDigest: lockedParts.frontmatterDigest,
            bodyDigest: lockedParts.bodyDigest
          }
        ]
      });
      writeFileSync(
        join(bundleDir, 'manifest.json'),
        JSON.stringify({
          version: '2.0.0',
          handler: 'node-ts',
          managedAssets: [
            {
              path: '.opencode/commands/opsx-propose.md',
              digest: computeDigestString(templateCommand),
              type: 'merge',
              managedKind: 'commands',
              mergeStrategy: 'frontmatter-merge',
              ...computeMarkdownPartDigests(templateCommand, '.opencode/commands/opsx-propose.md')
            }
          ]
        })
      );
      writeFileSync(join(bundleDir, 'template', '.opencode', 'commands', 'opsx-propose.md'), templateCommand);

      const result = spawnSync(
        process.execPath,
        [cliPath, 'dry-run', '--project', projectDir, '--bundle', bundleDir, '--plan-out', planOutPath],
        { encoding: 'utf-8' }
      );

      assert.strictEqual(result.status, 0);
      assert.ok(existsSync(planOutPath));
      const report = readFileSync(planOutPath, 'utf-8');
      assert.match(report, /OpenSpec OPC Upgrade dry-run Report/);
      assert.match(report, /Managed Merge Details:/);
      assert.match(report, /preserve command\/skill frontmatter additions: 1/);
      assert.match(report, /preserve Repository Overrides body blocks: 1/);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
      rmSync(bundleDir, { recursive: true, force: true });
    }
  });

  it('stage5-upgrade-driver should render the fixed command sequence', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'opc-project-'));

    try {
      const result = spawnSync(
        process.execPath,
        [
          stage5UpgradeDriverPath,
          '--project',
          projectDir,
          '--ai-config-dir',
          '.opencode',
          '--ci-type',
          'github',
          '--format',
          'json'
        ],
        { encoding: 'utf-8' }
      );

      assert.strictEqual(result.status, 0);
      const rendered = JSON.parse(result.stdout);
      assert.strictEqual(rendered.bundleOut, join(projectDir, '.openspec', '.cache', 'openspec-opc-upgrade-bundle'));
      assert.strictEqual(rendered.planOut, join(projectDir, 'openspec', 'install-upgrade-plan.txt'));
      assert.deepStrictEqual(
        rendered.commands.map((entry) => entry.id),
        ['build_bundle', 'check', 'adopt', 'dry_run', 'apply']
      );
      assert.match(rendered.commands[0].command, /build-source-bundle\.mjs/);
      assert.match(rendered.commands[1].command, /check/);
      assert.match(rendered.commands[1].command, /--plan-out/);
      assert.match(rendered.commands[2].when, /only if check reports missing lock/);
      assert.match(rendered.commands[3].command, /dry-run/);
      assert.match(rendered.commands[4].when, /explicitly confirms/);
      assert.strictEqual(rendered.schemaVersion, '1');
      assert.strictEqual(rendered.type, 'openspec-opc-stage5-upgrade-plan');
      assert.strictEqual(rendered.transitionSchemaVersion, '1');
      assert.strictEqual(rendered.initialStepId, 'build_bundle');
      assert.deepStrictEqual(rendered.terminalStates, ['done', 'stop', 'stop_with_rollback']);
      assert.deepStrictEqual(rendered.eventTypes, ['success', 'blocked', 'failed', 'partial', 'skipped', 'approved', 'rejected']);
      assert.deepStrictEqual(
        rendered.runtimeStatusContract,
        {
          cliName: 'openspec-opc-upgrade-cli',
          statusByExitCode: {
            '0': 'success',
            '1': 'failed',
            '2': 'blocked',
            '3': 'partial'
          },
          exitCodeByStatus: {
            success: 0,
            failed: 1,
            blocked: 2,
            partial: 3
          }
        }
      );
      assert.ok(Array.isArray(rendered.steps));
      assert.deepStrictEqual(
        rendered.steps.map((step) => step.id),
        ['build_bundle', 'check', 'adopt_if_missing_lock', 'dry_run', 'user_confirmation', 'apply']
      );
      assert.strictEqual(rendered.steps[2].condition.checkStatus, 'blocked');
      assert.deepStrictEqual(
        rendered.steps[1].resultMapping,
        {
          executor: 'openspec-opc-upgrade-cli',
          commandId: 'check',
          runtimeStatusByExitCode: {
            '0': 'success',
            '1': 'failed',
            '2': 'blocked'
          },
          eventByRuntimeStatus: {
            success: 'success',
            failed: 'failed',
            blocked: 'blocked'
          }
        }
      );
      assert.deepStrictEqual(
        rendered.steps[0].transitions,
        [
          { on: 'success', to: 'check' },
          { on: 'failed', to: 'stop' }
        ]
      );
      assert.deepStrictEqual(
        rendered.steps[4].transitions,
        [
          { on: 'approved', to: 'apply' },
          { on: 'rejected', to: 'stop' }
        ]
      );
      assert.deepStrictEqual(
        rendered.steps[5].resultMapping,
        {
          executor: 'openspec-opc-upgrade-cli',
          commandId: 'apply',
          runtimeStatusByExitCode: {
            '0': 'success',
            '1': 'failed',
            '2': 'blocked',
            '3': 'partial'
          },
          eventByRuntimeStatus: {
            success: 'success',
            failed: 'failed',
            blocked: 'blocked',
            partial: 'partial'
          }
        }
      );
      assert.deepStrictEqual(
        rendered.steps[5].transitions,
        [
          { on: 'success', to: 'done' },
          { on: 'failed', to: 'stop_with_rollback' },
          { on: 'blocked', to: 'stop' },
          { on: 'partial', to: 'stop_with_rollback' }
        ]
      );
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('stage5-upgrade-driver should write execution JSON when --execution-out is provided', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'opc-project-'));
    const executionOut = join(projectDir, '.openspec', 'install-upgrade-sequence.json');

    try {
      const result = spawnSync(
        process.execPath,
        [
          stage5UpgradeDriverPath,
          '--project',
          projectDir,
          '--ai-config-dir',
          '.opencode',
          '--execution-out',
          executionOut
        ],
        { encoding: 'utf-8' }
      );

      assert.strictEqual(result.status, 0);
      assert.ok(existsSync(executionOut));
      const rendered = JSON.parse(readFileSync(executionOut, 'utf-8'));
      assert.strictEqual(rendered.planOut, join(projectDir, 'openspec', 'install-upgrade-plan.txt'));
      assert.strictEqual(rendered.steps[5].id, 'apply');
      assert.strictEqual(rendered.steps[4].kind, 'manual_gate');
      assert.strictEqual(rendered.steps[5].transitions[0].to, 'done');
      assert.strictEqual(rendered.steps[5].resultMapping.runtimeStatusByExitCode['3'], 'partial');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});

describe('Source Bundle Builder', () => {
  it('should build a runtime bundle from source templates with remapped AI config paths', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'opc-bundle-out-'));
    const sourceRoot = fileURLToPath(new URL('../../..', import.meta.url));

    try {
      const result = spawnSync(
        process.execPath,
        [buildSourceBundlePath, '--source-root', sourceRoot, '--out', outDir, '--ai-config-dir', '.opencode'],
        { encoding: 'utf-8' }
      );

      assert.strictEqual(result.status, 0);

      const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf-8'));
      const managedPaths = new Set(manifest.managedAssets.map((asset) => asset.path));

      assert.ok(managedPaths.has('AGENTS.md'));
      assert.ok(managedPaths.has('openspec/config.yaml'));
      assert.ok(managedPaths.has('.opencode/commands/opsx-propose.md'));
      assert.ok(managedPaths.has('.opencode/skills/openspec-propose/SKILL.md'));
      const agentsAsset = manifest.managedAssets.find((asset) => asset.path === 'AGENTS.md');
      assert.strictEqual(agentsAsset.type, 'merge');
      assert.strictEqual(agentsAsset.mergeStrategy, 'preserve-section');
      const commandAsset = manifest.managedAssets.find((asset) => asset.path === '.opencode/commands/opsx-propose.md');
      assert.strictEqual(commandAsset.type, 'merge');
      assert.strictEqual(commandAsset.mergeStrategy, 'frontmatter-merge');
      assert.ok(commandAsset.frontmatterDigest);
      assert.ok(commandAsset.bodyDigest);
      assert.ok(existsSync(join(outDir, 'template', '.opencode', 'commands', 'opsx-propose.md')));
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('should include the selected CI config as a managed merge asset', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'opc-bundle-out-'));
    const sourceRoot = fileURLToPath(new URL('../../..', import.meta.url));

    try {
      const result = spawnSync(
        process.execPath,
        [
          buildSourceBundlePath,
          '--source-root',
          sourceRoot,
          '--out',
          outDir,
          '--ai-config-dir',
          '.opencode',
          '--ci-type',
          'github'
        ],
        { encoding: 'utf-8' }
      );

      assert.strictEqual(result.status, 0);

      const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf-8'));
      const ciAsset = manifest.managedAssets.find((asset) => asset.path === '.github/workflows/openspec-archive.yml');
      assert.ok(ciAsset);
      assert.strictEqual(ciAsset.type, 'merge');
      assert.strictEqual(ciAsset.mergeStrategy, 'ci-jobs');
      assert.ok(Array.isArray(manifest.managedCIJobs));
      assert.ok(manifest.managedCIJobs.some((job) => job.name === 'archive'));
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('Managed Files', () => {
  it('mergePreservedSection should retain repository-specific constraints', () => {
    const template = `# Demo\n\n## Repository-Specific Constraints\n\nTemplate block.\n\n## Required Behavior\n\nShared rules.\n`;
    const current = `# Demo\n\n## Repository-Specific Constraints\n\nCustom rule.\nAnother rule.\n\n## Required Behavior\n\nOld shared rules.\n`;
    const merged = mergePreservedSection(template, current);

    assert.match(merged, /Custom rule\./);
    assert.match(merged, /Another rule\./);
    assert.match(merged, /Shared rules\./);
    assert.doesNotMatch(merged, /Template block\./);
  });

  it('mergeManagedCIJobs should preserve unrelated GitHub jobs', () => {
    const template = `name: OpenSpec Archive\non:\n  release:\n    types: [published]\njobs:\n  archive:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo template\n`;
    const current = `name: OpenSpec Archive\non:\n  workflow_dispatch:\njobs:\n  archive:\n    runs-on: ubuntu-22.04\n    steps:\n      - run: echo old\n  custom_checks:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo keep\n`;

    const merged = mergeManagedCIJobs(template, current, '.github/workflows/openspec-archive.yml');

    assert.match(merged, /echo template/);
    assert.match(merged, /custom_checks:/);
    assert.match(merged, /echo keep/);
  });

  it('mergeManagedCIJobs should keep user-owned GitHub workflow headers intact', () => {
    const template = `name: OpenSpec Archive\non:\n  release:\n    types: [published]\njobs:\n  archive:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo template\n`;
    const current = `name: Custom Workflow\non:\n  push:\n    branches: [main]\n  workflow_dispatch:\njobs:\n  archive:\n    runs-on: ubuntu-22.04\n    steps:\n      - run: echo old\n`;

    const merged = mergeManagedCIJobs(template, current, '.github/workflows/openspec-archive.yml');

    assert.match(merged, /name: Custom Workflow/);
    assert.match(merged, /push:/);
    assert.doesNotMatch(merged, /name: OpenSpec Archive/);
    assert.doesNotMatch(merged, /release:/);
    assert.match(merged, /echo template/);
  });

  it('extractManagedCIJobs should list template-managed GitLab jobs', () => {
    const gitlab = `stages:\n  - validate\n  - archive\nopenspec:validate:\n  stage: validate\n  script:\n    - echo validate\nopenspec:archive:\n  stage: archive\n  script:\n    - echo archive\n`;
    const jobs = extractManagedCIJobs('.gitlab-ci.yml', gitlab);

    assert.deepStrictEqual(
      jobs.map((job) => job.name),
      ['openspec:archive', 'openspec:validate']
    );
  });

  it('mergeMarkdownFrontmatter should preserve user-added metadata keys', () => {
    const template = `---\ndescription: Updated\nmetadata:\n  author: openspec\n  version: "2.0"\n---\n\nTemplate body.\n`;
    const current = `---\ndescription: Old\nmetadata:\n  author: openspec\n  localAlias: keep-me\ncustomKey: custom-value\n---\n\nCurrent body.\n`;

    const merged = mergeMarkdownFrontmatter(template, current, '.opencode/commands/opsx-propose.md');

    assert.match(merged, /description: Updated/);
    assert.match(merged, /localAlias: keep-me/);
    assert.match(merged, /customKey: custom-value/);
    assert.match(merged, /Template body\./);
    assert.doesNotMatch(merged, /Current body\./);
  });

  it('mergeMarkdownFrontmatter should preserve marked repository override blocks', () => {
    const template = `---\ndescription: Updated\n---\n\nShared intro.\n\n## Repository Overrides\n\n<!-- OPENSPEC-PRESERVE:BEGIN repository-overrides -->\nAdd repository-specific guidance here.\n<!-- OPENSPEC-PRESERVE:END repository-overrides -->\n`;
    const current = `---\ndescription: Updated\ncustomKey: custom-value\n---\n\nShared intro.\n\n## Repository Overrides\n\n<!-- OPENSPEC-PRESERVE:BEGIN repository-overrides -->\nKeep this local block.\n<!-- OPENSPEC-PRESERVE:END repository-overrides -->\n`;

    const merged = mergeMarkdownFrontmatter(template, current, '.opencode/skills/openspec-propose/SKILL.md');

    assert.match(merged, /customKey: custom-value/);
    assert.match(merged, /Keep this local block\./);
    assert.doesNotMatch(merged, /Add repository-specific guidance here\./);
  });

  it('formatPlan should spell out preserve and merge categories', () => {
    const plan = {
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      createdAt: '2026-04-21T00:00:00.000Z',
      actions: [
        { type: 'merge', path: 'AGENTS.md', mergeStrategy: 'preserve-section' },
        { type: 'merge', path: '.github/workflows/openspec-archive.yml', mergeStrategy: 'ci-jobs' },
        { type: 'merge', path: '.opencode/commands/opsx-propose.md', mergeStrategy: 'frontmatter-merge' },
        { type: 'delete', path: '.opencode/commands/opsx-archive.md' },
        { type: 'conflict', path: '.opencode/skills/openspec-propose/SKILL.md' }
      ]
    };

    const rendered = formatPlan(plan, true);

    assert.match(rendered, /Managed Merge Details:/);
    assert.match(rendered, /preserve AGENTS repository constraints: 1/);
    assert.match(rendered, /merge managed CI jobs while keeping unrelated user jobs: 1/);
    assert.match(rendered, /preserve command\/skill frontmatter additions: 1/);
    assert.match(rendered, /preserve Repository Overrides body blocks: 1/);
    assert.match(rendered, /delete stale managed files removed from template: 1/);
    assert.match(rendered, /ignore or stop on user-owned drift\/conflicts until resolved: 1/);
  });

  it('groupActionsByGroup should respect dependency ordering for managed groups', () => {
    const grouped = groupActionsByGroup({
      actions: [
        { type: 'replace', path: '.github/workflows/openspec-archive.yml', assetGroup: 'ci' },
        { type: 'replace', path: '.opencode/commands/opsx-propose.md', assetGroup: 'commands' },
        { type: 'replace', path: '.opencode/skills/openspec-propose/SKILL.md', assetGroup: 'skills' },
        { type: 'replace', path: 'AGENTS.md', assetGroup: 'docs' },
        { type: 'replace', path: 'openspec/config.yaml', assetGroup: 'config' },
        { type: 'replace', path: 'openspec/schemas/spec.schema.json', assetGroup: 'schemas' }
      ]
    });

    const order = [...grouped.keys()];
    assert.ok(order.indexOf('config') < order.indexOf('schemas'));
    assert.ok(order.indexOf('config') < order.indexOf('commands'));
    assert.ok(order.indexOf('config') < order.indexOf('ci'));
    assert.ok(order.indexOf('schemas') < order.indexOf('commands'));
    assert.ok(order.indexOf('commands') < order.indexOf('skills'));
  });
});
