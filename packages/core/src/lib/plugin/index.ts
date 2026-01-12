/**
 * Sheriff Plugin System
 *
 * This module provides the types and utilities for creating and using
 * Sheriff plugins. Plugins extend Sheriff's functionality by providing
 * custom commands that can access project data and verification results.
 *
 * @example
 * Creating a plugin:
 * ```typescript
 * import { SheriffPlugin, SheriffPluginAPI } from '@softarc/sheriff-core';
 *
 * export class MyPlugin implements SheriffPlugin {
 *   name = 'my-plugin';
 *   description = 'My custom plugin';
 *
 *   async execute(args: string[], api: SheriffPluginAPI): Promise<void> {
 *     const result = api.verify();
 *     api.log(`Found ${result.dependencyRuleViolationCount} violations`);
 *   }
 * }
 * ```
 *
 * @example
 * Registering a plugin in sheriff.config.ts:
 * ```typescript
 * import { MyPlugin } from './my-plugin';
 *
 * export const config: SheriffConfig = {
 *   modules: { ... },
 *   depRules: { ... },
 *   plugins: [new MyPlugin()]
 * };
 * ```
 *
 * @module plugin
 */

// Plugin interface
export { SheriffPlugin } from './plugin';

// Plugin API interface and result types
export {
  SheriffPluginAPI,
  VerificationResult,
  FileViolations,
  DependencyViolationInfo,
  ProjectDataOptions,
} from './plugin-api';

// Plugin resolver functions
export { findPluginByName, validatePlugin } from './plugin-resolver';

// Plugin API factory
export { createPluginAPI } from './create-plugin-api';
