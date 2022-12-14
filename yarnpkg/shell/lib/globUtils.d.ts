import { PortablePath, FakeFS } from '@yarnpkg/fslib';
import fastGlob from 'fast-glob';
import micromatch from 'micromatch';
export declare type Glob = {
    isGlobPattern: (pattern: string) => boolean;
    match: (pattern: string, options: {
        cwd: PortablePath;
        baseFs: FakeFS<PortablePath>;
    }) => Promise<Array<string>>;
};
export declare const micromatchOptions: micromatch.Options;
export declare const fastGlobOptions: fastGlob.Options;
/**
 * Decides whether a string is a glob pattern, using micromatch.
 *
 * Required because `fastGlob.isDynamicPattern` doesn't have the `strictBrackets` option.
 */
export declare function isGlobPattern(pattern: string): boolean;
export declare function match(pattern: string, { cwd, baseFs }: {
    cwd: PortablePath;
    baseFs: FakeFS<PortablePath>;
}): Promise<string[]>;
export declare function isBraceExpansion(pattern: string): boolean;
