export type UserErrorCode =
  | 'SH-001'
  | 'SH-002'
  | 'SH-003'
  | 'SH-004'
  | 'SH-005'
  | 'SH-006'
  | 'SH-007'
  | 'SH-008'
  | 'SH-009'
  | 'SH-010'
  | 'SH-011'
  | 'SH-012'
  | 'SH-013'
  | 'SH-014'
  | 'SH-015';

export class UserError extends Error {
  constructor(
    public code: UserErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export class InvalidPathError extends UserError {
  constructor(pathAlias: string, path: string) {
    super(
      'SH-001',
      `invalid path mapping detected: ${pathAlias}: ${path}. Please verify that the path exists.`,
    );
  }
}

export class NoDependencyRuleForTagError extends UserError {
  constructor(tag: string) {
    super(
      'SH-002',
      `No dependency rule for tag '${tag}' found in sheriff.config.ts`,
    );
  }
}

export class NoAssignedTagError extends UserError {
  constructor(moduleDir: string) {
    super('SH-003', `No assigned Tag for '${moduleDir}' in sheriff.config.ts`);
  }
}

export class TagWithoutValueError extends UserError {
  constructor(path: string) {
    super(
      'SH-004',
      `Tag configuration '/${path}' in sheriff.config.ts has no value`,
    );
  }
}

export class ExistingTagPlaceholderError extends UserError {
  constructor(placeholder: string) {
    super(
      'SH-005',
      `placeholder for value "${placeholder}" does already exist`,
    );
  }
}

export class InvalidPlaceholderError extends UserError {
  constructor(placeholder: string, path: string) {
    super(
      'SH-006',
      `cannot find a placeholder for "${placeholder}" in tag configuration. Module: ${path}`,
    );
  }
}

export class MissingModulesWithoutAutoTaggingError extends UserError {
  constructor() {
    super(
      'SH-007',
      'sheriff.config.ts must have either modules or autoTagging set to true',
    );
  }
}

export class TaggingAndModulesError extends UserError {
  constructor() {
    super(
      'SH-008',
      'sheriff.config.ts contains both tagging and modules. Use only modules.',
    );
  }
}

export class CollidingEncapsulationSettings extends UserError {
  constructor() {
    super(
      'SH-009',
      'sheriff.config.ts contains both encapsulatedFolderNameForBarrelLess and encapsulationPatternForBarrellLess. Use encapsulationPatternForBarrellLess.',
    );
  }
}

export class TsExtendsResolutionError extends UserError {
  constructor(tsConfigPath: string, extendsPath: string) {
    super(
      'SH-010',
      `Cannot resolve path ${extendsPath} of "extends" property in ${tsConfigPath}. Please verify that the path exists.`,
    );
  }
}

export class CollidingEntrySettings extends UserError {
  constructor() {
    super(
      'SH-011',
      'sheriff.config.ts contains both entryFile and entryPoints. Use only one of them.',
    );
  }
}

export class NoEntryPointsFoundError extends UserError {
  constructor() {
    super('SH-012', 'No entryPoints defined in sheriff.config.ts.');
  }
}

/**
 * Error thrown when a plugin with the specified name is not found in the plugins array.
 */
export class PluginNotFoundError extends UserError {
  constructor(pluginName: string) {
    super(
      'SH-013',
      `Plugin '${pluginName}' not found. Make sure to register the plugin in your sheriff.config.ts plugins array.`,
    );
  }
}

/**
 * Error thrown when a plugin instance is missing required properties (name or execute).
 */
export class PluginInvalidError extends UserError {
  constructor(details: string) {
    super(
      'SH-014',
      `Invalid plugin configuration: ${details}. Plugins must have a 'name' property and an 'execute' method.`,
    );
  }
}

/**
 * Error thrown when a plugin's execute method throws an error.
 */
export class PluginExecutionError extends UserError {
  constructor(pluginName: string, originalError: Error | string) {
    const errorMessage =
      originalError instanceof Error
        ? originalError.message
        : String(originalError);
    super(
      'SH-015',
      `Plugin '${pluginName}' failed during execution: ${errorMessage}`,
    );
  }
}
