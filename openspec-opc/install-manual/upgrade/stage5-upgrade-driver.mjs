#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSourceRoot = path.resolve(scriptDir, '../..');

function quoteShell(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function parseArgs(argv) {
  const options = {
    sourceRoot: defaultSourceRoot,
    project: null,
    aiConfigDir: null,
    ciType: 'other',
    bundleOut: null,
    planOut: null,
    executionOut: null,
    format: 'shell'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = argv[index + 1];

    switch (arg) {
      case '--source-root':
        options.sourceRoot = path.resolve(nextValue);
        index += 1;
        break;
      case '--project':
        options.project = path.resolve(nextValue);
        index += 1;
        break;
      case '--ai-config-dir':
        options.aiConfigDir = nextValue;
        index += 1;
        break;
      case '--ci-type':
        options.ciType = nextValue;
        index += 1;
        break;
      case '--bundle-out':
        options.bundleOut = path.resolve(nextValue);
        index += 1;
        break;
      case '--plan-out':
        options.planOut = path.resolve(nextValue);
        index += 1;
        break;
      case '--execution-out':
        options.executionOut = path.resolve(nextValue);
        index += 1;
        break;
      case '--format':
        options.format = nextValue;
        index += 1;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!options.project) {
    throw new Error('--project is required');
  }
  if (!options.aiConfigDir) {
    throw new Error('--ai-config-dir is required');
  }
  if (!options.bundleOut) {
    options.bundleOut = path.join(options.project, '.openspec-opc', '.cache', 'openspec-opc-upgrade-bundle');
  }
  if (!options.planOut) {
    options.planOut = path.join(options.project, '.openspec-opc', 'install-upgrade-plan.txt');
  }
  if (!['shell', 'json'].includes(options.format)) {
    throw new Error(`unsupported format: ${options.format}`);
  }

  return options;
}

function printHelp() {
  process.stdout.write(`OpenSpec OPC Stage5 Upgrade Driver

Usage:
  node ./stage5-upgrade-driver.mjs --project <path> --ai-config-dir <dir> [options]

Options:
  --project       Target project root (required)
  --ai-config-dir AI config dir relative path, e.g. .opencode (required)
  --ci-type       github | gitlab | other (default: other)
  --bundle-out    Bundle output path (default: <project>/.openspec-opc/.cache/openspec-opc-upgrade-bundle)
  --plan-out      Upgrade plan report path (default: <project>/.openspec-opc/install-upgrade-plan.txt)
  --execution-out Write the machine-readable execution plan JSON to this path
  --source-root   Source workspace root for build-source-bundle (default: openspec-opc workspace root)
  --format        shell | json (default: shell)
  --help          Show this help
`);
}

function buildSequence(options) {
  const buildBundleCommand = [
    'node',
    quoteShell(path.join(scriptDir, 'build-source-bundle.mjs')),
    '--source-root',
    quoteShell(options.sourceRoot),
    '--out',
    quoteShell(options.bundleOut),
    '--ai-config-dir',
    quoteShell(options.aiConfigDir)
  ];

  if (options.ciType && options.ciType !== 'other') {
    buildBundleCommand.push('--ci-type', quoteShell(options.ciType));
  }

  const cliBase = [
    'node',
    quoteShell(path.join(scriptDir, 'cli.mjs'))
  ];

  const commands = [
    {
      id: 'build_bundle',
      when: 'always',
      command: buildBundleCommand.join(' ')
    },
    {
      id: 'check',
      when: 'always',
      command: [
        ...cliBase,
        'check',
        '--project',
        quoteShell(options.project),
        '--bundle',
        quoteShell(options.bundleOut),
        '--plan-out',
        quoteShell(options.planOut)
      ].join(' ')
    },
    {
      id: 'adopt',
      when: 'only if check reports missing lock and stage3 already confirmed prior OpenSpec OPC traces',
      command: [
        ...cliBase,
        'adopt',
        '--project',
        quoteShell(options.project),
        '--bundle',
        quoteShell(options.bundleOut),
        '--confirm-suspected'
      ].join(' ')
    },
    {
      id: 'dry_run',
      when: 'always after adopt fallback, otherwise after a successful check review',
      command: [
        ...cliBase,
        'dry-run',
        '--project',
        quoteShell(options.project),
        '--bundle',
        quoteShell(options.bundleOut),
        '--plan-out',
        quoteShell(options.planOut)
      ].join(' ')
    },
    {
      id: 'apply',
      when: 'only after the user reviews the plan report and explicitly confirms',
      command: [
        ...cliBase,
        'apply',
        '--project',
        quoteShell(options.project),
        '--bundle',
        quoteShell(options.bundleOut)
      ].join(' ')
    }
  ];

  const stepResultMapping = {
    build_bundle: {
      executor: 'shell',
      eventByExitCode: {
        '0': 'success',
        nonZero: 'failed'
      }
    },
    check: {
      executor: 'openspec-opc-upgrade-cli',
      commandId: 'check',
      runtimeStatusByExitCode: {
        '0': 'success',
        '1': 'failed',
        '2': 'blocked'
      },
      eventByRuntimeStatus: {
        success: 'success',
        failed: 'failed',
        blocked: 'blocked'
      }
    },
    adopt_if_missing_lock: {
      executor: 'openspec-opc-upgrade-cli',
      commandId: 'adopt',
      runtimeStatusByExitCode: {
        '0': 'success',
        '1': 'failed'
      },
      eventByRuntimeStatus: {
        success: 'success',
        failed: 'failed'
      },
      syntheticEvents: {
        skipped: 'condition evaluated false'
      }
    },
    dry_run: {
      executor: 'openspec-opc-upgrade-cli',
      commandId: 'dry-run',
      runtimeStatusByExitCode: {
        '0': 'success',
        '1': 'failed',
        '2': 'blocked'
      },
      eventByRuntimeStatus: {
        success: 'success',
        failed: 'failed',
        blocked: 'blocked'
      }
    },
    user_confirmation: {
      executor: 'manual-gate',
      eventByDecision: {
        approved: 'approved',
        rejected: 'rejected'
      }
    },
    apply: {
      executor: 'openspec-opc-upgrade-cli',
      commandId: 'apply',
      runtimeStatusByExitCode: {
        '0': 'success',
        '1': 'failed',
        '2': 'blocked',
        '3': 'partial'
      },
      eventByRuntimeStatus: {
        success: 'success',
        failed: 'failed',
        blocked: 'blocked',
        partial: 'partial'
      }
    }
  };

  const steps = [
    {
      id: 'build_bundle',
      title: 'Build the temporary template bundle',
      kind: 'command',
      run: {
        command: commands[0].command
      },
      outputs: {
        bundlePath: options.bundleOut
      },
      resultMapping: stepResultMapping.build_bundle,
      transitions: [
        { on: 'success', to: 'check' },
        { on: 'failed', to: 'stop' }
      ]
    },
    {
      id: 'check',
      title: 'Check project state and persist the first plan report',
      kind: 'command',
      run: {
        command: commands[1].command
      },
      outputs: {
        planReportPath: options.planOut
      },
      resultMapping: stepResultMapping.check,
      transitions: [
        { on: 'success', to: 'dry_run' },
        { on: 'blocked', to: 'adopt_if_missing_lock' },
        { on: 'failed', to: 'stop' }
      ]
    },
    {
      id: 'adopt_if_missing_lock',
      title: 'Adopt the existing project only when the lock is missing',
      kind: 'conditional_command',
      condition: {
        checkStatus: 'blocked',
        failureMessageIncludes: 'No lock file found',
        requiresConfirmedInstallTraces: true
      },
      run: {
        command: commands[2].command
      },
      resultMapping: stepResultMapping.adopt_if_missing_lock,
      transitions: [
        { on: 'success', to: 'dry_run' },
        { on: 'skipped', to: 'stop' },
        { on: 'failed', to: 'stop' }
      ]
    },
    {
      id: 'dry_run',
      title: 'Generate the final categorized upgrade summary',
      kind: 'command',
      run: {
        command: commands[3].command
      },
      outputs: {
        planReportPath: options.planOut
      },
      resultMapping: stepResultMapping.dry_run,
      transitions: [
        { on: 'success', to: 'user_confirmation' },
        { on: 'blocked', to: 'user_confirmation' },
        { on: 'failed', to: 'stop' }
      ]
    },
    {
      id: 'user_confirmation',
      title: 'Require explicit user confirmation after reviewing the plan report',
      kind: 'manual_gate',
      inputs: {
        planReportPath: options.planOut
      },
      resultMapping: stepResultMapping.user_confirmation,
      transitions: [
        { on: 'approved', to: 'apply' },
        { on: 'rejected', to: 'stop' }
      ]
    },
    {
      id: 'apply',
      title: 'Apply the upgrade after confirmation',
      kind: 'command',
      run: {
        command: commands[4].command
      },
      resultMapping: stepResultMapping.apply,
      transitions: [
        { on: 'success', to: 'done' },
        { on: 'failed', to: 'stop_with_rollback' },
        { on: 'blocked', to: 'stop' },
        { on: 'partial', to: 'stop_with_rollback' }
      ]
    }
  ];

  return {
    schemaVersion: '1',
    type: 'openspec-opc-stage5-upgrade-plan',
    transitionSchemaVersion: '1',
    initialStepId: 'build_bundle',
    terminalStates: ['done', 'stop', 'stop_with_rollback'],
    eventTypes: ['success', 'blocked', 'failed', 'partial', 'skipped', 'approved', 'rejected'],
    runtimeStatusContract: {
      cliName: 'openspec-opc-upgrade-cli',
      statusByExitCode: {
        '0': 'success',
        '1': 'failed',
        '2': 'blocked',
        '3': 'partial'
      },
      exitCodeByStatus: {
        success: 0,
        failed: 1,
        blocked: 2,
        partial: 3
      }
    },
    project: options.project,
    sourceRoot: options.sourceRoot,
    aiConfigDir: options.aiConfigDir,
    ciType: options.ciType,
    bundleOut: options.bundleOut,
    planOut: options.planOut,
    commands,
    steps
  };
}

function renderShell(sequence) {
  const lines = [];
  lines.push('OpenSpec OPC Stage5 Upgrade Command Sequence');
  lines.push(`project: ${sequence.project}`);
  lines.push(`bundle:  ${sequence.bundleOut}`);
  lines.push(`plan:    ${sequence.planOut}`);
  lines.push('');
  lines.push('1. Build the temporary bundle');
  lines.push(`   ${sequence.commands[0].command}`);
  lines.push('2. Run check and persist the first report');
  lines.push(`   ${sequence.commands[1].command}`);
  lines.push('3. Only if check says the lock is missing but prior install traces are confirmed, run adopt');
  lines.push(`   ${sequence.commands[2].command}`);
  lines.push('4. Run dry-run and persist the final categorized report');
  lines.push(`   ${sequence.commands[3].command}`);
  lines.push('5. After explicit user confirmation, apply the upgrade');
  lines.push(`   ${sequence.commands[4].command}`);
  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const sequence = buildSequence(options);

  if (options.executionOut) {
    mkdirSync(path.dirname(options.executionOut), { recursive: true });
    writeFileSync(options.executionOut, `${JSON.stringify(sequence, null, 2)}\n`, 'utf-8');
  }

  if (options.format === 'json') {
    process.stdout.write(`${JSON.stringify(sequence, null, 2)}\n`);
    return;
  }

  process.stdout.write(renderShell(sequence));
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error?.message || String(error)}\n`);
  process.exit(1);
}
