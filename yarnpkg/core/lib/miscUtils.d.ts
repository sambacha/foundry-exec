/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { PortablePath } from '@yarnpkg/fslib';
import { Readable, Transform } from 'stream';
/**
 * @internal
 */
export declare function isTaggedYarnVersion(version: string | null): boolean;
export declare function escapeRegExp(str: string): string;
export declare function overrideType<T>(val: unknown): asserts val is T;
export declare function assertNever(arg: never): never;
export declare function validateEnum<T>(def: {
    [key: string]: T;
}, value: string): T;
export declare function mapAndFilter<In, Out>(iterable: Iterable<In>, cb: (value: In) => Out | typeof mapAndFilterSkip): Array<Out>;
export declare namespace mapAndFilter {
    var skip: typeof mapAndFilterSkip;
}
declare const mapAndFilterSkip: unique symbol;
export declare function mapAndFind<In, Out>(iterable: Iterable<In>, cb: (value: In) => Out | typeof mapAndFindSkip): Out | undefined;
export declare namespace mapAndFind {
    var skip: typeof mapAndFindSkip;
}
declare const mapAndFindSkip: unique symbol;
export declare function isIndexableObject(value: unknown): value is {
    [key: string]: unknown;
};
export declare type MapValue<T> = T extends Map<any, infer V> ? V : never;
export interface ToMapValue<T extends object> {
    get<K extends keyof T>(key: K): T[K];
}
export declare type MapValueToObjectValue<T> = T extends Map<infer K, infer V> ? (K extends string | number | symbol ? MapValueToObjectValue<Record<K, V>> : never) : T extends ToMapValue<infer V> ? MapValueToObjectValue<V> : T extends PortablePath ? PortablePath : T extends object ? {
    [K in keyof T]: MapValueToObjectValue<T[K]>;
} : T;
export declare function allSettledSafe<T>(promises: Array<Promise<T>>): Promise<T[]>;
/**
 * Converts Maps to indexable objects recursively.
 */
export declare function convertMapsToIndexableObjects<T>(arg: T): MapValueToObjectValue<T>;
export declare function getFactoryWithDefault<K, T>(map: Map<K, T>, key: K, factory: () => T): T;
export declare function getArrayWithDefault<K, T>(map: Map<K, Array<T>>, key: K): T[];
export declare function getSetWithDefault<K, T>(map: Map<K, Set<T>>, key: K): Set<T>;
export declare function getMapWithDefault<K, MK, MV>(map: Map<K, Map<MK, MV>>, key: K): Map<MK, MV>;
export declare function releaseAfterUseAsync<T>(fn: () => Promise<T>, cleanup?: (() => any) | null): Promise<T>;
export declare function prettifyAsyncErrors<T>(fn: () => Promise<T>, update: (message: string) => string): Promise<T>;
export declare function prettifySyncErrors<T>(fn: () => T, update: (message: string) => string): T;
export declare function bufferStream(stream: Readable): Promise<Buffer>;
export declare class BufferStream extends Transform {
    private readonly chunks;
    _transform(chunk: Buffer, encoding: string, cb: any): void;
    _flush(cb: any): void;
}
export declare type Deferred<T = void> = {
    promise: Promise<T>;
    resolve: (val: T) => void;
    reject: (err: Error) => void;
};
export declare function makeDeferred<T = void>(): Deferred<T>;
export declare class AsyncActions {
    private deferred;
    private promises;
    private limit;
    constructor(limit: number);
    set(key: string, factory: () => Promise<void>): Promise<void>;
    reduce(key: string, factory: (action: Promise<void>) => Promise<void>): void;
    wait(): Promise<void>;
}
export declare class DefaultStream extends Transform {
    private readonly ifEmpty;
    active: boolean;
    constructor(ifEmpty?: Buffer);
    _transform(chunk: Buffer, encoding: string, cb: any): void;
    _flush(cb: any): void;
}
export declare enum CachingStrategy {
    NoCache = 0,
    FsTime = 1,
    Node = 2
}
export declare function dynamicRequire(path: string, opts?: {
    cachingStrategy?: CachingStrategy;
}): any;
export declare function dynamicRequire(path: PortablePath, opts: {
    cachingStrategy: CachingStrategy.FsTime;
}): any;
export declare function sortMap<T>(values: Iterable<T>, mappers: ((value: T) => string) | Array<(value: T) => string>): T[];
/**
 * Combines an Array of glob patterns into a regular expression.
 *
 * @param ignorePatterns An array of glob patterns
 *
 * @returns A `string` representing a regular expression or `null` if no glob patterns are provided
 */
export declare function buildIgnorePattern(ignorePatterns: Array<string>): string | null;
export declare function replaceEnvVariables(value: string, { env }: {
    env: {
        [key: string]: string | undefined;
    };
}): string;
export declare function parseBoolean(value: unknown): boolean;
export declare function parseOptionalBoolean(value: unknown): boolean | undefined;
export declare function tryParseOptionalBoolean(value: unknown): boolean | undefined | null;
export declare type FilterKeys<T extends {}, Filter> = {
    [K in keyof T]: T[K] extends Filter ? K : never;
}[keyof T];
export declare function isPathLike(value: string): boolean;
declare type MergeObjects<T extends Array<unknown>, Accumulator> = T extends [infer U, ...infer Rest] ? MergeObjects<Rest, Accumulator & U> : Accumulator;
/**
 * Merges multiple objects into the target argument.
 *
 * **Important:** This function mutates the target argument.
 *
 * Custom classes inside the target parameter are supported (e.g. comment-json's `CommentArray` - comments from target will be preserved).
 *
 * @see toMerged for a version that doesn't mutate the target argument
 *
 */
export declare function mergeIntoTarget<T extends object, S extends Array<object>>(target: T, ...sources: S): MergeObjects<S, T>;
/**
 * Merges multiple objects into a single one, without mutating any arguments.
 *
 * Custom classes are not supported (i.e. comment-json's comments will be lost).
 */
export declare function toMerged<S extends Array<object>>(...sources: S): MergeObjects<S, {}>;
export {};
