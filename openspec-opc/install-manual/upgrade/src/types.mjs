/**
 * Upgrade Runtime - Core Types and Manifest Schema
 * 
 * Defines the canonical structures for:
 * - Template manifest (source of truth for managed assets)
 * - Template lock file (records what's installed)
 * - Upgrade plan (canonical result contract)
 */

/**
 * @typedef {Object} TemplateManifest
 * @property {string} version - Template version
 * @property {string} handler - Handler type (node-ts, etc.)
 * @property {ManagedAsset[]} managedAssets - List of managed assets
 * @property {ManagedCIJob[]} managedCIJobs - List of managed CI jobs
 * @property {ManagedCommand[]} managedCommands - List of managed commands
 * @property {ManagedSkill[]} managedSkills - List of managed skills
 */

/**
 * @typedef {Object} ManagedAsset
 * @property {string} path - Relative path in project
 * @property {string} digest - SHA-256 digest of content
 * @property {string} type - 'file' | 'directory' | 'merge' | 'preserve'
 * @property {string} [managedKind] - 'config' | 'schemas' | 'commands' | 'skills' | 'ci' | 'hooks' | 'docs'
 * @property {string} [mergeStrategy] - merge handler identifier
 * @property {{startHeading: string, endHeading: string}} [preserveSection] - preserved section bounds
 * @property {string} [templateDigest] - Template digest used for the last apply/adopt
 * @property {string} [frontmatterDigest] - Frontmatter digest for markdown merge assets
 * @property {string} [bodyDigest] - Body digest for markdown merge assets
 */

/**
 * @typedef {Object} ManagedCIJob
 * @property {string} path - CI config path
 * @property {string} name - Job name (with reserved prefix)
 * @property {string} digest - Content digest
 * @property {string} mergeStrategy - 'replace' | 'merge'
 */

/**
 * @typedef {Object} ManagedCommand
 * @property {string} id - Command identifier
 * @property {string} path - Managed command path
 * @property {string} digest - Content digest
 */

/**
 * @typedef {Object} ManagedSkill
 * @property {string} id - Skill identifier
 * @property {string} path - Managed skill root path
 * @property {string} digest - Content digest
 */

/**
 * @typedef {Object} TemplateLock
 * @property {string} version - Installed template version
 * @property {string} [sourceVersion] - Installed template source version
 * @property {string} handler - Handler type
 * @property {string} [lockFormatVersion] - Lock schema version
  * @property {string} installedAt - ISO timestamp
 * @property {ManagedAsset[]} [managedFiles] - Managed file descriptors
 * @property {ManagedCIJob[]} [managedCIJobs] - Managed CI job descriptors
 * @property {ManagedCommand[]} [managedCommands] - Managed command descriptors
 * @property {ManagedSkill[]} [managedSkills] - Managed skill descriptors
  * @property {LockedAsset[]} assets - Locked assets
 */

/**
 * @typedef {Object} LockedAsset
 * @property {string} path - Asset path
 * @property {string} digest - Digest at install time
 * @property {string} status - 'managed' | 'suspected-managed' | 'user-modified'
 * @property {string} [type] - Managed asset type
 * @property {string} [managedKind] - Managed asset group
 * @property {string} [mergeStrategy] - Merge handler identifier
 * @property {{startHeading: string, endHeading: string}} [preserveSection] - preserved section bounds
 * @property {string} [templateDigest] - Template digest used for the last apply/adopt
 * @property {string} [frontmatterDigest] - Frontmatter digest for markdown merge assets
 * @property {string} [bodyDigest] - Body digest for markdown merge assets
 */

/**
 * @typedef {Object} UpgradePlan
 * @property {string} fromVersion - Current version
 * @property {string} toVersion - Target version
 * @property {PlanAction[]} actions - Ordered actions
 * @property {string} planHash - Hash of plan for invalidation
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} PlanAction
 * @property {string} type - 'replace' | 'merge' | 'delete' | 'preserve' | 'conflict'
 * @property {string} path - Target path
 * @property {string} [reason] - Why this action
 * @property {string} [assetGroup] - Group for transaction boundary
 * @property {string} [mergeStrategy] - Merge handler identifier
 * @property {{startHeading: string, endHeading: string}} [preserveSection] - preserved section bounds
 * @property {string} [frontmatterDigest] - Frontmatter digest for markdown merge assets
 * @property {string} [bodyDigest] - Body digest for markdown merge assets
 */

/**
 * @typedef {Object} UpgradeResult
 * @property {string} status - 'success' | 'partial' | 'failed' | 'blocked'
 * @property {string[]} completedGroups - Successfully applied groups
 * @property {string[]} blockedGroups - Groups blocked by dependency failure
 * @property {FailureRecord[]} failures - Failure details
 * @property {string} [newLockVersion] - Updated lock version if successful
 */

/**
 * @typedef {Object} FailureRecord
 * @property {string} kind - Failure kind
 * @property {string} path - Affected path
 * @property {string} message - Human-readable message
 * @property {boolean} recoverable - Can user fix and retry?
 */

/**
 * Failure kinds for explicit classification
 */
export const FailureKinds = {
  CONFLICT_USER_MODIFIED: 'conflict-user-modified',
  CONFLICT_UNCOMMITTED: 'conflict-uncommitted',
  TRUST_ROOT_INVALID: 'trust-root-invalid',
  STAGING_FAILED: 'staging-failed',
  WRITE_FAILED: 'write-failed',
  DAG_DEPENDENCY_FAILED: 'dag-dependency-failed',
  ROLLBACK_UNAVAILABLE: 'rollback-unavailable',
  UNKNOWN: 'unknown'
};

/**
 * Log levels per command (from plan item 43)
 */
export const LogLevels = {
  check: 'INFO',
  'dry-run': 'INFO',
  adopt: 'WARN',
  apply: 'DEBUG',
  rollback: 'WARN'
};

/**
 * Asset groups for transaction boundaries (from plan items 33-35)
 */
export const AssetGroups = {
  CONFIG: 'config',
  SCHEMAS: 'schemas',
  COMMANDS: 'commands',
  SKILLS: 'skills',
  CI: 'ci',
  HOOKS: 'hooks',
  DOCS: 'docs'
};

/**
 * Dependency DAG between asset groups
 */
export const GroupDependencies = {
  [AssetGroups.CONFIG]: [],
  [AssetGroups.SCHEMAS]: [AssetGroups.CONFIG],
  [AssetGroups.COMMANDS]: [AssetGroups.CONFIG, AssetGroups.SCHEMAS],
  [AssetGroups.SKILLS]: [AssetGroups.COMMANDS],
  [AssetGroups.CI]: [AssetGroups.CONFIG],
  [AssetGroups.HOOKS]: [AssetGroups.CONFIG],
  [AssetGroups.DOCS]: []
};

export default {
  FailureKinds,
  LogLevels,
  AssetGroups,
  GroupDependencies
};
