/**
 * Upgrade Plan Generator
 *
 * Generates canonical upgrade plan (plan items 8, 32)
 * Plan is invalidated when inputs change.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseManifest, computeDigest, computeDigestString } from './manifest.mjs';
import { readLock } from './lock.mjs';
import { AssetGroups, GroupDependencies } from './types.mjs';
import { computeMarkdownPartDigests, supportsMarkdownFrontmatterMerge } from './frontmatter-files.mjs';

const GROUP_PRIORITY = [
  AssetGroups.CONFIG,
  AssetGroups.SCHEMAS,
  AssetGroups.COMMANDS,
  AssetGroups.SKILLS,
  AssetGroups.CI,
  AssetGroups.HOOKS,
  AssetGroups.DOCS,
  'other'
];

/**
 * Generate upgrade plan
 * @param {string} projectPath - User project path
 * @param {string} bundlePath - Template bundle path
 * @returns {import('./types.mjs').UpgradePlan}
 */
export function generateUpgradePlan(projectPath, bundlePath) {
  const manifest = parseManifest(join(bundlePath, 'manifest.json'));
  const lock = readLock(projectPath);
  
  const actions = [];
  
  if (!lock) {
    // No lock - project not initialized or needs adopt
    actions.push({
      type: 'conflict',
      path: '.',
      reason: 'No lock file found. Run adopt first.',
      assetGroup: AssetGroups.CONFIG
    });
    
    return createPlan(null, manifest.version, actions);
  }
  
  const manifestAssetsByPath = new Map(manifest.managedAssets.map((asset) => [asset.path, asset]));
  const lockedAssetsByPath = new Map(lock.assets.map((asset) => [asset.path, asset]));

  // Check each managed asset
  for (const asset of manifest.managedAssets) {
    const assetPath = join(projectPath, asset.path);
    const lockedAsset = lockedAssetsByPath.get(asset.path);
    const actionBase = {
      path: asset.path,
      assetGroup: inferAssetGroup(asset.path, asset.managedKind),
      mergeStrategy: asset.mergeStrategy,
      preserveSection: asset.preserveSection,
      frontmatterDigest: asset.frontmatterDigest,
      bodyDigest: asset.bodyDigest
    };
    const isMergeAsset = asset.type === 'merge'
      || asset.mergeStrategy === 'preserve-section'
      || asset.mergeStrategy === 'ci-jobs'
      || asset.mergeStrategy === 'frontmatter-merge';

    if (!existsSync(assetPath)) {
      // Asset missing - needs replace
      actions.push({
        ...actionBase,
        type: 'replace',
        reason: 'Asset missing in project'
      });
      continue;
    }

    const currentDigest = computeDigest(assetPath);
    const currentFrontmatter = asset.mergeStrategy === 'frontmatter-merge'
      ? getCurrentMarkdownDigests(assetPath, asset.path)
      : { frontmatterDigest: null, bodyDigest: null };

    if (!lockedAsset) {
      let actionType;
      let actionReason;

      if (isMergeAsset) {
        actionType = 'merge';
        actionReason = 'Managed merge asset needs reconciliation';
      } else if (currentDigest === asset.digest) {
        actionType = 'preserve';
        actionReason = 'Already matches template';
      } else {
        actionType = 'conflict';
        actionReason = 'Asset exists but is not tracked in lock';
      }

      actions.push({
        ...actionBase,
        type: actionType,
        reason: actionReason
      });
      continue;
    }

    if (isMergeAsset) {
      const templateChanged = lockedAsset.templateDigest
        ? asset.digest !== lockedAsset.templateDigest
        : manifest.version !== lock.version;
      const currentChanged = currentDigest !== lockedAsset.digest;
      const legacyManagedMerge = !lockedAsset.templateDigest
        && !currentChanged
        && lockedAsset.status !== 'managed';
      const effectiveStatus = legacyManagedMerge ? 'managed' : lockedAsset.status;

      if (!templateChanged && !currentChanged && effectiveStatus === 'managed') {
        actions.push({
          ...actionBase,
          type: 'preserve',
          reason: 'No changes'
        });
        continue;
      }

      if (asset.mergeStrategy === 'frontmatter-merge') {
        const bodyDrifted = lockedAsset.bodyDigest
          ? currentFrontmatter.bodyDigest !== lockedAsset.bodyDigest
          : currentDigest !== lockedAsset.digest;
        if (effectiveStatus === 'user-modified' || bodyDrifted) {
          actions.push({
            ...actionBase,
            type: 'conflict',
            reason: effectiveStatus === 'user-modified'
              ? 'User modified this asset'
              : 'Local managed body changed'
          });
          continue;
        }
      }

      if (templateChanged || currentChanged || effectiveStatus !== 'managed') {
        actions.push({
          ...actionBase,
          type: 'merge',
          reason: templateChanged
            ? asset.mergeStrategy === 'ci-jobs'
              ? 'Template updated (CI job merge)'
              : asset.mergeStrategy === 'frontmatter-merge'
                ? 'Template updated (frontmatter merge)'
              : 'Template updated (preserve section merge)'
            : asset.mergeStrategy === 'ci-jobs'
              ? 'Local CI file changed'
              : asset.mergeStrategy === 'frontmatter-merge'
                ? 'Local frontmatter changed'
              : 'Local preserved section changed'
        });
      } else {
        actions.push({
          ...actionBase,
          type: 'preserve',
          reason: 'No changes'
        });
      }

      continue;
    }

    if (lockedAsset.status === 'user-modified' || currentDigest !== lockedAsset.digest) {
      // User modified - conflict
      actions.push({
        ...actionBase,
        type: 'conflict',
        reason: lockedAsset.status === 'user-modified'
          ? 'User modified this asset'
          : 'Local drift detected'
      });
    } else if (asset.digest !== lockedAsset.digest) {
      // Template updated
      actions.push({
        ...actionBase,
        type: asset.type === 'merge' ? 'merge' : 'replace',
        reason: asset.type === 'merge' ? 'Template updated (merge strategy)' : 'Template updated'
      });
    } else {
      // Unchanged
      actions.push({
        ...actionBase,
        type: 'preserve',
        reason: 'No changes'
      });
    }
  }

  for (const lockedAsset of lock.assets) {
    if (manifestAssetsByPath.has(lockedAsset.path)) {
      continue;
    }

    const assetPath = join(projectPath, lockedAsset.path);
    if (!existsSync(assetPath)) {
      continue;
    }

    const currentDigest = computeDigest(assetPath);
    const actionBase = {
      path: lockedAsset.path,
      assetGroup: inferAssetGroup(lockedAsset.path, lockedAsset.managedKind),
      mergeStrategy: lockedAsset.mergeStrategy,
      preserveSection: lockedAsset.preserveSection
    };

    if (currentDigest !== lockedAsset.digest || lockedAsset.status === 'user-modified') {
      actions.push({
        ...actionBase,
        type: 'conflict',
        reason: 'Stale managed asset was modified locally'
      });
    } else {
      actions.push({
        ...actionBase,
        type: 'delete',
        reason: 'Stale managed asset removed from template'
      });
    }
  }
  
  return createPlan(lock.version, manifest.version, actions);
}

