/**
 * Lock File Manager
 *
 * Manages the template lock file and keeps legacy lock paths readable.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { computeDigest } from './manifest.mjs';
import { AssetGroups } from './types.mjs';
import { computeMarkdownPartDigests, supportsMarkdownFrontmatterMerge } from './frontmatter-files.mjs';

const CANONICAL_LOCK_PATH = '.openspec-opc/.openspec-opc-template-lock.json';
const OLD_CANONICAL_LOCK_PATH = 'openspec/.openspec-opc-template-lock.json';
const LEGACY_LOCK_PATH = '.openspec-opc/template-lock.json';

function inferManagedKind(path) {
  if (path === 'AGENTS.md' || path.endsWith('/AGENTS.md')) return AssetGroups.DOCS;
  if (path.startsWith('openspec/config')) return AssetGroups.CONFIG;
  if (path.startsWith('openspec/schemas')) return AssetGroups.SCHEMAS;
  if (path.includes('/commands/') || path.endsWith('/commands')) return AssetGroups.COMMANDS;
  if (path.includes('/skills/') || path.endsWith('/skills')) return AssetGroups.SKILLS;
  if (path.startsWith('.github/workflows') || path === '.gitlab-ci.yml') return AssetGroups.CI;
  if (path.includes('hooks')) return AssetGroups.HOOKS;
  return AssetGroups.DOCS;
}

function normalizeAsset(asset) {
  return {
    path: asset.path,
    digest: asset.digest,
    status: asset.status || 'managed',
    type: asset.type || 'file',
    managedKind: asset.managedKind || inferManagedKind(asset.path),
    mergeStrategy: asset.mergeStrategy || null,
    preserveSection: asset.preserveSection || null,
    templateDigest: asset.templateDigest || null,
    frontmatterDigest: asset.frontmatterDigest || null,
    bodyDigest: asset.bodyDigest || null
  };
}

function deriveManagedCommands(assets) {
  return assets
    .filter((asset) => asset.managedKind === AssetGroups.COMMANDS)
    .map((asset) => ({
      id: asset.path.split('/').pop().replace(/\.md$/, ''),
      path: asset.path,
      digest: asset.digest
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function deriveManagedSkills(assets) {
  const skills = new Map();
  for (const asset of assets.filter((entry) => entry.managedKind === AssetGroups.SKILLS)) {
    const parts = asset.path.split('/');
    const skillIndex = parts.findIndex((part) => part === 'skills');
    if (skillIndex === -1 || skillIndex + 1 >= parts.length) {
      continue;
    }

    const skillId = parts[skillIndex + 1];
    if (!skills.has(skillId)) {
      skills.set(skillId, {
        id: skillId,
        path: parts.slice(0, skillIndex + 2).join('/'),
        digest: asset.path.endsWith('/SKILL.md') ? asset.digest : null
      });
      continue;
    }

    if (asset.path.endsWith('/SKILL.md')) {
      skills.get(skillId).digest = asset.digest;
    }
  }

  return [...skills.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeLock(lock, lockPath, legacy = false) {
  const assets = Array.isArray(lock.assets) ? lock.assets.map(normalizeAsset) : [];
  return {
    ...lock,
    version: lock.version,
    sourceVersion: lock.sourceVersion || `openspec-opc@${lock.version}`,
    handler: lock.handler,
    lockFormatVersion: lock.lockFormatVersion || '2',
    managedFiles: Array.isArray(lock.managedFiles) && lock.managedFiles.length > 0
      ? lock.managedFiles
      : assets.map((asset) => ({
          path: asset.path,
          digest: asset.digest,
          type: asset.type,
          managedKind: asset.managedKind,
          mergeStrategy: asset.mergeStrategy,
          preserveSection: asset.preserveSection,
          templateDigest: asset.templateDigest,
          frontmatterDigest: asset.frontmatterDigest,
          bodyDigest: asset.bodyDigest
        })),
    managedCIJobs: Array.isArray(lock.managedCIJobs) ? lock.managedCIJobs : [],
    managedCommands: Array.isArray(lock.managedCommands) && lock.managedCommands.length > 0
      ? lock.managedCommands
      : deriveManagedCommands(assets),
    managedSkills: Array.isArray(lock.managedSkills) && lock.managedSkills.length > 0
      ? lock.managedSkills
      : deriveManagedSkills(assets),
    assets,
    lockPath,
    legacy
  };
}

/**
 * Get canonical lock file path
 * @param {string} projectPath
 * @returns {string}
 */
export function getLockPath(projectPath) {
  return join(projectPath, CANONICAL_LOCK_PATH);
}

/**
 * Get legacy lock file path
 * @param {string} projectPath
 * @returns {string}
 */
export function getLegacyLockPath(projectPath) {
  return join(projectPath, LEGACY_LOCK_PATH);
}

export function getOldCanonicalLockPath(projectPath) {
  return join(projectPath, OLD_CANONICAL_LOCK_PATH);
}

export function getExistingLockInfo(projectPath) {
  const canonicalPath = getLockPath(projectPath);
  if (existsSync(canonicalPath)) {
    return {
      path: canonicalPath,
      relativePath: CANONICAL_LOCK_PATH,
      legacy: false
    };
  }

  const oldCanonicalPath = getOldCanonicalLockPath(projectPath);
  if (existsSync(oldCanonicalPath)) {
    return {
      path: oldCanonicalPath,
      relativePath: OLD_CANONICAL_LOCK_PATH,
      legacy: true
    };
  }

  const legacyPath = getLegacyLockPath(projectPath);
  if (existsSync(legacyPath)) {
    return {
      path: legacyPath,
      relativePath: LEGACY_LOCK_PATH,
      legacy: true
    };
  }

  return null;
}

