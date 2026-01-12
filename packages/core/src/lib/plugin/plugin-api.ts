import { ProjectData } from '../api/get-project-data';
import { Configuration } from '../config/configuration';

/**
 * Information about a dependency rule violation.
 */
export interface DependencyViolationInfo {
  /** The tag of the module that has the invalid import */
  fromTag: string;
  /** The tags of the module being illegally imported */
  toTags: string[];
  /** The raw import path that caused the violation */
  rawImport: string;
}

/**
 * Violations found in a single file.
 */
export interface FileViolations {
  /** List of encapsulation violations (deep imports) */
  encapsulationViolations: string[];
  /** List of dependency rule violations with details */
  dependencyRuleViolations: DependencyViolationInfo[];
}

/**
 * Result of running Sheriff verification.
 *
 * Contains summary counts and detailed violation information.
 */
export interface VerificationResult {
  /** True if no violations were found */
  success: boolean;
  /** Total number of encapsulation (deep import) violations */
  encapsulationViolationCount: number;
  /** Total number of dependency rule violations */
  dependencyRuleViolationCount: number;
  /** Number of files that have at least one violation */
  filesWithViolationsCount: number;
  /** Map of file paths to their violations */
  violations: Record<string, FileViolations>;
}

/**
 * Options for getProjectData.
 */
export interface ProjectDataOptions {
  /** Skip import resolution */
  skipImportResolution?: boolean;
}

/**
 * API provided to Sheriff plugins.
 *
 * Provides access to core Sheriff functionality without requiring
 * plugins to depend on internal implementation details.
 *
 * @example
 * ```typescript
 * async execute(args: string[], api: SheriffPluginAPI): Promise<void> {
 *   // Run verification
 *   const result = api.verify();
 *   if (!result.success) {
 *     api.logError(`Found ${result.dependencyRuleViolationCount} violations`);
 *   }
 *
 *   // Access project structure
 *   const projectData = api.getProjectData();
 *   api.log(`Analyzed ${projectData.modules.length} modules`);
 *
 *   // Read configuration
 *   const config = api.getConfig();
 *   api.log(`Version: ${config.version}`);
 * }
 * ```
 */
export interface SheriffPluginAPI {
  /**
   * Run Sheriff verification and return results.
   *
   * Unlike the CLI verify command, this method returns the result
   * instead of exiting the process on violations.
   *
   * @param entryFile - Optional entry file path. Uses config default if not provided.
   * @returns Verification result with violation details
   */
  verify(entryFile?: string): VerificationResult;

  /**
   * Get the parsed project data structure.
   *
   * @param entryFile - Optional entry file path. Uses config default if not provided.
   * @param options - Optional parameters for project data retrieval
   * @returns Project data including modules, dependencies, and tags
   */
  getProjectData(entryFile?: string, options?: ProjectDataOptions): ProjectData;

  /**
   * Get the parsed Sheriff configuration.
   *
   * @returns The parsed Configuration object from sheriff.config.ts
   */
  getConfig(): Configuration;

  /**
   * Log a message to stdout.
   *
   * @param message - Message to display
   */
  log(message: string): void;

  /**
   * Log an error message to stderr.
   *
   * @param message - Error message to display
   */
  logError(message: string): void;
}
