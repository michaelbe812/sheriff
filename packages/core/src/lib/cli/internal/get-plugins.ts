import getFs from '../../fs/getFs';
import { parseConfig } from '../../config/parse-config';
import { toFsPath } from '../../file-info/fs-path';
import { SheriffPlugin } from '../../plugin/plugin';

/**
 * Loads plugins from the sheriff.config.ts file.
 *
 * This function reads the sheriff.config.ts configuration file and extracts
 * the plugins array. It handles all edge cases gracefully:
 * - Returns empty array if sheriff.config.ts doesn't exist
 * - Returns empty array if plugins property is undefined
 * - Returns empty array if config parsing fails
 *
 * @returns Array of SheriffPlugin instances from the configuration,
 *          or an empty array if no plugins are configured
 *
 * @example
 * ```typescript
 * const plugins = getPlugins();
 * for (const plugin of plugins) {
 *   console.log(plugin.name, plugin.description);
 * }
 * ```
 */
export function getPlugins(): SheriffPlugin[] {
  const fs = getFs();
  const configPath = fs.join(fs.cwd(), 'sheriff.config.ts');

  // Return empty array if no config file exists
  if (!fs.exists(configPath)) {
    return [];
  }

  try {
    const config = parseConfig(toFsPath(configPath));
    // Return plugins array or empty array if undefined
    return config.plugins ?? [];
  } catch {
    // Return empty array if config parsing fails
    // This allows the CLI to continue and show help/error for unknown commands
    return [];
  }
}
