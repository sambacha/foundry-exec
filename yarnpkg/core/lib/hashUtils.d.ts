/// <reference types="node" />
import { PortablePath, FakeFS } from '@yarnpkg/fslib';
import { BinaryLike } from 'crypto';
export declare function makeHash<T extends string = string>(...args: Array<BinaryLike | null>): T;
export declare function checksumFile(path: PortablePath, { baseFs, algorithm }?: {
    baseFs: FakeFS<PortablePath>;
    algorithm: string;
}): Promise<string>;
export declare function checksumPattern(pattern: string, { cwd }: {
    cwd: PortablePath;
}): Promise<string>;