function getCurrentMarkdownDigests(assetPath, relativePath) {
  const content = readFileSync(assetPath, 'utf-8');
  if (!supportsMarkdownFrontmatterMerge(relativePath, content)) {
    return {
      frontmatterDigest: null,
      bodyDigest: null
    };
  }
  return computeMarkdownPartDigests(content, relativePath);
}

/**
 * Infer asset group from path
 * @param {string} path
 * @returns {string}
 */
function inferAssetGroup(path, managedKind) {
  if (managedKind && AssetGroups[managedKind.toUpperCase()]) {
    return AssetGroups[managedKind.toUpperCase()];
  }
  if (path.startsWith('openspec/config')) return AssetGroups.CONFIG;
  if (path.startsWith('openspec/schemas')) return AssetGroups.SCHEMAS;
  if (path.startsWith('.github/workflows') || path === '.gitlab-ci.yml') return AssetGroups.CI;
  if (path.includes('hooks')) return AssetGroups.HOOKS;
  if (path.includes('/commands/') || path.endsWith('/commands')) return AssetGroups.COMMANDS;
  if (path.includes('/skills/') || path.endsWith('/skills')) return AssetGroups.SKILLS;
  return AssetGroups.DOCS;
}

/**
 * Create plan object with hash
 * @param {string | null} fromVersion
 * @param {string} toVersion
 * @param {Array} actions
 * @returns {import('./types.mjs').UpgradePlan}
 */
function createPlan(fromVersion, toVersion, actions) {
  const plan = {
    fromVersion,
    toVersion,
    actions,
    createdAt: new Date().toISOString()
  };
  
  // Plan hash for invalidation (plan item 32)
  const planHash = computeDigestString(JSON.stringify(plan));
  plan.planHash = planHash;
  
  return plan;
}

/**
 * Check if plan is still valid (plan item 32)
 * @param {import('./types.mjs').UpgradePlan} plan
 * @param {string} projectPath
 * @param {string} bundlePath
 * @returns {boolean}
 */
export function isPlanValid(plan, projectPath, bundlePath) {
  const currentPlan = generateUpgradePlan(projectPath, bundlePath);
  return currentPlan.planHash === plan.planHash;
}

/**
 * Format plan for display (plan item 44: show top 50)
 * @param {import('./types.mjs').UpgradePlan} plan
 * @param {boolean} full - Show all or truncate
 * @returns {string}
 */
