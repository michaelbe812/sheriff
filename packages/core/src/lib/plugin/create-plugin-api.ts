import { cli } from '../cli/cli';
import { hasEncapsulationViolations } from '../checks/has-encapsulation-violations';
import { checkForDependencyRuleViolation } from '../checks/check-for-dependency-rule-violation';
import { traverseFileInfo } from '../modules/traverse-file-info';
import { getEntriesFromCliOrConfig } from '../cli/internal/get-entries-from-cli-or-config';
import { getProjectData as getProjectDataFn, ProjectData } from '../api/get-project-data';
import getFs from '../fs/getFs';
import {
  SheriffPluginAPI,
  VerificationResult,
  FileViolations,
  DependencyViolationInfo,
  ProjectDataOptions,
} from './plugin-api';
import { Configuration } from '../config/configuration';

/**
 * Runs Sheriff verification and returns results without exiting the process.
 *
 * This is the plugin-friendly version of the verify command that returns
 * data instead of logging output and calling process.exit.
 *
 * @param entryFile - Optional entry file path. Uses config default if not provided.
 * @returns Verification result with detailed violation information
 */
function verifyForPlugin(entryFile?: string): VerificationResult {
  const fs = getFs();
  const projectEntries = getEntriesFromCliOrConfig(entryFile);

  let encapsulationViolationCount = 0;
  let dependencyRuleViolationCount = 0;
  let filesWithViolationsCount = 0;
  const violations: Record<string, FileViolations> = {};

  for (const projectEntry of projectEntries) {
    for (const { fileInfo } of traverseFileInfo(
      projectEntry.projectInfo.fileInfo,
    )) {
      const encapsulations = Object.keys(
        hasEncapsulationViolations(fileInfo.path, projectEntry.projectInfo),
      );

      const dependencyRuleViolations = checkForDependencyRuleViolation(
        fileInfo.path,
        projectEntry.projectInfo,
      );

      if (encapsulations.length > 0 || dependencyRuleViolations.length > 0) {
        filesWithViolationsCount++;
        encapsulationViolationCount += encapsulations.length;
        dependencyRuleViolationCount += dependencyRuleViolations.length;

        const relativePath = fs.relativeTo(fs.cwd(), fileInfo.path);

        const depViolationInfos: DependencyViolationInfo[] =
          dependencyRuleViolations.map((v) => ({
            fromTag: v.fromTag,
            toTags: v.toTags,
            rawImport: v.rawImport,
          }));

        violations[relativePath] = {
          encapsulationViolations: encapsulations,
          dependencyRuleViolations: depViolationInfos,
        };
      }
    }
  }

  const success =
    encapsulationViolationCount === 0 && dependencyRuleViolationCount === 0;

  return {
    success,
    encapsulationViolationCount,
    dependencyRuleViolationCount,
    filesWithViolationsCount,
    violations,
  };
}

/**
 * Wrapper around getProjectData for the plugin API.
 *
 * @param entryFile - Optional entry file path. Uses config default if not provided.
 * @param options - Optional parameters for project data retrieval
 * @returns Project data including modules, dependencies, and tags
 */
function getProjectDataForPlugin(
  entryFile?: string,
  options?: ProjectDataOptions,
): ProjectData {
  const fs = getFs();
  const projectEntries = getEntriesFromCliOrConfig(entryFile, false);

  // Use the first entry point for project data
  // In most cases this is the single entry file from config
  const entry = projectEntries[0];
  const absolutePath = fs.join(fs.cwd(), entry.entryFile);

  return getProjectDataFn(absolutePath, {
    projectName: entry.projectName,
    ...options,
  });
}

/**
 * Gets the parsed Sheriff configuration.
 *
 * @returns The parsed Configuration object from sheriff.config.ts
 */
function getConfigForPlugin(): Configuration {
  // Get entry points which also parses the config
  const projectEntries = getEntriesFromCliOrConfig(undefined);
  // The config is available from the first project entry's projectInfo
  return projectEntries[0].projectInfo.config;
}

/**
 * Creates a SheriffPluginAPI instance for use by plugins.
 *
 * The API provides access to Sheriff's core functionality:
 * - `verify()` - Run verification and get results (without process.exit)
 * - `getProjectData()` - Get the parsed project structure
 * - `getConfig()` - Get the Sheriff configuration
 * - `log()` - Output to stdout
 * - `logError()` - Output to stderr
 *
 * @returns A SheriffPluginAPI implementation
 *
 * @example
 * ```typescript
 * const api = createPluginAPI();
 * const result = api.verify();
 * if (!result.success) {
 *   api.logError(`Found ${result.dependencyRuleViolationCount} violations`);
 * }
 * ```
 */
export function createPluginAPI(): SheriffPluginAPI {
  return {
    verify: verifyForPlugin,
    getProjectData: getProjectDataForPlugin,
    getConfig: getConfigForPlugin,
    log: (message: string) => cli.log(message),
    logError: (message: string) => cli.logError(message),
  };
}
