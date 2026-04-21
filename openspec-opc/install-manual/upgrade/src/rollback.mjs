/**
 * Rollback Package Manager
 *
 * Manages rollback packages in .openspec-opc/rollback/
 * Each rollback package is a snapshot of managed assets before upgrade.
 */

import {
  existsSync, 
  mkdirSync, 
  writeFileSync, 
  readFileSync,
  rmSync,
  readdirSync,
  statSync,
  copyFileSync
} from 'fs';
import { dirname, join } from 'path';
import { getLockPath, getExistingLockInfo, getLegacyLockPath } from './lock.mjs';

const ROLLBACK_DIR = 'rollback';
const MAX_ROLLBACK_PACKAGES = 5;
/**
 * Get rollback directory path
 * @param {string} projectPath
 * @returns {string}
 */
export function getRollbackDir(projectPath) {
  return join(projectPath, '.openspec-opc', ROLLBACK_DIR);
}

/**
 * Create rollback package before apply
 * @param {string} projectPath
 * @param {string} version - Current version being upgraded from
 * @param {Array<{path: string}>} assets - Assets to backup
 * @returns {string} Rollback package ID
 */
export function createRollbackPackage(projectPath, version, assets) {
  const rollbackDir = getRollbackDir(projectPath);
  
  if (!existsSync(rollbackDir)) {
    mkdirSync(rollbackDir, { recursive: true });
  }
  
  // Generate rollback ID with timestamp and random suffix to prevent collisions
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomSuffix = Math.random().toString(36).slice(2, 6);
  const rollbackId = `${version}-${timestamp}-${randomSuffix}`;
  const packageDir = join(rollbackDir, rollbackId);
  
  mkdirSync(packageDir, { recursive: true });
  
  // Backup each asset
  const backedUp = [];
  const existingLock = getExistingLockInfo(projectPath);
  
  for (const asset of assets) {
    const assetPath = join(projectPath, asset.path);
    const backupPath = join(packageDir, asset.path);

    if (existsSync(assetPath)) {
      try {
        mkdirSync(dirname(backupPath), { recursive: true });
        copyFileSync(assetPath, backupPath);
        backedUp.push({
          path: asset.path,
          existed: true
        });
      } catch (e) {
        console.warn(`Failed to backup ${asset.path}: ${e.message}`);
      }
    } else {
      backedUp.push({
        path: asset.path,
        existed: false
      });
    }
  }

  const lock = {
    path: existingLock?.relativePath || null,
    existed: false
  };

  if (existingLock?.path && existsSync(existingLock.path)) {
    const lockSnapshotPath = join(packageDir, existingLock.relativePath);
    mkdirSync(dirname(lockSnapshotPath), { recursive: true });
    copyFileSync(existingLock.path, lockSnapshotPath);
    lock.existed = true;
  }
  
  // Write rollback manifest
  const manifest = {
    version,
    createdAt: new Date().toISOString(),
    assets: backedUp,
    lock,
    projectPath
  };
  
  writeFileSync(
    join(packageDir, 'rollback-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Cleanup old rollback packages
  cleanupOldRollbackPackages(rollbackDir);
  
  return rollbackId;
}

/**
 * List available rollback packages
 * @param {string} projectPath
 * @returns {Array<{id: string, version: string, createdAt: string, assetCount: number}>}
 */
export function listRollbackPackages(projectPath) {
  const rollbackDir = getRollbackDir(projectPath);
  
  if (!existsSync(rollbackDir)) {
    return [];
  }
  
  const packages = [];
  
  for (const entry of readdirSync(rollbackDir)) {
    const packageDir = join(rollbackDir, entry);
    const manifestPath = join(packageDir, 'rollback-manifest.json');
    
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        packages.push({
          id: entry,
          version: manifest.version,
          createdAt: manifest.createdAt,
          assetCount: manifest.assets?.length || 0
        });
      } catch (e) {
        console.warn(`Failed to read rollback manifest: ${entry}`);
      }
    }
  }
  
  // Sort by creation time (newest first)
  return packages.sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/**
 * Get rollback package by ID
 * @param {string} projectPath
 * @param {string} rollbackId
 * @returns {{manifest: Object, packageDir: string} | null}
 */
export function getRollbackPackage(projectPath, rollbackId) {
  const rollbackDir = getRollbackDir(projectPath);
  const packageDir = join(rollbackDir, rollbackId);
  const manifestPath = join(packageDir, 'rollback-manifest.json');
  
  if (!existsSync(manifestPath)) {
    return null;
  }
  
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    return { manifest, packageDir };
  } catch (e) {
    console.warn(`Failed to read rollback package: ${rollbackId}`);
    return null;
  }
}

