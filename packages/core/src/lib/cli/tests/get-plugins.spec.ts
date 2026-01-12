import { describe, expect, it } from 'vitest';
import { createProject } from '../../test/project-creator';
import { tsConfig } from '../../test/fixtures/ts-config';
import { sheriffConfig } from '../../test/project-configurator';
import { getPlugins } from '../internal/get-plugins';
import { SheriffPlugin } from '../../plugin/plugin';
import { SheriffPluginAPI } from '../../plugin/plugin-api';

// Mock plugin for testing
const createMockPlugin = (name: string, description?: string): SheriffPlugin => ({
  name,
  description,
  execute: async (_args: string[], _api: SheriffPluginAPI): Promise<void> => {
    // No-op for testing
  },
});

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
    const mockPlugin1 = createMockPlugin('reporter', 'Generate reports');
    const mockPlugin2 = createMockPlugin('analyzer');

    createProject({
      'tsconfig.json': tsConfig(),
      'sheriff.config.ts': sheriffConfig({
        depRules: {},
        entryFile: 'src/main.ts',
        plugins: [mockPlugin1, mockPlugin2],
      }),
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

  it('should handle config with only plugins (no entryFile)', () => {
    const mockPlugin = createMockPlugin('junit');

    createProject({
      'tsconfig.json': tsConfig(),
      'sheriff.config.ts': sheriffConfig({
        depRules: {},
        entryFile: 'src/main.ts',
        plugins: [mockPlugin],
      }),
      src: {
        'main.ts': [],
      },
    });

    const plugins = getPlugins();

    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe('junit');
  });
});
