import { Plugin } from '@yarnpkg/core';
import { ExecEnv } from './ExecFetcher';
import * as execUtils from './execUtils';
export type { ExecEnv };
export { execUtils };
declare const plugin: Plugin;
export default plugin;
