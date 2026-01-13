import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockCli } from './helpers/mock-cli';
import { main } from '../main';
import { createProject } from '../../test/project-creator';
import { tsConfig } from '../../test/fixtures/ts-config';
import { sheriffConfig } from '../../test/project-configurator';
import { SheriffPlugin } from '../../plugin/plugin';
import {
  SheriffPluginAPI,
  VerificationResult,
  FileViolations,
} from '../../plugin/plugin-api';
import * as getPluginsModule from '../internal/get-plugins';
import { ProjectData, ProjectDataEntry } from '../../api/get-project-data';
import { Configuration } from '../../config/configuration';

/**
 * End-to-end tests for the Sheriff Plugin System.
 *
 * These tests verify the complete plugin workflow:
 * - Plugin registration and discovery
 * - Plugin execution via CLI
 * - All SheriffPluginAPI methods work correctly
 * - Error handling for various failure modes
 * - No regressions in built-in commands
 */
describe('Plugin System E2E', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Built-in command regression tests', () => {
    it('npx sheriff verify still works without plugins', () => {
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

      // Verify command should work as before
      expect(() => main('verify')).not.toThrow();
      expect(allLogs()).toContain('No issues found');
    });

    it('npx sheriff verify detects violations correctly', () => {
      const { allLogs } = mockCli();

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          modules: {
            'src/customers': ['customers'],
            'src/holidays': ['holidays'],
          },
          depRules: {
            root: ['customers', 'holidays'],
            customers: [],
            holidays: [],
          },
        }),
        src: {
          'main.ts': ['./holidays', './customers'],
          holidays: {
            'index.ts': ['./holidays.component'],
            'holidays.component.ts': ['../customers'],
          },
          customers: { 'index.ts': [] },
        },
      });

      main('verify', 'src/main.ts');

      // Should detect the dependency rule violation (output goes to logs, not errors)
      expect(allLogs()).toContain('holidays');
      expect(allLogs()).toContain('customers');
    });

    it('npx sheriff list still works', () => {
      const { allLogs } = mockCli();

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          modules: {
            'src/customers': ['customers'],
          },
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
          customers: { 'index.ts': [] },
        },
      });

      expect(() => main('list')).not.toThrow();
      expect(allLogs()).toContain('customers');
    });
  });

  describe('Plugin API method tests', () => {
    it('api.verify() returns VerificationResult with correct structure', async () => {
      let capturedResult: VerificationResult | undefined;

      const testPlugin: SheriffPlugin = {
        name: 'verify-tester',
        description: 'Tests api.verify()',
        async execute(_args: string[], api: SheriffPluginAPI): Promise<void> {
          capturedResult = api.verify();
        },
      };

      mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([testPlugin]);

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

      main('verify-tester');

      await vi.waitFor(() => {
        expect(capturedResult).toBeDefined();
      });

      // Verify the structure of VerificationResult
      expect(capturedResult).toHaveProperty('success');
      expect(capturedResult).toHaveProperty('encapsulationViolationCount');
      expect(capturedResult).toHaveProperty('dependencyRuleViolationCount');
      expect(capturedResult).toHaveProperty('filesWithViolationsCount');
      expect(capturedResult).toHaveProperty('violations');

      // Clean project should have no violations
      expect(capturedResult!.success).toBe(true);
      expect(capturedResult!.encapsulationViolationCount).toBe(0);
      expect(capturedResult!.dependencyRuleViolationCount).toBe(0);
      expect(capturedResult!.filesWithViolationsCount).toBe(0);
      expect(capturedResult!.violations).toEqual({});
    });

    it('api.verify() detects dependency rule violations', async () => {
      let capturedResult: VerificationResult | undefined;

      const testPlugin: SheriffPlugin = {
        name: 'violation-detector',
        async execute(_args: string[], api: SheriffPluginAPI): Promise<void> {
          capturedResult = api.verify();
        },
      };

      mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([testPlugin]);

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          modules: {
            'src/customers': ['customers'],
            'src/holidays': ['holidays'],
          },
          depRules: {
            root: ['customers', 'holidays'],
            customers: [],
            holidays: [],
          },
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': ['./holidays', './customers'],
          holidays: {
            'index.ts': ['./holidays.component'],
            'holidays.component.ts': ['../customers'],
          },
          customers: { 'index.ts': [] },
        },
      });

      main('violation-detector');

      await vi.waitFor(() => {
        expect(capturedResult).toBeDefined();
      });

      expect(capturedResult!.success).toBe(false);
      expect(capturedResult!.dependencyRuleViolationCount).toBeGreaterThan(0);
      expect(capturedResult!.filesWithViolationsCount).toBeGreaterThan(0);

      // Violations should have file path keys
      const violationKeys = Object.keys(capturedResult!.violations);
      expect(violationKeys.length).toBeGreaterThan(0);

      // Each violation should have the correct structure
      const firstViolation: FileViolations =
        capturedResult!.violations[violationKeys[0]];
      expect(firstViolation).toHaveProperty('encapsulationViolations');
      expect(firstViolation).toHaveProperty('dependencyRuleViolations');
      expect(Array.isArray(firstViolation.encapsulationViolations)).toBe(true);
      expect(Array.isArray(firstViolation.dependencyRuleViolations)).toBe(true);
    });

    it('api.getProjectData() returns ProjectData structure', async () => {
      let capturedData: ProjectData | undefined;

      const testPlugin: SheriffPlugin = {
        name: 'data-getter',
        async execute(_args: string[], api: SheriffPluginAPI): Promise<void> {
          capturedData = api.getProjectData();
        },
      };

      mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([testPlugin]);

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          modules: {
            'src/customers': ['customers'],
          },
          depRules: {},
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': ['./customers'],
          customers: { 'index.ts': [] },
        },
      });

      main('data-getter');

      await vi.waitFor(() => {
        expect(capturedData).toBeDefined();
      });

      // ProjectData is a Record<string, ProjectDataEntry> - keys are file paths
      const filePaths = Object.keys(capturedData!);
      expect(filePaths.length).toBeGreaterThan(0);

      // Each entry should have ProjectDataEntry structure
      const firstEntry: ProjectDataEntry = capturedData![filePaths[0]];
      expect(firstEntry).toHaveProperty('module');
      expect(firstEntry).toHaveProperty('moduleType');
      expect(firstEntry).toHaveProperty('tags');
      expect(firstEntry).toHaveProperty('imports');

      // Should include the customers module
      const modules = Object.values(capturedData!).map((entry) => entry.module);
      expect(
        modules.some((m) => m.includes('customers') || m === '.'),
      ).toBe(true);
    });

    it('api.getConfig() returns Configuration object', async () => {
      let capturedConfig: Configuration | undefined;

      const testPlugin: SheriffPlugin = {
        name: 'config-reader',
        async execute(_args: string[], api: SheriffPluginAPI): Promise<void> {
          capturedConfig = api.getConfig();
        },
      };

      mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([testPlugin]);

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          modules: {
            'src/shared': ['shared'],
          },
          depRules: {
            '*': ['shared'],
          },
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': [],
          shared: { 'index.ts': [] },
        },
      });

      main('config-reader');

      await vi.waitFor(() => {
        expect(capturedConfig).toBeDefined();
      });

      // Configuration should have expected properties
      expect(capturedConfig).toHaveProperty('modules');
      expect(capturedConfig).toHaveProperty('depRules');
      expect(capturedConfig!.depRules).toHaveProperty('*');
    });

    it('api.log() outputs to stdout', async () => {
      const testPlugin: SheriffPlugin = {
        name: 'logger',
        async execute(_args: string[], api: SheriffPluginAPI): Promise<void> {
          api.log('Hello from plugin!');
          api.log('Second message');
        },
      };

      const { allLogs } = mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([testPlugin]);

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

      main('logger');

      await vi.waitFor(() => {
        expect(allLogs()).toContain('Hello from plugin!');
      });

      expect(allLogs()).toContain('Second message');
    });

    it('api.logError() outputs to stderr', async () => {
      const testPlugin: SheriffPlugin = {
        name: 'error-logger',
        async execute(_args: string[], api: SheriffPluginAPI): Promise<void> {
          api.logError('Something went wrong!');
        },
      };

      const { allErrorLogs } = mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([testPlugin]);

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

      main('error-logger');

      await vi.waitFor(() => {
        expect(allErrorLogs()).toContain('Something went wrong!');
      });
    });
  });

  describe('Plugin receives CLI arguments', () => {
    it('plugin receives arguments passed after plugin name', async () => {
      let capturedArgs: string[] = [];

      const testPlugin: SheriffPlugin = {
        name: 'arg-receiver',
        async execute(args: string[], _api: SheriffPluginAPI): Promise<void> {
          capturedArgs = args;
        },
      };

      mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([testPlugin]);

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

      main('arg-receiver', '--format=xml', '--output=report.xml', 'extra');

      await vi.waitFor(() => {
        expect(capturedArgs).toEqual([
          '--format=xml',
          '--output=report.xml',
          'extra',
        ]);
      });
    });
  });

  describe('Error handling for unknown plugin', () => {
    it('shows help when plugin name not found', () => {
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

      main('unknown-plugin');

      // Should show help since no plugin matches
      expect(allLogs()).toContain('Commands:');
      expect(allLogs()).toContain('sheriff verify');
    });
  });

  describe('Complete plugin workflow', () => {
    it('plugin can verify project and report results', async () => {
      let reportedViolations = 0;

      const reporterPlugin: SheriffPlugin = {
        name: 'reporter',
        description: 'Reports violations',
        async execute(_args: string[], api: SheriffPluginAPI): Promise<void> {
          const result = api.verify();
          reportedViolations = result.dependencyRuleViolationCount;

          if (result.success) {
            api.log('No violations found!');
          } else {
            api.logError(
              `Found ${result.dependencyRuleViolationCount} violations`,
            );
          }
        },
      };

      const { allErrorLogs } = mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([reporterPlugin]);

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          modules: {
            'src/a': ['a'],
            'src/b': ['b'],
          },
          depRules: {
            root: ['a', 'b'],
            a: [],
            b: [],
          },
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': ['./a', './b'],
          a: {
            'index.ts': ['../b'], // Violation: a cannot import b
          },
          b: { 'index.ts': [] },
        },
      });

      main('reporter');

      await vi.waitFor(() => {
        expect(reportedViolations).toBeGreaterThan(0);
      });

      expect(allErrorLogs()).toContain('Found');
      expect(allErrorLogs()).toContain('violations');
    });

    it('plugin can combine verify and getConfig', async () => {
      const foundViolatingModules: string[] = [];

      const analyzerPlugin: SheriffPlugin = {
        name: 'analyzer',
        async execute(_args: string[], api: SheriffPluginAPI): Promise<void> {
          const result = api.verify();
          const config = api.getConfig();

          // Find modules that have violations
          for (const [file, violations] of Object.entries(result.violations)) {
            if (violations.dependencyRuleViolations.length > 0) {
              api.log(`File with violation: ${file}`);
              foundViolatingModules.push(file);
            }
          }

          api.log(`Checked with dep rules: ${JSON.stringify(config.depRules)}`);
        },
      };

      const { allLogs } = mockCli();
      vi.spyOn(getPluginsModule, 'getPlugins').mockReturnValue([analyzerPlugin]);

      createProject({
        'tsconfig.json': tsConfig(),
        'sheriff.config.ts': sheriffConfig({
          modules: {
            'src/feature-a': ['feature-a'],
            'src/feature-b': ['feature-b'],
          },
          depRules: {
            root: ['feature-a', 'feature-b'],
            'feature-a': [],
            'feature-b': [],
          },
          entryFile: 'src/main.ts',
        }),
        src: {
          'main.ts': ['./feature-a', './feature-b'],
          'feature-a': {
            'index.ts': ['../feature-b'],
          },
          'feature-b': { 'index.ts': [] },
        },
      });

      main('analyzer');

      await vi.waitFor(() => {
        expect(foundViolatingModules.length).toBeGreaterThan(0);
      });

      expect(allLogs()).toContain('File with violation:');
      expect(allLogs()).toContain('dep rules');
    });
  });
});
