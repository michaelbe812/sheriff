#!/usr/bin/env node

import { handleError, handleErrorAsync } from './internal/handle-error';
import { init } from './init';
import { verify } from './verify';
import { list } from './list';
import { cli } from './cli';
import { exportData } from './export-data';
import { version } from './version';
import { version as packageVersion } from '../../../package.json';
import { getPlugins } from './internal/get-plugins';
import { executePlugin } from './plugin-command';
import { SheriffPlugin } from '../plugin/plugin';

/**
 * Set of built-in Sheriff commands that take precedence over plugins.
 */
const BUILTIN_COMMANDS = new Set(['init', 'verify', 'list', 'export', 'version']);

/**
 * Checks if a command is a built-in Sheriff command.
 *
 * @param cmd - The command to check
 * @returns True if the command is a built-in command
 */
function isBuiltinCommand(cmd: string | undefined): boolean {
  return cmd !== undefined && BUILTIN_COMMANDS.has(cmd);
}

/**
 * Displays help output including any registered plugins.
 *
 * @param plugins - Array of registered plugins to display
 */
function showHelp(plugins: SheriffPlugin[]): void {
  cli.log(
    cli.bold(`Sheriff (${packageVersion}) - Modularity for TypeScript Projects`),
  );
  cli.log('');
  cli.log('Commands:');
  cli.log(
    "  sheriff export [main.ts]: Exports the project's, along its dependencies and modules in json.",
  );
  cli.log(
    '  sheriff init [main.ts]: initializes Sheriff by adding a sheriff.config.ts.',
  );
  cli.log(
    '  sheriff list [main.ts]: lists the current modules of the project.',
  );
  cli.log(
    '  sheriff verify [main.ts]: runs the verification process for the project.',
  );
  cli.log('  sheriff version: prints out the current version.');

  // Display registered plugins if any
  if (plugins.length > 0) {
    cli.log('');
    cli.log('Plugins:');
    for (const plugin of plugins) {
      const description = plugin.description ? `: ${plugin.description}` : '';
      cli.log(`  sheriff ${plugin.name}${description}`);
    }
  }

  cli.log('');
  cli.log(
    '[main.ts] is optional if a sheriff.config.ts with an entryFile property is in the current path.',
  );
  cli.log(
    'For more information, visit: https://github.com/softarc-consulting/sheriff',
  );
}

/**
 * Handles non-built-in commands by checking for matching plugins or showing help.
 * This function is async to support plugin execution.
 *
 * @param cmd - The command to handle (may be undefined for no command)
 * @param args - Arguments to pass to the plugin
 * @param plugins - Array of registered plugins
 */
async function handlePluginOrHelp(
  cmd: string | undefined,
  args: string[],
  plugins: SheriffPlugin[],
): Promise<void> {
  // If no command provided, show help
  if (cmd === undefined) {
    showHelp(plugins);
    return;
  }

  // Check if there's a matching plugin
  const matchingPlugin = plugins.find((p) => p.name === cmd);

  if (matchingPlugin) {
    // Execute the plugin
    await executePlugin(cmd, args, plugins);
  } else {
    // No matching plugin, show help
    showHelp(plugins);
  }
}

/**
 * Main CLI entry point.
 * Handles built-in commands synchronously and plugins asynchronously.
 *
 * @param argv - Command line arguments (excluding node and script name)
 */
export function main(...argv: string[]) {
  const [cmd, ...args] = argv;

  // Handle built-in commands synchronously
  if (isBuiltinCommand(cmd)) {
    switch (cmd) {
      case 'init':
        handleError(() => init());
        break;
      case 'verify':
        handleError(() => verify(args));
        break;
      case 'list':
        handleError(() => list(args));
        break;
      case 'export':
        handleError(() => exportData(...args));
        break;
      case 'version':
        version();
        break;
    }
    return;
  }

  // Handle plugins and help asynchronously
  const plugins = getPlugins();
  handleErrorAsync(() => handlePluginOrHelp(cmd, args, plugins));
}
