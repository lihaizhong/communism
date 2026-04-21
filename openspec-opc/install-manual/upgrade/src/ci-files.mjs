/**
 * Managed CI file helpers.
 *
 * The runtime only supports the CI assets currently shipped by the template:
 * - `.github/workflows/openspec-archive.yml`
 * - `.gitlab-ci.yml`
 */

import YAML from 'yaml';
import { computeDigestString } from './manifest.mjs';

const GITLAB_RESERVED_KEYS = new Set([
  'stages',
  'variables',
  'include',
  'workflow',
  'default',
  'image',
  'services',
  'before_script',
  'after_script',
  'cache',
  'pages',
  'interruptible'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseYaml(content, relativePath) {
  try {
    return YAML.parse(content) || {};
  } catch (error) {
    throw new Error(`Failed to parse managed CI file ${relativePath}: ${error.message}`);
  }
}

function stringifyYaml(value) {
  return YAML.stringify(value).replace(/\n?$/, '\n');
}

function getGitHubJobs(config) {
  return isPlainObject(config.jobs) ? config.jobs : {};
}

function getGitLabJobs(config) {
  return Object.fromEntries(
    Object.entries(isPlainObject(config) ? config : {}).filter(([key, value]) => {
      return !GITLAB_RESERVED_KEYS.has(key) && isPlainObject(value);
    })
  );
}

function extractGitHubJobs(relativePath, content) {
  const config = parseYaml(content, relativePath);
  return Object.entries(getGitHubJobs(config))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, job]) => ({
      path: relativePath,
      name,
      digest: computeDigestString(stringifyYaml(job)),
      mergeStrategy: 'replace'
    }));
}

function extractGitLabJobs(relativePath, content) {
  const config = parseYaml(content, relativePath);
  return Object.entries(getGitLabJobs(config))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, job]) => ({
      path: relativePath,
      name,
      digest: computeDigestString(stringifyYaml(job)),
      mergeStrategy: 'replace'
    }));
}

function mergeGitHubWorkflow(templateContent, currentContent, relativePath) {
  const templateConfig = parseYaml(templateContent, relativePath);
  const currentConfig = currentContent.trim() === '' ? {} : parseYaml(currentContent, relativePath);

  if (currentContent.trim() === '') {
    return stringifyYaml(templateConfig);
  }

  const merged = {
    ...currentConfig,
    jobs: {
      ...getGitHubJobs(currentConfig),
      ...getGitHubJobs(templateConfig)
    }
  };

  return stringifyYaml(merged);
}

function mergeGitLabPipeline(templateContent, currentContent, relativePath) {
  const templateConfig = parseYaml(templateContent, relativePath);
  const currentConfig = currentContent.trim() === '' ? {} : parseYaml(currentContent, relativePath);
  const merged = {
    ...currentConfig,
    ...Object.fromEntries(
      Object.entries(templateConfig).filter(([key]) => !GITLAB_RESERVED_KEYS.has(key) && !getGitLabJobs(templateConfig)[key])
    )
  };

  const currentStages = Array.isArray(currentConfig.stages) ? currentConfig.stages : [];
  const templateStages = Array.isArray(templateConfig.stages) ? templateConfig.stages : [];
  if (currentStages.length > 0 || templateStages.length > 0) {
    merged.stages = [...currentStages];
    for (const stageName of templateStages) {
      if (!merged.stages.includes(stageName)) {
        merged.stages.push(stageName);
      }
    }
  }

  if (isPlainObject(currentConfig.variables) || isPlainObject(templateConfig.variables)) {
    merged.variables = {
      ...(isPlainObject(templateConfig.variables) ? templateConfig.variables : {}),
      ...(isPlainObject(currentConfig.variables) ? currentConfig.variables : {})
    };
  }

  for (const [jobName, jobConfig] of Object.entries(getGitLabJobs(currentConfig))) {
    merged[jobName] = jobConfig;
  }
  for (const [jobName, jobConfig] of Object.entries(getGitLabJobs(templateConfig))) {
    merged[jobName] = jobConfig;
  }

  return stringifyYaml(merged);
}

/**
 * Extract managed CI jobs from a template CI file.
 * @param {string} relativePath
 * @param {string} content
 * @returns {Array<{path: string, name: string, digest: string, mergeStrategy: string}>}
 */
export function extractManagedCIJobs(relativePath, content) {
  if (relativePath === '.github/workflows/openspec-archive.yml') {
    return extractGitHubJobs(relativePath, content);
  }
  if (relativePath === '.gitlab-ci.yml') {
    return extractGitLabJobs(relativePath, content);
  }
  return [];
}

/**
 * Merge managed CI jobs into the current CI file while preserving unrelated jobs.
 * @param {string} templateContent
 * @param {string} currentContent
 * @param {string} relativePath
 * @returns {string}
 */
export function mergeManagedCIJobs(templateContent, currentContent, relativePath) {
  if (relativePath === '.github/workflows/openspec-archive.yml') {
    return mergeGitHubWorkflow(templateContent, currentContent, relativePath);
  }
  if (relativePath === '.gitlab-ci.yml') {
    return mergeGitLabPipeline(templateContent, currentContent, relativePath);
  }
  return templateContent.replace(/\n?$/, '\n');
}

export default {
  extractManagedCIJobs,
  mergeManagedCIJobs
};