export function formatPlan(plan, full = false) {
  const lines = [];
  
  lines.push(`Upgrade Plan: ${plan.fromVersion || 'none'} → ${plan.toVersion}`);
  lines.push(`Generated: ${plan.createdAt}`);
  lines.push('');
  
  const actionTypes = {};
  for (const action of plan.actions) {
    actionTypes[action.type] = (actionTypes[action.type] || 0) + 1;
  }
  
  lines.push('Summary:');
  for (const [type, count] of Object.entries(actionTypes)) {
    lines.push(`  ${type}: ${count}`);
  }

  const detailSummary = summarizePlanDetails(plan.actions);
  if (detailSummary.length > 0) {
    lines.push('');
    lines.push('Managed Merge Details:');
    for (const detail of detailSummary) {
      lines.push(`  - ${detail}`);
    }
  }
  lines.push('');
  
  // Show actions, truncate if not full
  const displayActions = full ? plan.actions : plan.actions.slice(0, 50);
  
  lines.push('Actions:');
  for (const action of displayActions) {
    lines.push(`  [${action.type}] ${action.path}`);
    if (action.reason) {
      lines.push(`    ${action.reason}`);
    }
  }
  
  if (!full && plan.actions.length > 50) {
    lines.push(`\n... and ${plan.actions.length - 50} more (use --full to see all)`);
  }
  
  return lines.join('\n');
}

function summarizePlanDetails(actions) {
  const details = [];
  const counters = {
    agentsPreserve: 0,
    ciJobs: 0,
    frontmatter: 0,
    overrideBlocks: 0,
    delete: 0,
    conflict: 0
  };

  for (const action of actions) {
    if (action.type === 'delete') {
      counters.delete += 1;
      continue;
    }
    if (action.type === 'conflict') {
      counters.conflict += 1;
      continue;
    }
    if (action.mergeStrategy === 'preserve-section') {
      counters.agentsPreserve += 1;
      continue;
    }
    if (action.mergeStrategy === 'ci-jobs') {
      counters.ciJobs += 1;
      continue;
    }
    if (action.mergeStrategy === 'frontmatter-merge') {
      counters.frontmatter += 1;
      counters.overrideBlocks += 1;
    }
  }

  if (counters.agentsPreserve > 0) {
    details.push(`preserve AGENTS repository constraints: ${counters.agentsPreserve}`);
  }
  if (counters.ciJobs > 0) {
    details.push(`merge managed CI jobs while keeping unrelated user jobs: ${counters.ciJobs}`);
  }
  if (counters.frontmatter > 0) {
    details.push(`preserve command/skill frontmatter additions: ${counters.frontmatter}`);
    details.push(`preserve Repository Overrides body blocks: ${counters.overrideBlocks}`);
  }
  if (counters.delete > 0) {
    details.push(`delete stale managed files removed from template: ${counters.delete}`);
  }
  if (counters.conflict > 0) {
    details.push(`ignore or stop on user-owned drift/conflicts until resolved: ${counters.conflict}`);
  }

  return details;
}

/**
 * Group actions by asset group for transaction boundaries
 * @param {import('./types.mjs').UpgradePlan} plan
 * @returns {Map<string, Array>}
 */
export function groupActionsByGroup(plan) {
  const groups = new Map();
  const firstSeen = new Map();
  
  for (const [index, action] of plan.actions.entries()) {
    const group = action.assetGroup || 'other';
    if (!groups.has(group)) {
      groups.set(group, []);
      firstSeen.set(group, index);
    }
    groups.get(group).push(action);
  }

  if (groups.size <= 1) {
    return groups;
  }

  const presentGroups = [...groups.keys()];
  const indegree = new Map(presentGroups.map((group) => [group, 0]));
  const adjacency = new Map(presentGroups.map((group) => [group, []]));

  for (const group of presentGroups) {
    const dependencies = GroupDependencies[group] || [];
    for (const dependency of dependencies) {
      if (!groups.has(dependency)) {
        continue;
      }
      adjacency.get(dependency).push(group);
      indegree.set(group, (indegree.get(group) || 0) + 1);
    }
  }

  const compareGroups = (left, right) => {
    const leftPriority = GROUP_PRIORITY.indexOf(left);
    const rightPriority = GROUP_PRIORITY.indexOf(right);
    const normalizedLeft = leftPriority === -1 ? Number.MAX_SAFE_INTEGER : leftPriority;
    const normalizedRight = rightPriority === -1 ? Number.MAX_SAFE_INTEGER : rightPriority;
    if (normalizedLeft !== normalizedRight) {
      return normalizedLeft - normalizedRight;
    }
    return (firstSeen.get(left) || 0) - (firstSeen.get(right) || 0);
  };

  const queue = presentGroups
    .filter((group) => indegree.get(group) === 0)
    .sort(compareGroups);
  const orderedGroups = [];

  while (queue.length > 0) {
    const group = queue.shift();
    orderedGroups.push(group);

    for (const dependent of adjacency.get(group) || []) {
      const nextDegree = (indegree.get(dependent) || 0) - 1;
      indegree.set(dependent, nextDegree);
      if (nextDegree === 0) {
        queue.push(dependent);
        queue.sort(compareGroups);
      }
    }
  }

  for (const group of presentGroups) {
    if (!orderedGroups.includes(group)) {
      orderedGroups.push(group);
    }
  }

  return new Map(orderedGroups.map((group) => [group, groups.get(group)]));
}

export default {
  generateUpgradePlan,
  isPlanValid,
  formatPlan,
  groupActionsByGroup
};
