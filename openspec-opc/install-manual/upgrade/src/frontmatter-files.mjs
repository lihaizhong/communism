/**
 * Managed markdown frontmatter helpers.
 *
 * Supported contract:
 * - Preserve user-added frontmatter keys that do not exist in the template
 * - Preserve user-added nested metadata keys under existing template objects
 * - Preserve user-edited body sections wrapped in explicit OpenSpec preserve markers
 * - Always replace the markdown body with the template body
 */

import YAML from 'yaml';
import { computeDigestString } from './manifest.mjs';

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const PRESERVE_BLOCK_PATTERN = /<!--\s*OPENSPEC-PRESERVE:BEGIN\s+([a-z0-9-]+)\s*-->\n?([\s\S]*?)\n?<!--\s*OPENSPEC-PRESERVE:END\s+\1\s*-->/g;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stableYaml(value) {
  return YAML.stringify(value).replace(/\n?$/, '\n');
}

function mergeUnknownKeys(templateValue, currentValue) {
  if (!isPlainObject(templateValue) || !isPlainObject(currentValue)) {
    return templateValue;
  }

  const merged = { ...templateValue };
  for (const [key, value] of Object.entries(currentValue)) {
    if (!(key in templateValue)) {
      merged[key] = value;
      continue;
    }

    if (isPlainObject(templateValue[key]) && isPlainObject(value)) {
      merged[key] = mergeUnknownKeys(templateValue[key], value);
    }
  }

  return merged;
}

function extractPreserveBlocks(body) {
  const blocks = new Map();
  for (const match of body.matchAll(PRESERVE_BLOCK_PATTERN)) {
    blocks.set(match[1], match[2]);
  }
  return blocks;
}

function normalizeMarkdownBody(body) {
  return body.replace(
    PRESERVE_BLOCK_PATTERN,
    (_match, blockId) => `<!-- OPENSPEC-PRESERVE:BEGIN ${blockId} -->\n<!-- OPENSPEC-PRESERVE:END ${blockId} -->`
  );
}

function mergePreserveBlocks(templateBody, currentBody) {
  const currentBlocks = extractPreserveBlocks(currentBody);
  return templateBody.replace(
    PRESERVE_BLOCK_PATTERN,
    (match, blockId, templateContent) => {
      if (!currentBlocks.has(blockId)) {
        return match;
      }
      return `<!-- OPENSPEC-PRESERVE:BEGIN ${blockId} -->\n${currentBlocks.get(blockId)}\n<!-- OPENSPEC-PRESERVE:END ${blockId} -->`;
    }
  );
}

function parseFrontmatterYaml(frontmatter, relativePath) {
  try {
    return YAML.parse(frontmatter) || {};
  } catch (error) {
    throw new Error(`Failed to parse markdown frontmatter for ${relativePath}: ${error.message}`);
  }
}

/**
 * Parse markdown frontmatter and body.
 * @param {string} content
 * @param {string} relativePath
 * @returns {{hasFrontmatter: boolean, frontmatterRaw: string | null, frontmatter: Record<string, any> | null, body: string}}
 */
export function parseMarkdownFrontmatter(content, relativePath = 'markdown file') {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    return {
      hasFrontmatter: false,
      frontmatterRaw: null,
      frontmatter: null,
      body: content
    };
  }

  return {
    hasFrontmatter: true,
    frontmatterRaw: match[1],
    frontmatter: parseFrontmatterYaml(match[1], relativePath),
    body: content.slice(match[0].length)
  };
}

/**
 * Compute frontmatter/body digests for markdown files.
 * @param {string} content
 * @param {string} relativePath
 * @returns {{frontmatterDigest: string | null, bodyDigest: string | null}}
 */
export function computeMarkdownPartDigests(content, relativePath) {
  const parts = parseMarkdownFrontmatter(content, relativePath);
  if (!parts.hasFrontmatter) {
    return {
      frontmatterDigest: null,
      bodyDigest: null
    };
  }

  return {
    frontmatterDigest: computeDigestString(stableYaml(parts.frontmatter)),
    bodyDigest: computeDigestString(normalizeMarkdownBody(parts.body))
  };
}

/**
 * Merge template markdown with current unknown frontmatter keys and preserve blocks preserved.
 * @param {string} templateContent
 * @param {string} currentContent
 * @param {string} relativePath
 * @returns {string}
 */
export function mergeMarkdownFrontmatter(templateContent, currentContent, relativePath = 'markdown file') {
  const templateParts = parseMarkdownFrontmatter(templateContent, relativePath);
  if (!templateParts.hasFrontmatter) {
    return templateContent.replace(/\n?$/, '\n');
  }

  const currentParts = parseMarkdownFrontmatter(currentContent, relativePath);
  if (!currentParts.hasFrontmatter) {
    return templateContent.replace(/\n?$/, '\n');
  }

  const mergedFrontmatter = mergeUnknownKeys(templateParts.frontmatter, currentParts.frontmatter);
  const mergedBody = mergePreserveBlocks(templateParts.body, currentParts.body);
  return `---\n${stableYaml(mergedFrontmatter)}---\n${mergedBody}`.replace(/\n?$/, '\n');
}

/**
 * Check whether a markdown file can use the frontmatter merge contract.
 * @param {string} relativePath
 * @param {string} content
 * @returns {boolean}
 */
export function supportsMarkdownFrontmatterMerge(relativePath, content) {
  if (!relativePath.endsWith('.md')) {
    return false;
  }
  return parseMarkdownFrontmatter(content, relativePath).hasFrontmatter;
}

export default {
  parseMarkdownFrontmatter,
  computeMarkdownPartDigests,
  mergeMarkdownFrontmatter,
  supportsMarkdownFrontmatterMerge
};
