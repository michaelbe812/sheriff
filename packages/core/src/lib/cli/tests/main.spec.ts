import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockCli } from './helpers/mock-cli';
import { main } from '../main';
import { version } from '../../../../package.json';
import { createProject } from '../../test/project-creator';
import { tsConfig } from '../../test/fixtures/ts-config';
import { sheriffConfig } from '../../test/project-configurator';
import { SheriffPlugin } from '../../plugin/plugin';
import { SheriffPluginAPI } from '../../plugin/plugin-api';
import * as getPluginsModule from '../internal/get-plugins';

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

describe('main', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('help output', () => {
    it('should include the version in main', () => {
      const { allLogs } = mockCli();
      createProject({
        'tsconfig.json': tsConfig(),
        src: {
          'main.ts': [],
        },
      });
      main();
      expect(allLogs()).toContain(`Sheriff (${version})`);
    });

    it('should show help when no command is provided', () => {
      const { allLogs } = mockCli();
      createProject({
        'tsconfig.json': tsConfig(),
        src: {
          'main.ts': [],
        },
      });
      main();
      expect(allLogs()).toContain('Commands:');
      expect(allLogs()).toContain('sheriff verify');
      expect(allLogs()).toContain('sheriff list');
      expect(allLogs()).toContain('sheriff export');
      expect(allLogs()).toContain('sheriff init');
      expect(allLogs()).toContain('sheriff version');
    });

    it('should show help when unknown command is provided without matching plugin', () => {
      const { allLogs } = mockCli();
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
      main('unknown-command');
      expect(allLogs()).toContain('Commands:');
      expect(allLogs()).toContain(`Sheriff (${version})`);
    });
  });

  describe('plugin listing in help', () => {
    it('should list registered plugins in help output', () => {
      const { allLogs } = mockCli();
      const mockPlugin = createMockPlugin(
        'junit',
        async () => {},
        'Generate JUnit reports',
      );

      // Mock getPlugins to return our mock plugins (bypasses serialization issue)
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([mockPlugin]);

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

      main(); // No command, should show help

      expect(allLogs()).toContain('Plugins:');
      expect(allLogs()).toContain('sheriff junit');
      expect(allLogs()).toContain('Generate JUnit reports');
    });

    it('should list multiple plugins with descriptions', () => {
      const { allLogs } = mockCli();
      const plugin1 = createMockPlugin(
        'junit',
        async () => {},
        'Generate JUnit reports',
      );
      const plugin2 = createMockPlugin(
        'ui',
        async () => {},
        'Open Sheriff UI',
      );

      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([plugin1, plugin2]);

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

      main();

      expect(allLogs()).toContain('Plugins:');
      expect(allLogs()).toContain('sheriff junit: Generate JUnit reports');
      expect(allLogs()).toContain('sheriff ui: Open Sheriff UI');
    });

    it('should list plugins without description correctly', () => {
      const { allLogs } = mockCli();
      const mockPlugin = createMockPlugin('analyzer');

      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([mockPlugin]);

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

      main();

      expect(allLogs()).toContain('Plugins:');
      expect(allLogs()).toContain('sheriff analyzer');
      // Should NOT have trailing colon when no description
      expect(allLogs()).not.toContain('sheriff analyzer:');
    });

    it('should not show Plugins section when no plugins are registered', () => {
      const { allLogs } = mockCli();

      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([]);

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

      main();

      expect(allLogs()).toContain('Commands:');
      expect(allLogs()).not.toContain('Plugins:');
    });
  });

  describe('plugin execution', () => {
    it('should execute plugin when plugin name matches command', async () => {
      const executeMock = vi.fn<
        (args: string[], api: SheriffPluginAPI) => Promise<void>
      >();
      const mockPlugin = createMockPlugin('reporter', executeMock);

      mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([mockPlugin]);

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

      main('reporter');

      // Need to allow the async handler to complete
      await vi.waitFor(() => {
        expect(executeMock).toHaveBeenCalledTimes(1);
      });
    });

    it('should pass arguments to plugin', async () => {
      const executeMock = vi.fn<
        (args: string[], api: SheriffPluginAPI) => Promise<void>
      >();
      const mockPlugin = createMockPlugin('reporter', executeMock);

      mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([mockPlugin]);

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

      main('reporter', '--format=xml', 'output.xml');

      await vi.waitFor(() => {
        expect(executeMock).toHaveBeenCalledWith(
          ['--format=xml', 'output.xml'],
          expect.any(Object),
        );
      });
    });

    it('should provide SheriffPluginAPI to plugin', async () => {
      let receivedApi: SheriffPluginAPI | undefined;
      const mockPlugin = createMockPlugin(
        'reporter',
        async (_args, api) => {
          receivedApi = api;
        },
      );

      mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([mockPlugin]);

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

      main('reporter');

      await vi.waitFor(() => {
        expect(receivedApi).toBeDefined();
        expect(typeof receivedApi!.verify).toBe('function');
        expect(typeof receivedApi!.getProjectData).toBe('function');
        expect(typeof receivedApi!.getConfig).toBe('function');
        expect(typeof receivedApi!.log).toBe('function');
        expect(typeof receivedApi!.logError).toBe('function');
      });
    });
  });

  describe('plugin error handling', () => {
    it('should display error message when plugin throws', async () => {
      const mockPlugin = createMockPlugin('failing-plugin', async () => {
        throw new Error('Plugin failed!');
      });

      const { allErrorLogs } = mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([mockPlugin]);

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

      main('failing-plugin');

      await vi.waitFor(() => {
        expect(allErrorLogs()).toContain('failing-plugin');
        expect(allErrorLogs()).toContain('Plugin failed!');
      });
    });
  });

  describe('built-in command precedence', () => {
    it('should execute verify command for built-in commands', () => {
      mockCli();
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

      // This should not throw - verify should execute
      expect(() => main('verify')).not.toThrow();
    });

    it('should execute list command for built-in commands', () => {
      mockCli();
      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          modules: {
            'src': 'src',
          },
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
        },
      });

      expect(() => main('list')).not.toThrow();
    });

    it('should not execute plugin named after built-in command', async () => {
      const executeMock = vi.fn<
        (args: string[], api: SheriffPluginAPI) => Promise<void>
      >();
      // Try to name a plugin 'verify' - it should not be executed
      const mockPlugin = createMockPlugin('verify', executeMock);

      mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([mockPlugin]);

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

      main('verify');

      // Give time for any async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Plugin should NOT have been called - built-in takes precedence
      expect(executeMock).not.toHaveBeenCalled();
    });
  });
});
