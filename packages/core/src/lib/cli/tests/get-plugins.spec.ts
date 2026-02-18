import { describe, expect, it } from 'vitest';
import { createProject } from '../../test/project-creator';
import { tsConfig } from '../../test/fixtures/ts-config';
import { sheriffConfig } from '../../test/project-configurator';
import { getPlugins } from '../internal/get-plugins';
import { PluginInvalidError } from '../../error/user-error';

describe('getPlugins', () => {
  it('should return empty array when sheriff.config.ts does not exist', () => {
    createProject({
      'tsconfig.json': tsConfig(),
      src: {
        'main.ts': [],
      },
    });

    const plugins = getPlugins();

    expect(plugins).toEqual([]);
  });

  it('should return empty array when plugins property is undefined', () => {
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

    const plugins = getPlugins();

    expect(plugins).toEqual([]);
  });

  it('should return plugins array from config', () => {
    createProject({
      'tsconfig.json': tsConfig(),
      'sheriff.config.ts': `
        class ReporterPlugin {
          name = 'reporter';
          description = 'Generate reports';

          async execute(): Promise<void> {}
        }

        class AnalyzerPlugin {
          name = 'analyzer';

          async execute(): Promise<void> {}
        }

        export const config = {
          depRules: {},
          entryFile: 'src/main.ts',
          plugins: [new ReporterPlugin(), new AnalyzerPlugin()]
        };
      `,
      src: {
        'main.ts': [],
      },
    });

    const plugins = getPlugins();

    expect(plugins).toHaveLength(2);
    expect(plugins[0].name).toBe('reporter');
    expect(plugins[0].description).toBe('Generate reports');
    expect(plugins[1].name).toBe('analyzer');
    expect(plugins[1].description).toBeUndefined();
  });

  it('should return empty array when plugins array is empty', () => {
    createProject({
      'tsconfig.json': tsConfig(),
      'sheriff.config.ts': sheriffConfig({
        depRules: {},
        entryFile: 'src/main.ts',
        plugins: [],
      }),
      src: {
        'main.ts': [],
      },
    });

    const plugins = getPlugins();

    expect(plugins).toEqual([]);
  });

  it('should handle config with plugins and without entryFile', () => {
    createProject({
      'tsconfig.json': tsConfig(),
      'sheriff.config.ts': `
        class JunitPlugin {
          name = 'junit';

          async execute(): Promise<void> {}
        }

        export const config = {
          depRules: {},
          plugins: [new JunitPlugin()]
        };
      `,
      src: {
        'main.ts': [],
      },
    });

    const plugins = getPlugins();

    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe('junit');
  });

  it('should throw when sheriff.config.ts cannot be parsed', () => {
    createProject({
      'tsconfig.json': tsConfig(),
      'sheriff.config.ts': 'export const config = ;',
      src: {
        'main.ts': [],
      },
    });

    expect(() => getPlugins()).toThrow();
  });

  it('should throw PluginInvalidError for malformed plugin entries', () => {
    createProject({
      'tsconfig.json': tsConfig(),
      'sheriff.config.ts': `
        export const config = {
          depRules: {},
          entryFile: 'src/main.ts',
          plugins: [null as any]
        };
      `,
      src: {
        'main.ts': [],
      },
    });

    expect(() => getPlugins()).toThrow(PluginInvalidError);
  });
});