/**
 * Restore from rollback package
 * @param {string} projectPath
 * @param {string} rollbackId
 * @returns {{restored: string[], failed: string[]}}
 */
export function restoreFromRollback(projectPath, rollbackId) {
  const pkg = getRollbackPackage(projectPath, rollbackId);
  
  if (!pkg) {
    throw new Error(`Rollback package not found: ${rollbackId}`);
  }
  
  const { manifest, packageDir } = pkg;
  const restored = [];
  const failed = [];

  const assetEntries = Array.isArray(manifest.assets)
    ? manifest.assets.map((asset) =>
        typeof asset === 'string' ? { path: asset, existed: true } : asset
      )
    : [];

  for (const asset of assetEntries) {
    const backupPath = join(packageDir, asset.path);
    const targetPath = join(projectPath, asset.path);

    try {
      if (asset.existed === false) {
        rmSync(targetPath, { recursive: true, force: true });
        restored.push(asset.path);
        continue;
      }

      if (!existsSync(backupPath)) {
        failed.push(asset.path);
        continue;
      }

      mkdirSync(dirname(targetPath), { recursive: true });
      copyFileSync(backupPath, targetPath);
      restored.push(asset.path);
    } catch (e) {
      console.warn(`Failed to restore ${asset.path}: ${e.message}`);
      failed.push(asset.path);
    }
  }

  const lockInfo = manifest.lock || null;
  if (lockInfo) {
    const canonicalLockPath = getLockPath(projectPath);
    const legacyLockPath = getLegacyLockPath(projectPath);
    const targetLockPath = join(projectPath, lockInfo.path || '');
    const backupLockPath = lockInfo.path ? join(packageDir, lockInfo.path) : null;

    try {
      if (lockInfo.existed) {
        if (!backupLockPath || !existsSync(backupLockPath)) {
          failed.push(lockInfo.path || canonicalLockPath);
        } else {
          mkdirSync(dirname(targetLockPath), { recursive: true });
          copyFileSync(backupLockPath, targetLockPath);
          if (targetLockPath !== canonicalLockPath) {
            rmSync(canonicalLockPath, { force: true });
          }
          if (targetLockPath !== legacyLockPath) {
            rmSync(legacyLockPath, { force: true });
          }
          restored.push(lockInfo.path || canonicalLockPath);
        }
      } else {
        rmSync(canonicalLockPath, { force: true });
        rmSync(legacyLockPath, { force: true });
        restored.push(lockInfo.path || canonicalLockPath);
      }
    } catch (e) {
      console.warn(`Failed to restore lock file: ${e.message}`);
      failed.push(lockInfo.path || canonicalLockPath);
    }
  }
  
  return { restored, failed };
}

/**
 * Delete rollback package
 * @param {string} projectPath
 * @param {string} rollbackId
 */
export function deleteRollbackPackage(projectPath, rollbackId) {
  const rollbackDir = getRollbackDir(projectPath);
  const packageDir = join(rollbackDir, rollbackId);
  
  if (existsSync(packageDir)) {
    rmSync(packageDir, { recursive: true, force: true });
  }
}

/**
 * Cleanup old rollback packages (keep only MAX_ROLLBACK_PACKAGES)
 * @param {string} rollbackDir
 */
function cleanupOldRollbackPackages(rollbackDir) {
  if (!existsSync(rollbackDir)) {
    return;
  }
  
  const packages = [];
  
  for (const entry of readdirSync(rollbackDir)) {
    const packageDir = join(rollbackDir, entry);
    const stat = statSync(packageDir);
    
    if (stat.isDirectory()) {
      packages.push({
        id: entry,
        mtime: stat.mtime
      });
    }
  }
  
  // Sort by modification time (oldest first)
  packages.sort((a, b) => a.mtime - b.mtime);
  
  // Remove oldest packages if over limit
  while (packages.length > MAX_ROLLBACK_PACKAGES) {
    const oldest = packages.shift();
    const packageDir = join(rollbackDir, oldest.id);
    
    try {
      rmSync(packageDir, { recursive: true, force: true });
      console.log(`Cleaned up old rollback package: ${oldest.id}`);
    } catch (e) {
      console.warn(`Failed to cleanup rollback package: ${oldest.id}`);
    }
  }
}

/**
 * Get latest rollback package ID
 * @param {string} projectPath
 * @returns {string | null}
 */
export function getLatestRollbackId(projectPath) {
  const packages = listRollbackPackages(projectPath);
  return packages.length > 0 ? packages[0].id : null;
}

export default {
  createRollbackPackage,
  listRollbackPackages,
  getRollbackPackage,
  restoreFromRollback,
  deleteRollbackPackage,
  getLatestRollbackId,
  getRollbackDir
};
