/**
 * Staging Workspace Manager
 *
 * Handles staging directory lifecycle with trap cleanup (plan item 40)
 * Implements two-phase execution (plan items 13, 42)
 */

import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative, dirname } from 'path';

const STAGING_PREFIX = 'openspec-opc-upgrade-';

/**
 * Create staging workspace
 * @returns {{path: string, cleanup: () => void}}
 */
export function createStagingWorkspace() {
  const stagingPath = mkdtempSync(join(tmpdir(), STAGING_PREFIX));
  
  let cleanedUp = false;
  
  const cleanup = () => {
    if (!cleanedUp && existsSync(stagingPath)) {
      try {
        rmSync(stagingPath, { recursive: true, force: true });
        cleanedUp = true;
      } catch (e) {
        console.warn(`Failed to cleanup staging: ${e.message}`);
      }
    }
  };
  
  // Register trap cleanup
  const signals = ['SIGINT', 'SIGTERM', 'exit'];
  const handlers = [];
  
  for (const signal of signals) {
    const handler = () => {
      cleanup();
      if (signal !== 'exit') {
        process.exit(1);
      }
    };
    process.on(signal, handler);
    handlers.push({ signal, handler });
  }
  
  // Return cleanup that also removes signal handlers
  const fullCleanup = () => {
    for (const { signal, handler } of handlers) {
      process.removeListener(signal, handler);
    }
    cleanup();
  };
  
  return {
    path: stagingPath,
    cleanup: fullCleanup
  };
}

/**
 * Write changes to staging
 * @param {string} stagingPath
 * @param {string} projectPath
 * @param {Array<{path: string, type: string, content?: string | Buffer | null}>} changes
 */
export function stageChanges(stagingPath, projectPath, changes) {
  for (const change of changes) {
    if (change.type === 'delete') {
      continue;
    }

    const targetPath = join(stagingPath, change.path);
    const targetDir = dirname(targetPath);
    
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    
    writeFileSync(targetPath, change.content);
  }
}

/**
 * Apply staged changes to project (plan item 42: commit phase then write phase)
 * @param {string} stagingPath
 * @param {string} projectPath
 * @param {Array<{path: string, type: string}>} changes - Changes to apply
 * @returns {string[]} Successfully applied paths
 */
export function applyStagedChanges(stagingPath, projectPath, changes) {
  const applied = [];
  
  // Phase 1: Validate all files exist in staging
  for (const change of changes) {
    if (change.type === 'delete') {
      continue;
    }

    const path = change.path;
    const stagedFile = join(stagingPath, path);
    if (!existsSync(stagedFile)) {
      throw new Error(`Staged file missing: ${path}`);
    }
  }
  
  // Phase 2: Write to project
  for (const change of changes) {
    const path = change.path;
    const targetFile = join(projectPath, path);
    const targetDir = dirname(targetFile);

    if (change.type === 'delete') {
      rmSync(targetFile, { recursive: true, force: true });
      applied.push(path);
      continue;
    }

    const stagedFile = join(stagingPath, path);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    
    const content = readFileSync(stagedFile);
    writeFileSync(targetFile, content);
    applied.push(path);
  }
  
  return applied;
}

/**
 * Rollback changes from rollback package
 * @param {string} rollbackPath
 * @param {string} projectPath
 * @returns {string[]} Restored paths
 */
export function rollbackChanges(rollbackPath, projectPath) {
  const restored = [];
  
  // TODO: Implement rollback from backup
  // For now, just log
  console.log('Rollback not yet implemented');
  
  return restored;
}

export default {
  createStagingWorkspace,
  stageChanges,
  applyStagedChanges,
  rollbackChanges
};
