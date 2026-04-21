/**
 * Helpers for managed template assets that need merge-aware behavior.
 */

export const DEFAULT_PRESERVE_SECTION = {
  startHeading: '## Repository-Specific Constraints',
  endHeading: '## Required Behavior'
};

function findHeadingIndex(lines, heading, startIndex = 0) {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].trim() === heading) {
      return index;
    }
  }

  return -1;
}

export function extractSection(content, section = DEFAULT_PRESERVE_SECTION) {
  const lines = content.split(/\r?\n/);
  const startIndex = findHeadingIndex(lines, section.startHeading);
  if (startIndex === -1) {
    return null;
  }

  const endIndex = findHeadingIndex(lines, section.endHeading, startIndex + 1);
  if (endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  return lines.slice(startIndex + 1, endIndex).join('\n');
}

export function replaceSection(content, replacement, section = DEFAULT_PRESERVE_SECTION) {
  const lines = content.split(/\r?\n/);
  const startIndex = findHeadingIndex(lines, section.startHeading);
  if (startIndex === -1) {
    return content;
  }

  const endIndex = findHeadingIndex(lines, section.endHeading, startIndex + 1);
  if (endIndex === -1 || endIndex <= startIndex) {
    return content;
  }

  const nextLines = [
    ...lines.slice(0, startIndex + 1),
    ...replacement.split('\n'),
    ...lines.slice(endIndex)
  ];

  return `${nextLines.join('\n').replace(/\n+$/, '')}\n`;
}

export function mergePreservedSection(templateContent, currentContent, section = DEFAULT_PRESERVE_SECTION) {
  const preserved = extractSection(currentContent, section);
  if (preserved === null) {
    return templateContent;
  }

  return replaceSection(templateContent, preserved, section);
}
