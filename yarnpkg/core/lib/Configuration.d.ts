/// <reference types="node" />
import { Filename, PortablePath } from '@yarnpkg/fslib';
import { Limit } from 'p-limit';
import { Writable } from 'stream';
import { MultiFetcher } from './MultiFetcher';
import { MultiResolver } from './MultiResolver';
import { Plugin, Hooks } from './Plugin';
import { Report } from './Report';
import { TelemetryManager } from './TelemetryManager';
import * as formatUtils from './formatUtils';
import * as miscUtils from './miscUtils';
import * as nodeUtils from './nodeUtils';
import { IdentHash, Package, Descriptor, PackageExtension } from './types';
export declare const TAG_REGEXP: RegExp;
export declare const ENVIRONMENT_PREFIX = "yarn_";
export declare const DEFAULT_RC_FILENAME: Filename;
export declare const DEFAULT_LOCK_FILENAME: Filename;
export declare const SECRET = "********";
export declare enum SettingsType {
    ANY = "ANY",
    BOOLEAN = "BOOLEAN",
    ABSOLUTE_PATH = "ABSOLUTE_PATH",
    LOCATOR = "LOCATOR",
    LOCATOR_LOOSE = "LOCATOR_LOOSE",
    NUMBER = "NUMBER",
    STRING = "STRING",
    SECRET = "SECRET",
    SHAPE = "SHAPE",
    MAP = "MAP"
}
export declare type SupportedArchitectures = {
    os: Array<string> | null;
    cpu: Array<string> | null;
    libc: Array<string> | null;
};
export declare type FormatType = formatUtils.Type;
export declare const FormatType: {
    readonly NO_HINT: "NO_HINT";
    readonly NULL: "NULL";
    readonly SCOPE: "SCOPE";
    readonly NAME: "NAME";
    readonly RANGE: "RANGE";
    readonly REFERENCE: "REFERENCE";
    readonly NUMBER: "NUMBER";
    readonly PATH: "PATH";
    readonly URL: "URL";
    readonly ADDED: "ADDED";
    readonly REMOVED: "REMOVED";
    readonly CODE: "CODE";
    readonly DURATION: "DURATION";
    readonly SIZE: "SIZE";
    readonly IDENT: "IDENT";
    readonly DESCRIPTOR: "DESCRIPTOR";
    readonly LOCATOR: "LOCATOR";
    readonly RESOLUTION: "RESOLUTION";
    readonly DEPENDENT: "DEPENDENT";
    readonly PACKAGE_EXTENSION: "PACKAGE_EXTENSION";
    readonly SETTING: "SETTING";
    readonly MARKDOWN: "MARKDOWN";
};
export declare type BaseSettingsDefinition<T extends SettingsType = SettingsType> = {
    description: string;
    type: T;
} & ({
    isArray?: false;
} | {
    isArray: true;
    concatenateValues?: boolean;
});
export declare type ShapeSettingsDefinition = BaseSettingsDefinition<SettingsType.SHAPE> & {
    properties: {
        [propertyName: string]: SettingsDefinition;
    };
};
export declare type MapSettingsDefinition = BaseSettingsDefinition<SettingsType.MAP> & {
    valueDefinition: SettingsDefinitionNoDefault;
    normalizeKeys?: (key: string) => string;
};
export declare type SimpleSettingsDefinition = BaseSettingsDefinition<Exclude<SettingsType, SettingsType.SHAPE | SettingsType.MAP>> & {
    default: any;
    defaultText?: any;
    isNullable?: boolean;
    values?: Array<any>;
};
export declare type SettingsDefinitionNoDefault = MapSettingsDefinition | ShapeSettingsDefinition | Omit<SimpleSettingsDefinition, 'default'>;
export declare type SettingsDefinition = MapSettingsDefinition | ShapeSettingsDefinition | SimpleSettingsDefinition;
export declare type PluginConfiguration = {
    modules: Map<string, any>;
    plugins: Set<string>;
};
export declare const coreDefinitions: {
    [coreSettingName: string]: SettingsDefinition;
};
export interface ConfigurationValueMap {
    lastUpdateCheck: string | null;
    yarnPath: PortablePath | null;
    ignorePath: boolean;
    ignoreCwd: boolean;
    cacheKeyOverride: string | null;
    globalFolder: PortablePath;
    cacheFolder: PortablePath;
    compressionLevel: `mixed` | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    virtualFolder: PortablePath;
    lockfileFilename: Filename;
    installStatePath: PortablePath;
    immutablePatterns: Array<string>;
    rcFilename: Filename;
    enableGlobalCache: boolean;
    enableColors: boolean;
    enableHyperlinks: boolean;
    enableInlineBuilds: boolean;
    enableProgressBars: boolean;
    enableTimers: boolean;
    preferAggregateCacheInfo: boolean;
    preferInteractive: boolean;
    preferTruncatedLines: boolean;
    progressBarStyle: string | undefined;
    defaultLanguageName: string;
    defaultProtocol: string;
    enableTransparentWorkspaces: boolean;
    supportedArchitectures: miscUtils.ToMapValue<SupportedArchitectures>;
    enableMirror: boolean;
    enableNetwork: boolean;
    httpProxy: string | null;
    httpsProxy: string | null;
    unsafeHttpWhitelist: Array<string>;
    httpTimeout: number;
    httpRetry: number;
    networkConcurrency: number;
    networkSettings: Map<string, miscUtils.ToMapValue<{
        httpsCaFilePath: PortablePath | null;
        enableNetwork: boolean | null;
        httpProxy: string | null;
        httpsProxy: string | null;
        httpsKeyFilePath: PortablePath | null;
        httpsCertFilePath: PortablePath | null;
    }>>;
    httpsCaFilePath: PortablePath | null;
    httpsKeyFilePath: PortablePath | null;
    httpsCertFilePath: PortablePath | null;
    enableStrictSsl: boolean;
    logFilters: Array<miscUtils.ToMapValue<{
        code?: string;
        text?: string;
        pattern?: string;
        level?: formatUtils.LogLevel | null;
    }>>;
    enableTelemetry: boolean;
    telemetryInterval: number;
    telemetryUserId: string | null;
    enableHardenedMode: boolean;
    enableScripts: boolean;
    enableStrictSettings: boolean;
    enableImmutableCache: boolean;
    checksumBehavior: string;
    packageExtensions: Map<string, miscUtils.ToMapValue<{
        dependencies?: Map<string, string>;
        peerDependencies?: Map<string, string>;
        peerDependenciesMeta?: Map<string, miscUtils.ToMapValue<{
            optional?: boolean;
        }>>;
    }>>;
}
export declare type PackageExtensionData = miscUtils.MapValueToObjectValue<miscUtils.MapValue<ConfigurationValueMap['packageExtensions']>>;
declare type SimpleDefinitionForType<T> = SimpleSettingsDefinition & {
    type: (T extends boolean ? SettingsType.BOOLEAN : never) | (T extends number ? SettingsType.NUMBER : never) | (T extends PortablePath ? SettingsType.ABSOLUTE_PATH : never) | (T extends string ? SettingsType.LOCATOR | SettingsType.LOCATOR_LOOSE | SettingsType.SECRET | SettingsType.STRING : never) | SettingsType.ANY;
};
declare type DefinitionForTypeHelper<T> = T extends Map<string, infer U> ? (MapSettingsDefinition & {
    valueDefinition: Omit<DefinitionForType<U>, 'default'>;
}) : T extends miscUtils.ToMapValue<infer U> ? (ShapeSettingsDefinition & {
    properties: ConfigurationDefinitionMap<U>;
}) : SimpleDefinitionForType<T>;
declare type DefinitionForType<T> = T extends Array<infer U> ? (DefinitionForTypeHelper<U> & {
    isArray: true;
}) : (DefinitionForTypeHelper<T> & {
    isArray?: false;
});
export declare type ConfigurationDefinitionMap<V = ConfigurationValueMap> = {
    [K in keyof V]: DefinitionForType<V[K]>;
};
declare type SettingTransforms = {
    hideSecrets: boolean;
    getNativePaths: boolean;
};
export declare enum ProjectLookup {
    LOCKFILE = 0,
    MANIFEST = 1,
    NONE = 2
}
export declare type FindProjectOptions = {
    lookup?: ProjectLookup;
    strict?: boolean;
    usePath?: boolean;
    useRc?: boolean;
};
export declare class Configuration {
    static deleteProperty: symbol;
    static telemetry: TelemetryManager | null;
    startingCwd: PortablePath;
    projectCwd: PortablePath | null;
    plugins: Map<string, Plugin>;
    settings: Map<string, SettingsDefinition>;
    values: Map<string, any>;
    sources: Map<string, string>;
    invalid: Map<string, string>;
    packageExtensions: Map<IdentHash, Array<[string, Array<PackageExtension>]>>;
    limits: Map<string, Limit>;
    /**
     * Instantiate a new configuration object with the default values from the
     * core. You typically don't want to use this, as it will ignore the values
     * configured in the rc files. Instead, prefer to use `Configuration#find`.
     */
    static create(startingCwd: PortablePath, plugins?: Map<string, Plugin>): Configuration;
    static create(startingCwd: PortablePath, projectCwd: PortablePath | null, plugins?: Map<string, Plugin>): Configuration;
    /**
     * Instantiate a new configuration object exposing the configuration obtained
     * from reading the various rc files and the environment settings.
     *
     * The `pluginConfiguration` parameter is expected to indicate:
     *
     * 1. which modules should be made available to plugins when they require a
     *    package (this is the dynamic linking part - for example we want all the
     *    plugins to use the exact same version of @yarnpkg/core, which also is the
     *    version used by the running Yarn instance).
     *
     * 2. which of those modules are actually plugins that need to be injected
     *    within the configuration.
     *
     * Note that some extra plugins will be automatically added based on the
     * content of the rc files - with the rc plugins taking precedence over
     * the other ones.
     *
     * One particularity: the plugin initialization order is quite strict, with
     * plugins listed in /foo/bar/.yarnrc.yml taking precedence over plugins
     * listed in /foo/.yarnrc.yml and /.yarnrc.yml. Additionally, while plugins
     * can depend on one another, they can only depend on plugins that have been
     * instantiated before them (so a plugin listed in /foo/.yarnrc.yml can
     * depend on another one listed on /foo/bar/.yarnrc.yml, but not the other
     * way around).
     */
    static find(startingCwd: PortablePath, pluginConfiguration: PluginConfiguration | null, { lookup, strict, usePath, useRc }?: FindProjectOptions): Promise<Configuration>;
    static findRcFiles(startingCwd: PortablePath): Promise<{
        path: PortablePath;
        cwd: PortablePath;
        data: any;
        strict?: boolean | undefined;
    }[]>;
    static findHomeRcFile(): Promise<{
        path: PortablePath;
        cwd: PortablePath;
        data: any;
    } | null>;
    static findProjectCwd(startingCwd: PortablePath, lockfileFilename: Filename | null): Promise<PortablePath | null>;
    static updateConfiguration(cwd: PortablePath, patch: {
        [key: string]: ((current: unknown) => unknown) | {} | undefined;
    } | ((current: {
        [key: string]: unknown;
    }) => {
        [key: string]: unknown;
    })): Promise<void>;
    static updateHomeConfiguration(patch: {
        [key: string]: ((current: unknown) => unknown) | {} | undefined;
    } | ((current: {
        [key: string]: unknown;
    }) => {
        [key: string]: unknown;
    })): Promise<void>;
    private constructor();
    activatePlugin(name: string, plugin: Plugin): void;
    private importSettings;
    useWithSource(source: string, data: {
        [key: string]: unknown;
    }, folder: PortablePath, opts?: {
        strict?: boolean;
        overwrite?: boolean;
    }): void;
    use(source: string, data: {
        [key: string]: unknown;
    }, folder: PortablePath, { strict, overwrite }?: {
        strict?: boolean;
        overwrite?: boolean;
    }): void;
    get<K extends keyof ConfigurationValueMap>(key: K): ConfigurationValueMap[K];
    get(key: string): unknown;
    getSpecial<T = any>(key: string, { hideSecrets, getNativePaths }: Partial<SettingTransforms>): T;
    getSubprocessStreams(logFile: PortablePath, { header, prefix, report }: {
        header?: string;
        prefix: string;
        report: Report;
    }): {
        stdout: Writable;
        stderr: Writable;
    };
    makeResolver(): MultiResolver;
    makeFetcher(): MultiFetcher;
    getLinkers(): import("./Linker").Linker[];
    getSupportedArchitectures(): nodeUtils.ArchitectureSet;
    refreshPackageExtensions(): Promise<void>;
    normalizeDependency(dependency: Descriptor): Descriptor;
    normalizeDependencyMap<TKey>(dependencyMap: Map<TKey, Descriptor>): Map<TKey, Descriptor>;
    normalizePackage(original: Package): Package;
    getLimit<K extends miscUtils.FilterKeys<ConfigurationValueMap, number>>(key: K): Limit;
    triggerHook<U extends Array<any>, V, HooksDefinition = Hooks>(get: (hooks: HooksDefinition) => ((...args: U) => V) | undefined, ...args: U): Promise<void>;
    triggerMultipleHooks<U extends Array<any>, V, HooksDefinition = Hooks>(get: (hooks: HooksDefinition) => ((...args: U) => V) | undefined, argsList: Array<U>): Promise<void>;
    reduceHook<U extends Array<any>, V, HooksDefinition = Hooks>(get: (hooks: HooksDefinition) => ((reduced: V, ...args: U) => Promise<V>) | undefined, initialValue: V, ...args: U): Promise<V>;
    firstHook<U extends Array<any>, V, HooksDefinition = Hooks>(get: (hooks: HooksDefinition) => ((...args: U) => Promise<V>) | undefined, ...args: U): Promise<Exclude<V, void> | null>;
}
export {};