/**
 * Read lock file (plan item 24: treat as untrusted input)
 * @param {string} projectPath
 * @returns {import('./types.mjs').TemplateLock | null}
 */
export function readLock(projectPath) {
  const existingLock = getExistingLockInfo(projectPath);

  if (!existingLock) {
    return null;
  }
  
  try {
    const content = readFileSync(existingLock.path, 'utf-8');
    const lock = JSON.parse(content);
    
    // Basic validation (don't trust content)
    if (!lock.version || !lock.handler || !Array.isArray(lock.assets)) {
      console.warn('Lock file appears corrupted, treating as missing');
      return null;
    }
    
    return normalizeLock(lock, existingLock.relativePath, existingLock.legacy);
  } catch (e) {
    console.warn(`Failed to read lock file: ${e.message}`);
    return null;
  }
}

/**
 * Write lock file (plan item 21: only after successful apply)
 * @param {string} projectPath
 * @param {import('./types.mjs').TemplateLock} lock
 */
export function writeLock(projectPath, lock) {
  const lockPath = getLockPath(projectPath);
  const stateDir = dirname(lockPath);
  
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  
  const nextLock = normalizeLock({
    ...lock,
    updatedAt: new Date().toISOString()
  }, CANONICAL_LOCK_PATH, false);

  writeFileSync(lockPath, JSON.stringify(nextLock, null, 2));

  const oldCanonicalPath = getOldCanonicalLockPath(projectPath);
  if (oldCanonicalPath !== lockPath && existsSync(oldCanonicalPath)) {
    rmSync(oldCanonicalPath, { force: true });
  }

  const legacyPath = getLegacyLockPath(projectPath);
  if (legacyPath !== lockPath && existsSync(legacyPath)) {
    rmSync(legacyPath, { force: true });
  }
}

/**
 * Create lock from manifest and project state
 * @param {string} projectPath
 * @param {import('./types.mjs').TemplateManifest} manifest
 * @returns {import('./types.mjs').TemplateLock}
 */
export function createLock(projectPath, manifest) {
  const assets = manifest.managedAssets.map(asset => {
    const assetPath = join(projectPath, asset.path);
    let status = 'managed';
    let digest = asset.digest;
    let partDigests = {
      frontmatterDigest: asset.frontmatterDigest || null,
      bodyDigest: asset.bodyDigest || null
    };
    const isMergeAsset = asset.type === 'merge'
      || asset.mergeStrategy === 'preserve-section'
      || asset.mergeStrategy === 'ci-jobs'
      || asset.mergeStrategy === 'frontmatter-merge';
    
    try {
      const currentContent = asset.mergeStrategy === 'frontmatter-merge'
        ? readFileSync(assetPath, 'utf-8')
        : null;
      const currentDigest = computeDigest(assetPath);
      if (currentContent !== null && supportsMarkdownFrontmatterMerge(asset.path, currentContent)) {
        partDigests = computeMarkdownPartDigests(currentContent, asset.path);
      }
      if (isMergeAsset) {
        digest = currentDigest;
      } else if (currentDigest !== asset.digest) {
        status = 'user-modified';
        digest = currentDigest;
      }
    } catch (e) {
      // File doesn't exist, keep as managed (will be created)
    }
    
    return {
      path: asset.path,
      digest,
      status,
      type: asset.type || 'file',
      managedKind: asset.managedKind || inferManagedKind(asset.path),
      mergeStrategy: asset.mergeStrategy || null,
      preserveSection: asset.preserveSection || null,
      templateDigest: asset.digest,
      frontmatterDigest: partDigests.frontmatterDigest,
      bodyDigest: partDigests.bodyDigest
    };
  });
  
  return normalizeLock({
    version: manifest.version,
    sourceVersion: `openspec-opc@${manifest.version}`,
    handler: manifest.handler,
    lockFormatVersion: '2',
    installedAt: new Date().toISOString(),
    managedFiles: manifest.managedAssets,
    managedCIJobs: manifest.managedCIJobs || [],
    managedCommands: manifest.managedCommands || deriveManagedCommands(assets),
    managedSkills: manifest.managedSkills || deriveManagedSkills(assets),
    assets
  }, CANONICAL_LOCK_PATH, false);
}

/**
 * Check if project has a lock file
 * @param {string} projectPath
 * @returns {boolean}
 */
export function hasLock(projectPath) {
  return Boolean(getExistingLockInfo(projectPath));
}

/**
 * Calculate drift between lock and current state
 * @param {string} projectPath
 * @param {import('./types.mjs').TemplateLock} lock
 * @returns {{drifted: boolean, changes: Array<{path: string, expected: string, actual: string}>}}
 */
export function calculateDrift(projectPath, lock) {
  const changes = [];
  
  for (const asset of lock.assets) {
    const assetPath = join(projectPath, asset.path);
    
    try {
      const currentDigest = computeDigest(assetPath);
      if (currentDigest !== asset.digest) {
        changes.push({
          path: asset.path,
          expected: asset.digest,
          actual: currentDigest
        });
      }
    } catch (e) {
      // File missing
      changes.push({
        path: asset.path,
        expected: asset.digest,
        actual: null
      });
    }
  }
  
  return {
    drifted: changes.length > 0,
    changes
  };
}

export default {
  getLockPath,
  getLegacyLockPath,
  getOldCanonicalLockPath,
  getExistingLockInfo,
  readLock,
  writeLock,
  createLock,
  hasLock,
  calculateDrift
};
