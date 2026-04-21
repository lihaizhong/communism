/**
 * Upgrade Runtime - Main Entry Point
 *
 * Implements check, dry-run, adopt, apply, rollback commands.
 */

import { existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { parseManifest, verifyTrustRoot } from './manifest.mjs';
import { readLock, writeLock, createLock, hasLock } from './lock.mjs';
import { createStagingWorkspace, stageChanges, applyStagedChanges } from './staging.mjs';
import { generateUpgradePlan, isPlanValid, formatPlan, groupActionsByGroup } from './plan.mjs';
import { createRollbackPackage, restoreFromRollback, getLatestRollbackId } from './rollback.mjs';
import { FailureKinds, LogLevels } from './types.mjs';
import { mergePreservedSection } from './managed-files.mjs';
import { mergeManagedCIJobs } from './ci-files.mjs';
import { mergeMarkdownFrontmatter } from './frontmatter-files.mjs';

/**
 * Check project state
 * @param {string} projectPath
 * @param {string} bundlePath
 * @returns {import('./types.mjs').UpgradeResult}
 */
export function check(projectPath, bundlePath) {
  console.log(`[${LogLevels.check}] Checking project state...`);
  
  // Verify trust root
  const trustResult = verifyTrustRoot(bundlePath);
  if (!trustResult.valid) {
    return {
      status: 'failed',
      completedGroups: [],
      blockedGroups: [],
      failures: trustResult.errors.map(err => ({
        kind: FailureKinds.TRUST_ROOT_INVALID,
        path: '.',
        message: err,
        recoverable: false
      })),
      newLockVersion: null
    };
  }
  
  if (!hasLock(projectPath)) {
    return {
      status: 'blocked',
      completedGroups: [],
      blockedGroups: [],
      failures: [{
        kind: FailureKinds.UNKNOWN,
        path: '.',
        message: 'No lock file found. Run adopt to initialize.',
        recoverable: true
      }],
      newLockVersion: null
    };
  }
  
  const plan = generateUpgradePlan(projectPath, bundlePath);
  
  return {
    status: 'success',
    completedGroups: [],
    blockedGroups: [],
    failures: [],
    plan
  };
}

/**
 * Dry run - show what would happen
 * @param {string} projectPath
 * @param {string} bundlePath
 * @param {boolean} full - Show all changes
 * @returns {import('./types.mjs').UpgradeResult}
 */
export function dryRun(projectPath, bundlePath, full = false) {
  console.log(`[${LogLevels['dry-run']}] Generating dry-run plan...`);
  
  const trustResult = verifyTrustRoot(bundlePath);
  if (!trustResult.valid) {
    return {
      status: 'failed',
      completedGroups: [],
      blockedGroups: [],
      failures: trustResult.errors.map(err => ({
        kind: FailureKinds.TRUST_ROOT_INVALID,
        path: '.',
        message: err,
        recoverable: false
      })),
      newLockVersion: null
    };
  }
  
  const plan = generateUpgradePlan(projectPath, bundlePath);
  
  console.log(formatPlan(plan, full));
  
  const hasConflicts = plan.actions.some(a => a.type === 'conflict');
  
  return {
    status: hasConflicts ? 'blocked' : 'success',
    completedGroups: [],
    blockedGroups: [],
    failures: hasConflicts 
      ? plan.actions
          .filter(a => a.type === 'conflict')
          .map(a => ({
            kind: FailureKinds.CONFLICT_USER_MODIFIED,
            path: a.path,
            message: a.reason,
            recoverable: true
          }))
      : [],
    plan
  };
}

/**
 * Adopt an existing project
 * @param {string} projectPath
 * @param {string} bundlePath
 * @param {{confirmSuspected?: boolean}} [options]
 * @returns {import('./types.mjs').UpgradeResult}
 */
export function adopt(projectPath, bundlePath, options = {}) {
  console.log(`[${LogLevels.adopt}] Adopting project...`);
  const { confirmSuspected = false } = options;
  const manifest = parseManifest(join(bundlePath, 'manifest.json'));
  
  // Check for suspected-managed assets (plan items 36-39)
  const suspectedAssets = [];
  const confirmedAssets = [];
  
  for (const asset of manifest.managedAssets) {
    const assetPath = join(projectPath, asset.path);
    
    if (!existsSync(assetPath)) {
      confirmedAssets.push(asset);
    } else {
      // Check if file exists but differs
      const content = readFileSync(assetPath);
      const digest = createHash('sha256').update(content).digest('hex');
      
      if (digest !== asset.digest) {
        // Calculate diff percentage (simplified)
        suspectedAssets.push({
          ...asset,
          localDigest: digest
        });
      } else {
        confirmedAssets.push(asset);
      }
    }
  }
  
  // Show suspected assets for user confirmation (plan item 38)
  if (suspectedAssets.length > 0) {
    console.log('\nSuspected managed assets (need confirmation):');
    for (const asset of suspectedAssets) {
      console.log(`  [SUSPECTED] ${asset.path}`);
      console.log(`    Template digest: ${asset.digest}`);
      console.log(`    Local digest:    ${asset.localDigest}`);
    }
    if (confirmSuspected) {
      console.log('\nConfirmed suspected assets for tracking in the lock file.');
    } else {
      console.log('\nRun with --confirm-suspected to acknowledge these assets.');
    }
  }
  
  // Create lock with confirmed assets
  const lock = createLock(projectPath, manifest);
  
  // Mark suspected as suspected-managed
  for (const asset of lock.assets) {
    if (suspectedAssets.some(s => s.path === asset.path)) {
      asset.status = 'suspected-managed';
    }
  }
  
  writeLock(projectPath, lock);
  
  console.log(`\nAdopted project with ${confirmedAssets.length} confirmed assets`);
  if (suspectedAssets.length > 0) {
    console.log(`and ${suspectedAssets.length} suspected assets pending confirmation.`);
  }
  
  return {
    status: 'success',
    completedGroups: [],
    blockedGroups: [],
    failures: [],
    newLockVersion: manifest.version
  };
}

/**
 * Apply upgrade
 * @param {string} projectPath
 * @param {string} bundlePath
 * @param {import('./types.mjs').UpgradePlan} [existingPlan]
 * @returns {import('./types.mjs').UpgradeResult}
 */
export function apply(projectPath, bundlePath, existingPlan = null) {
  console.log(`[${LogLevels.apply}] Applying upgrade...`);
  
  // Verify trust root
  const trustResult = verifyTrustRoot(bundlePath);
  if (!trustResult.valid) {
    return {
      status: 'failed',
      completedGroups: [],
      blockedGroups: [],
      failures: trustResult.errors.map(err => ({
        kind: FailureKinds.TRUST_ROOT_INVALID,
        path: '.',
        message: err,
        recoverable: false
      })),
      newLockVersion: null
    };
  }
  
  // Check for existing plan or generate new one
  let plan = existingPlan;
  if (!plan) {
    plan = generateUpgradePlan(projectPath, bundlePath);
  } else if (!isPlanValid(plan, projectPath, bundlePath)) {
    return {
      status: 'failed',
      completedGroups: [],
      blockedGroups: [],
      failures: [{
        kind: FailureKinds.UNKNOWN,
        path: '.',
        message: 'Plan is stale. Run check or dry-run first.',
        recoverable: true
      }],
      newLockVersion: null
    };
  }
  
  // Check for conflicts
  const conflicts = plan.actions.filter(a => a.type === 'conflict');
  if (conflicts.length > 0) {
    return {
      status: 'blocked',
      completedGroups: [],
      blockedGroups: [],
      failures: conflicts.map(c => ({
        kind: FailureKinds.CONFLICT_USER_MODIFIED,
        path: c.path,
        message: c.reason,
        recoverable: true
      })),
      newLockVersion: null
    };
  }
  
  // Create staging workspace (plan items 13-14)
  const staging = createStagingWorkspace();
  
  try {
    // Get current lock for rollback
    const currentLock = readLock(projectPath);
    const currentVersion = currentLock?.version || 'unknown';
    
    // Collect assets that will be modified for rollback
    const assetsToBackup = plan.actions
      .filter(a => a.type !== 'preserve' && a.type !== 'conflict')
      .map(a => ({ path: a.path }));
    
    // Create rollback package before any changes (plan item 20)
    // Always create rollback package to ensure lock file and any changed assets are backed up
    const rollbackId = createRollbackPackage(projectPath, currentVersion, assetsToBackup);
    console.log(`[${LogLevels.apply}] Created rollback package: ${rollbackId}`);
    
    // Group actions by asset group
    const actionGroups = groupActionsByGroup(plan);
    
    const completedGroups = [];
    const blockedGroups = [];
    const failures = [];
    
    // Process each group
    for (const [group, actions] of actionGroups) {
      const nonPreserveActions = actions.filter(a => a.type !== 'preserve');
      
      if (nonPreserveActions.length === 0) {
        completedGroups.push(group);
        continue;
      }
      
      // Stage changes for this group
      const changes = [];
      for (const action of nonPreserveActions) {
        if (action.type === 'replace' || action.type === 'merge') {
          const bundlePath_full = join(bundlePath, 'template', action.path);
          const templateContent = readFileSync(bundlePath_full, 'utf-8');
          const currentPath = join(projectPath, action.path);
          const currentContent = existsSync(currentPath) ? readFileSync(currentPath, 'utf-8') : '';
          const content = action.mergeStrategy === 'preserve-section'
            ? mergePreservedSection(templateContent, currentContent, action.preserveSection || undefined)
            : action.mergeStrategy === 'ci-jobs'
              ? mergeManagedCIJobs(templateContent, currentContent, action.path)
              : action.mergeStrategy === 'frontmatter-merge'
                ? mergeMarkdownFrontmatter(templateContent, currentContent, action.path)
              : templateContent;
          changes.push({ path: action.path, type: action.type, content });
        } else if (action.type === 'delete') {
          changes.push({ path: action.path, type: action.type });
        }
      }
      
      stageChanges(staging.path, projectPath, changes);
      
      // Apply changes (two-phase: commit then write, plan item 42)
      try {
        applyStagedChanges(staging.path, projectPath, changes);
        completedGroups.push(group);
      } catch (e) {
        failures.push({
          kind: FailureKinds.WRITE_FAILED,
          path: group,
          message: e.message,
          recoverable: true
        });
        blockedGroups.push(group);
      }
    }
    
    // Update lock file (plan item 21: only after success)
    if (failures.length === 0) {
      const manifest = parseManifest(join(bundlePath, 'manifest.json'));
      const lock = createLock(projectPath, manifest);
      writeLock(projectPath, lock);
    }
    
    return {
      status: failures.length === 0 ? 'success' : 'partial',
      completedGroups,
      blockedGroups,
      failures,
      newLockVersion: failures.length === 0 ? plan.toVersion : null
    };
    
  } finally {
    // Cleanup staging
    staging.cleanup();
  }
}

/**
 * Rollback to previous state
 * @param {string} projectPath
 * @param {string} [rollbackId] - Specific rollback package ID (optional, uses latest if not provided)
 * @returns {import('./types.mjs').UpgradeResult}
 */
export function rollback(projectPath, rollbackId = null) {
  console.log(`[${LogLevels.rollback}] Rolling back...`);
  
  // Find rollback package
  const targetId = rollbackId || getLatestRollbackId(projectPath);
  
  if (!targetId) {
    return {
      status: 'failed',
      completedGroups: [],
      blockedGroups: [],
      failures: [{
        kind: FailureKinds.ROLLBACK_UNAVAILABLE,
        path: '.',
        message: 'No rollback package found',
        recoverable: false
      }],
      newLockVersion: null
    };
  }
  
  console.log(`[${LogLevels.rollback}] Using rollback package: ${targetId}`);
  
  try {
    // Restore from rollback package
    const { restored, failed } = restoreFromRollback(projectPath, targetId);
    
    if (failed.length > 0) {
      return {
        status: 'partial',
        completedGroups: [],
        blockedGroups: [],
        failures: failed.map(path => ({
          kind: FailureKinds.WRITE_FAILED,
          path,
          message: 'Failed to restore file from rollback',
          recoverable: true
        })),
        newLockVersion: null
      };
    }
    
    console.log(`[${LogLevels.rollback}] Restored ${restored.length} files`);
    
    return {
      status: 'success',
      completedGroups: [],
      blockedGroups: [],
      failures: [],
      newLockVersion: null
    };
    
  } catch (e) {
    return {
      status: 'failed',
      completedGroups: [],
      blockedGroups: [],
      failures: [{
        kind: FailureKinds.ROLLBACK_UNAVAILABLE,
        path: '.',
        message: e.message,
        recoverable: false
      }],
      newLockVersion: null
    };
  }
}

export default {
  check,
  dryRun,
  adopt,
  apply,
  rollback
};
