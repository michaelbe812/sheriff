import { UserSheriffConfig } from './user-sheriff-config';
import { SheriffPlugin } from '../plugin/plugin';

export type Configuration = Required<
  Omit<
    UserSheriffConfig,
    | 'tagging'
    | 'showWarningOnBarrelCollision'
    | 'encapsulatedFolderNameForBarrelLess'
    | 'entryPoints'
    | 'plugins'
  >
> & {
  // dependency rules will skip if `isConfigFileMissing` is true
  isConfigFileMissing: boolean;
  /**
   * entryPoints is the merger of the entry file and the entry points
   * from the user's config
   */
  entryPoints?: Record<string, string>;
  // ignoreFileExtensions is always present (either user-specified or default)
  ignoreFileExtensions: string[];
  // plugins remain optional - they extend Sheriff with custom CLI commands
  plugins?: SheriffPlugin[];
};
