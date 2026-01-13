import { PluginExecutionError } from '../error/user-error';
import { SheriffPlugin } from '../plugin/plugin';
import { findPluginByName, validatePlugin } from '../plugin/plugin-resolver';
import { createPluginAPI } from '../plugin/create-plugin-api';

/**
 * Executes a plugin by name with the provided arguments.
 *
 * This function handles the complete plugin execution flow:
 * 1. Finds the plugin by name from the registered plugins
 * 2. Validates the plugin has required properties (name, execute)
 * 3. Creates the SheriffPluginAPI instance
 * 4. Executes the plugin's execute method
 *
 * @param pluginName - The name of the plugin to execute (matches plugin.name)
 * @param args - CLI arguments to pass to the plugin (excluding the plugin name itself)
 * @param plugins - Array of registered plugins from configuration
 *
 * @throws {PluginNotFoundError} When no plugin with the given name is found
 * @throws {PluginInvalidError} When the plugin is missing required properties
 * @throws {PluginExecutionError} When the plugin's execute method throws an error
 *
 * @example
 * ```typescript
 * // In CLI main, when user runs: npx sheriff junit --format=xml
 * const plugins = getPlugins(); // From config
 * await executePlugin('junit', ['--format=xml'], plugins);
 * ```
 */
export async function executePlugin(
  pluginName: string,
  args: string[],
  plugins: SheriffPlugin[] | undefined,
): Promise<void> {
  // Find the plugin - throws PluginNotFoundError if not found
  const plugin = findPluginByName(pluginName, plugins);

  // Validate the plugin - throws PluginInvalidError if invalid
  // Note: findPluginByName already validates, but we call again for explicit clarity
  validatePlugin(plugin);

  // Create the API that the plugin will use
  const api = createPluginAPI();

  // Execute the plugin, wrapping any thrown errors
  try {
    await plugin.execute(args, api);
  } catch (error) {
    // Wrap the error in PluginExecutionError for consistent error handling
    throw new PluginExecutionError(
      pluginName,
      error instanceof Error ? error : String(error),
    );
  }
}
