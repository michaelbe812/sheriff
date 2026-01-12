import {
  PluginNotFoundError,
  PluginInvalidError,
} from '../error/user-error';
import { SheriffPlugin } from './plugin';

/**
 * Validates that a plugin has the required properties.
 *
 * A valid plugin must have:
 * - A `name` property that is a non-empty string
 * - An `execute` property that is a function
 *
 * @param plugin - The plugin instance to validate
 * @throws {PluginInvalidError} If the plugin is missing required properties
 */
export function validatePlugin(plugin: unknown): asserts plugin is SheriffPlugin {
  if (!plugin || typeof plugin !== 'object') {
    throw new PluginInvalidError('Plugin must be an object');
  }

  const pluginObj = plugin as Record<string, unknown>;

  if (typeof pluginObj['name'] !== 'string' || pluginObj['name'].trim() === '') {
    throw new PluginInvalidError("Plugin is missing a valid 'name' property");
  }

  if (typeof pluginObj['execute'] !== 'function') {
    throw new PluginInvalidError("Plugin is missing an 'execute' method");
  }
}

/**
 * Finds a plugin by name from the plugins array.
 *
 * @param name - The name of the plugin to find
 * @param plugins - Array of registered plugins (may be undefined or empty)
 * @returns The plugin instance with the matching name
 * @throws {PluginNotFoundError} If no plugin with the given name is found
 * @throws {PluginInvalidError} If the found plugin is malformed
 *
 * @example
 * ```typescript
 * const plugins = [new JunitReporterPlugin(), new SonarPlugin()];
 * const plugin = findPluginByName('junit', plugins);
 * // Returns the JunitReporterPlugin instance
 * ```
 */
export function findPluginByName(
  name: string,
  plugins: SheriffPlugin[] | undefined,
): SheriffPlugin {
  if (!plugins || plugins.length === 0) {
    throw new PluginNotFoundError(name);
  }

  const plugin = plugins.find((p) => {
    // Validate each plugin as we search to catch malformed plugins early
    try {
      validatePlugin(p);
      return p.name === name;
    } catch {
      // Skip invalid plugins during search, but still check name match
      // If this was the matching plugin, we'll validate it below
      return (p as { name?: string })?.name === name;
    }
  });

  if (!plugin) {
    throw new PluginNotFoundError(name);
  }

  // Validate the found plugin to ensure it's properly formed
  validatePlugin(plugin);

  return plugin;
}
