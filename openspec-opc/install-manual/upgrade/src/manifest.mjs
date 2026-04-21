/**
 * Manifest Parser
 * 
 * Parses template manifest and validates structure.
 * Trust root is the manifest bundled with the current version.
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Parse manifest from bundle path
 * @param {string} manifestPath - Path to manifest.json
 * @returns {import('./types.mjs').TemplateManifest}
 */
export function parseManifest(manifestPath) {
  const content = readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(content);
  
  validateManifest(manifest);
  
  return manifest;
}

/**
 * Validate manifest structure
 * @param {any} manifest
 * @throws {Error} If invalid
 */
function validateManifest(manifest) {
  if (!manifest.version) {
    throw new Error('Manifest missing required field: version');
  }
  
  if (!manifest.handler) {
    throw new Error('Manifest missing required field: handler');
  }
  
  if (!Array.isArray(manifest.managedAssets)) {
    throw new Error('Manifest missing or invalid: managedAssets');
  }
  
  for (const asset of manifest.managedAssets) {
    if (!asset.path || !asset.digest) {
      throw new Error(`Invalid managed asset: ${JSON.stringify(asset)}`);
    }
  }
  
  // Commands and skills are optional but must be arrays if present
  if (manifest.managedCIJobs && !Array.isArray(manifest.managedCIJobs)) {
    throw new Error('Invalid: managedCIJobs must be an array');
  }

  if (manifest.managedCommands && !Array.isArray(manifest.managedCommands)) {
    throw new Error('Invalid: managedCommands must be an array');
  }
  
  if (manifest.managedSkills && !Array.isArray(manifest.managedSkills)) {
    throw new Error('Invalid: managedSkills must be an array');
  }
}

/**
 * Compute SHA-256 digest of file content
 * @param {string} filePath
 * @returns {string | null} Hex digest, or null if file cannot be read
 */
export function computeDigest(filePath) {
  try {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  } catch (e) {
    if (e.code === 'ENOENT') {
      return null;
    }
    throw e;
  }
}

/**
 * Compute digest of string content
 * @param {string} content
 * @returns {string} Hex digest
 */
export function computeDigestString(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Compare digests (byte-level comparison per plan item 28)
 * @param {string} digest1
 * @param {string} digest2
 * @returns {boolean}
 */
export function digestsEqual(digest1, digest2) {
  return digest1 === digest2;
}

/**
 * Verify trust root integrity (plan item 29)
 * @param {string} bundlePath - Path to bundle directory
 * @returns {{valid: boolean, errors: string[]}}
 */
export function verifyTrustRoot(bundlePath) {
  const errors = [];
  
  try {
    const manifest = parseManifest(join(bundlePath, 'manifest.json'));
    
    // Verify each managed asset exists in bundle
    for (const asset of manifest.managedAssets) {
      const assetPath = join(bundlePath, 'template', asset.path);
      try {
        const actualDigest = computeDigest(assetPath);
        if (!digestsEqual(actualDigest, asset.digest)) {
          errors.push(`Trust root corrupted: ${asset.path} digest mismatch`);
        }
      } catch (e) {
        errors.push(`Trust root corrupted: ${asset.path} missing from bundle`);
      }
    }
    
    // Verify commands manifest
    if (manifest.managedCIJobs) {
      for (const job of manifest.managedCIJobs) {
        const asset = manifest.managedAssets.find((entry) => entry.path === job.path);
        if (!asset) {
          errors.push(`Trust root corrupted: CI job ${job.name} missing managed asset`);
        }
      }
    }

    // Verify commands manifest
    if (manifest.managedCommands) {
      for (const cmd of manifest.managedCommands) {
        const asset = manifest.managedAssets.find((entry) => entry.path === cmd.path);
        if (!asset) {
          errors.push(`Trust root corrupted: command ${cmd.id} missing managed asset`);
          continue;
        }
        if (!digestsEqual(asset.digest, cmd.digest)) {
          errors.push(`Trust root corrupted: command ${cmd.id} digest mismatch`);
        }
      }
    }
    
    // Verify skills manifest
    if (manifest.managedSkills) {
      for (const skill of manifest.managedSkills) {
        const skillAsset = manifest.managedAssets.find((entry) => entry.path === `${skill.path}/SKILL.md`);
        if (!skillAsset) {
          errors.push(`Trust root corrupted: skill ${skill.id} missing managed asset`);
          continue;
        }
        if (!digestsEqual(skillAsset.digest, skill.digest)) {
          errors.push(`Trust root corrupted: skill ${skill.id} digest mismatch`);
        }
      }
    }
    
  } catch (e) {
    errors.push(`Trust root invalid: ${e.message}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  parseManifest,
  computeDigest,
  computeDigestString,
  digestsEqual,
  verifyTrustRoot
};
