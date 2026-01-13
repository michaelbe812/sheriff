import { describe, expect, it, vitest } from 'vitest';
import { executePlugin } from '../plugin-command';
import { createProject } from '../../test/project-creator';
import { tsConfig } from '../../test/fixtures/ts-config';
import { sheriffConfig } from '../../test/project-configurator';
import { SheriffPlugin } from '../../plugin/plugin';
import { SheriffPluginAPI } from '../../plugin/plugin-api';
import {
  PluginNotFoundError,
  PluginInvalidError,
  PluginExecutionError,
} from '../../error/user-error';

// Helper to create mock plugins
const createMockPlugin = (
  name: string,
  executeFn?: (args: string[], api: SheriffPluginAPI) => Promise<void>,
  description?: string,
): SheriffPlugin => ({
  name,
  description,
  execute: executeFn ?? (async () => {}),
});

describe('executePlugin', () => {
  describe('plugin discovery', () => {
    it('should find and execute the correct plugin by name', async () => {
      const executeMock = vitest.fn<
        (args: string[], api: SheriffPluginAPI) => Promise<void>
      >();
      const plugin1 = createMockPlugin('reporter', executeMock);
      const plugin2 = createMockPlugin('analyzer');

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await executePlugin('reporter', [], [plugin1, plugin2]);

      expect(executeMock).toHaveBeenCalledTimes(1);
    });

    it('should throw PluginNotFoundError when plugin name not in array', async () => {
      const plugin = createMockPlugin('reporter');

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await expect(
        executePlugin('unknown-plugin', [], [plugin]),
      ).rejects.toThrow(PluginNotFoundError);
    });

    it('should throw PluginNotFoundError when plugins array is empty', async () => {
      await expect(executePlugin('reporter', [], [])).rejects.toThrow(
        PluginNotFoundError,
      );
    });

    it('should throw PluginNotFoundError when plugins array is undefined', async () => {
      await expect(executePlugin('reporter', [], undefined)).rejects.toThrow(
        PluginNotFoundError,
      );
    });
  });

  describe('plugin validation', () => {
    it('should throw PluginInvalidError when found plugin has no name property', async () => {
      // Use a plugin that will be found by name match but fails validation
      const invalidPlugin = {
        name: 'broken',
        // Missing execute method
      } as unknown as SheriffPlugin;

      await expect(
        executePlugin('broken', [], [invalidPlugin]),
      ).rejects.toThrow(PluginInvalidError);
    });

    it('should throw PluginNotFoundError when searching for empty name', async () => {
      const validPlugin = createMockPlugin('reporter');

      await expect(
        executePlugin('', [], [validPlugin]),
      ).rejects.toThrow(PluginNotFoundError);
    });

    it('should throw PluginInvalidError when plugin has no execute method', async () => {
      const invalidPlugin = {
        name: 'broken',
      } as unknown as SheriffPlugin;

      await expect(
        executePlugin('broken', [], [invalidPlugin]),
      ).rejects.toThrow(PluginInvalidError);
    });

    it('should throw PluginInvalidError when execute is not a function', async () => {
      const invalidPlugin = {
        name: 'broken',
        execute: 'not a function',
      } as unknown as SheriffPlugin;

      await expect(
        executePlugin('broken', [], [invalidPlugin]),
      ).rejects.toThrow(PluginInvalidError);
    });
  });

  describe('plugin execution', () => {
    it('should pass CLI args array to the plugin', async () => {
      const executeMock = vitest.fn<
        (args: string[], api: SheriffPluginAPI) => Promise<void>
      >();
      const plugin = createMockPlugin('reporter', executeMock);

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await executePlugin('reporter', ['--format=xml', 'output.xml'], [plugin]);

      expect(executeMock).toHaveBeenCalledWith(
        ['--format=xml', 'output.xml'],
        expect.any(Object),
      );
    });

    it('should pass empty args array when no args provided', async () => {
      const executeMock = vitest.fn<
        (args: string[], api: SheriffPluginAPI) => Promise<void>
      >();
      const plugin = createMockPlugin('reporter', executeMock);

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await executePlugin('reporter', [], [plugin]);

      expect(executeMock).toHaveBeenCalledWith([], expect.any(Object));
    });

    it('should pass valid SheriffPluginAPI object to the plugin', async () => {
      let receivedApi: SheriffPluginAPI | undefined;
      const plugin = createMockPlugin(
        'reporter',
        async (_args: string[], api: SheriffPluginAPI) => {
          receivedApi = api;
        },
      );

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await executePlugin('reporter', [], [plugin]);

      expect(receivedApi).toBeDefined();
      expect(typeof receivedApi!.verify).toBe('function');
      expect(typeof receivedApi!.getProjectData).toBe('function');
      expect(typeof receivedApi!.getConfig).toBe('function');
      expect(typeof receivedApi!.log).toBe('function');
      expect(typeof receivedApi!.logError).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should wrap plugin errors in PluginExecutionError', async () => {
      const originalError = new Error('Plugin crashed!');
      const plugin = createMockPlugin('reporter', async () => {
        throw originalError;
      });

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await expect(executePlugin('reporter', [], [plugin])).rejects.toThrow(
        PluginExecutionError,
      );
    });

    it('should include plugin name in PluginExecutionError message', async () => {
      const plugin = createMockPlugin('junit-reporter', async () => {
        throw new Error('Failed to write file');
      });

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await expect(executePlugin('junit-reporter', [], [plugin])).rejects.toThrow(
        /junit-reporter/,
      );
    });

    it('should include original error message in PluginExecutionError', async () => {
      const plugin = createMockPlugin('reporter', async () => {
        throw new Error('Specific failure reason');
      });

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await expect(executePlugin('reporter', [], [plugin])).rejects.toThrow(
        /Specific failure reason/,
      );
    });

    it('should handle non-Error throws (strings)', async () => {
      const plugin = createMockPlugin('reporter', async () => {
        throw 'string error message';
      });

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await expect(executePlugin('reporter', [], [plugin])).rejects.toThrow(
        PluginExecutionError,
      );
    });

    it('should handle rejected promises', async () => {
      const plugin = createMockPlugin(
        'reporter',
        () => Promise.reject(new Error('Async rejection')),
      );

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await expect(executePlugin('reporter', [], [plugin])).rejects.toThrow(
        PluginExecutionError,
      );
    });
  });

  describe('successful execution', () => {
    it('should resolve successfully when plugin completes without error', async () => {
      const plugin = createMockPlugin('reporter', async () => {
        // Success - no error thrown
      });

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      await expect(
        executePlugin('reporter', [], [plugin]),
      ).resolves.toBeUndefined();
    });
  });
});
