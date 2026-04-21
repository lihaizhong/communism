#!/usr/bin/env node
/**
 * Upgrade Runtime CLI
 *
 * Entry point for check, dry-run, adopt, apply, rollback commands
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { check, dryRun, adopt, apply, rollback } from './src/runtime.mjs';
import { dirname } from 'path';
import { listRollbackPackages } from './src/rollback.mjs';
import { formatPlan } from './src/plan.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const COMMANDS_REQUIRING_BUNDLE = new Set(['check', 'dry-run', 'adopt', 'apply']);

function showUsage() {
  console.log(`
OpenSpec OPC Upgrade Runtime

Usage:
  upgrade <command> [options]

Commands:
  check              Check project state
  dry-run            Show what would change (default: top 50, use --full for all)
  adopt              Adopt an existing project
  apply              Apply upgrade
  rollback           Rollback to previous state (use --id for specific package)
  list-rollbacks     List available rollback packages

Options:
  --project          Path to project (default: current directory)
  --bundle           Path to template bundle
  --confirm-suspected
                    Confirm suspected managed assets during adopt
  --full             Show all changes (dry-run only)
  --plan-out         Write plan/report summary to a file (check/dry-run)
  --id               Rollback package ID (rollback command)
  --verbose          Show debug output
  --help             Show this help
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];

  const options = {
    project: process.cwd(),
    bundle: null,
    confirmSuspected: false,
    full: false,
    planOut: null,
    verbose: false
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--project':
        if (++i >= args.length || args[i].startsWith('--')) {
          console.error('Error: --project requires a value');
          showUsage();
          process.exit(1);
        }
        options.project = resolve(args[i]);
        break;
      case '--bundle':
        if (++i >= args.length || args[i].startsWith('--')) {
          console.error('Error: --bundle requires a value');
          showUsage();
          process.exit(1);
        }
        options.bundle = resolve(args[i]);
        break;
      case '--confirm-suspected':
        options.confirmSuspected = true;
        break;
      case '--full':
        options.full = true;
        break;
      case '--plan-out':
        if (++i >= args.length || args[i].startsWith('--')) {
          console.error('Error: --plan-out requires a value');
          showUsage();
          process.exit(1);
        }
        options.planOut = resolve(args[i]);
        break;
      case '--id':
        if (++i >= args.length || args[i].startsWith('--')) {
          console.error('Error: --id requires a value');
          showUsage();
          process.exit(1);
        }
        options.rollbackId = args[i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        showUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        showUsage();
        process.exit(1);
    }
  }
  
  return { command, options };
}

function isBundleDir(bundlePath) {
  return existsSync(resolve(bundlePath, 'manifest.json'));
}

function findBundle(options) {
  if (options.bundle) {
    return options.bundle;
  }

  const candidates = [
    resolve(__dirname, '..', '.template'),
    resolve(__dirname, '..', '..', '.template')
  ];

  for (const candidate of candidates) {
    if (isBundleDir(candidate)) {
      return candidate;
    }
  }

  console.error('Bundle not found. Use --bundle to specify path.');
  process.exit(1);
}

function renderPlanReport(command, result, full = false) {
  const lines = [];

  lines.push(`OpenSpec OPC Upgrade ${command} Report`);
  lines.push(`Status: ${result.status}`);
  lines.push(`Generated: ${new Date().toISOString()}`);

  if (result.plan) {
    lines.push('');
    lines.push(formatPlan(result.plan, full));
  }

  if (result.failures && result.failures.length > 0) {
    lines.push('');
    lines.push('Issues:');
    for (const failure of result.failures) {
      lines.push(`  [${failure.kind}] ${failure.path}: ${failure.message}`);
    }
  }

  if (!result.plan && (!result.failures || result.failures.length === 0)) {
    lines.push('');
    lines.push('No plan details were generated.');
  }

  return `${lines.join('\n')}\n`;
}

function writePlanReport(filePath, command, result, full = false) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, renderPlanReport(command, result, full), 'utf-8');
}

async function main() {
  const { command, options } = parseArgs();
  
  if (!command || command === '--help' || command === 'help') {
    showUsage();
    process.exit(0);
  }

  const bundlePath = COMMANDS_REQUIRING_BUNDLE.has(command)
    ? findBundle(options)
    : null;
  const projectPath = options.project;
  
  if (options.verbose) {
    console.log(`Project: ${projectPath}`);
    console.log(`Bundle:  ${bundlePath}`);
    console.log('');
  }
  
  let result;
  
  switch (command) {
    case 'check':
      result = check(projectPath, bundlePath);
      break;
      
    case 'dry-run':
      result = dryRun(projectPath, bundlePath, options.full);
      break;
      
    case 'adopt':
      result = adopt(projectPath, bundlePath, {
        confirmSuspected: options.confirmSuspected
      });
      break;
      
    case 'apply':
      result = apply(projectPath, bundlePath);
      break;
      
    case 'rollback':
      result = rollback(projectPath, options.rollbackId);
      break;
      
    case 'list-rollbacks':
      const packages = listRollbackPackages(projectPath);
      if (packages.length === 0) {
        console.log('No rollback packages found.');
      } else {
        console.log('Available rollback packages:\n');
        for (const pkg of packages) {
          console.log(`  ${pkg.id}`);
          console.log(`    Version: ${pkg.version}`);
          console.log(`    Created: ${pkg.createdAt}`);
          console.log(`    Assets: ${pkg.assetCount}`);
          console.log();
        }
      }
      process.exit(0);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      showUsage();
      process.exit(1);
  }
  
  // Output result
  if (options.planOut && (command === 'check' || command === 'dry-run')) {
    writePlanReport(options.planOut, command, result, options.full);
    console.log(`\nPlan report written to: ${options.planOut}`);
  }

  if (result.plan) {
    console.log('\nPlan generated. Use apply to execute.');
  }
  
  if (result.failures && result.failures.length > 0) {
    console.error(`\n${result.failures.length} issue(s) found:`);
    for (const failure of result.failures) {
      console.error(`  [${failure.kind}] ${failure.path}: ${failure.message}`);
    }
  }
  
  if (result.status === 'success') {
    console.log('\n✓ Success');
    if (result.newLockVersion) {
      console.log(`  Updated to version: ${result.newLockVersion}`);
    }
  } else if (result.status === 'blocked') {
    console.log('\n⚠ Blocked - resolve issues and retry');
    process.exit(2);
  } else if (result.status === 'failed') {
    console.log('\n✗ Failed');
    process.exit(1);
  } else if (result.status === 'partial') {
    console.log('\n⚠ Partial success - some groups failed');
    if (result.completedGroups.length > 0) {
      console.log(`  Completed: ${result.completedGroups.join(', ')}`);
    }
    if (result.blockedGroups.length > 0) {
      console.log(`  Blocked: ${result.blockedGroups.join(', ')}`);
    }
    process.exit(3);
  }
}

main().catch(err => {
  console.error(`Unexpected error: ${err.message}`);
  if (process.argv.includes('--verbose')) {
    console.error(err.stack);
  }
  process.exit(1);
});
