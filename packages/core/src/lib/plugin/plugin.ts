import { SheriffPluginAPI } from './plugin-api';

/**
 * Interface that all Sheriff plugins must implement.
 *
 * Plugins are instantiated in sheriff.config.ts with configuration
 * passed via constructor. They are invoked via CLI using their name.
 *
 * @example
 * ```typescript
 * import { SheriffPlugin, SheriffPluginAPI } from '@softarc/sheriff-core';
 *
 * export class JunitReporterPlugin implements SheriffPlugin {
 *   name = 'junit';
 *   description = 'Generate JUnit XML reports from verification results';
 *
 *   constructor(private options: { outputPath?: string } = {}) {}
 *
 *   async execute(args: string[], api: SheriffPluginAPI): Promise<void> {
 *     const result = api.verify();
 *     // Generate JUnit report...
 *     api.log(`Report written to ${this.options.outputPath ?? 'junit.xml'}`);
 *   }
 * }
 * ```
 *
 * @example
 * In sheriff.config.ts:
 * ```typescript
 * import { JunitReporterPlugin } from 'sheriff-junit-plugin';
 *
 * export const config: SheriffConfig = {
 *   modules: { ... },
 *   depRules: { ... },
 *   plugins: [
 *     new JunitReporterPlugin({ outputPath: 'reports/junit.xml' })
 *   ]
 * };
 * ```
 *
 * @example
 * CLI usage:
 * ```bash
 * npx sheriff junit --format=xml
 * ```
 */
export interface SheriffPlugin {
  /**
   * Unique name used as CLI command.
   *
   * When a user runs `npx sheriff <name>`, this plugin will be invoked
   * if the name matches and it's not a built-in command.
   *
   * Names should be lowercase, alphanumeric with optional hyphens.
   */
  name: string;

  /**
   * Optional description shown in help output.
   *
   * Displayed when user runs `npx sheriff` or `npx sheriff --help`.
   */
  description?: string;

  /**
   * Execute the plugin.
   *
   * @param args - CLI arguments after the plugin name.
   *               For `npx sheriff junit --format=xml report.xml`,
   *               args would be `['--format=xml', 'report.xml']`
   * @param api - Sheriff API for accessing project data, configuration,
   *              and verification results
   * @returns Promise that resolves when plugin execution completes
   * @throws Any error thrown will be caught and displayed to the user
   */
  execute(args: string[], api: SheriffPluginAPI): Promise<void>;
}
