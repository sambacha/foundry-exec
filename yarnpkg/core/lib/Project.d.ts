import { PortablePath } from '@yarnpkg/fslib';
import { Cache } from './Cache';
import { Configuration } from './Configuration';
import { Fetcher } from './Fetcher';
import { DependencyMeta } from './Manifest';
import { Report } from './Report';
import { ResolveOptions, Resolver } from './Resolver';
import { Workspace } from './Workspace';
import { Descriptor, Ident, Locator, Package } from './types';
import { IdentHash, DescriptorHash, LocatorHash } from './types';
export declare enum InstallMode {
    /**
     * Doesn't run the link step, and only fetches what's necessary to compute
     * an updated lockfile.
     */
    UpdateLockfile = "update-lockfile",
    /**
     * Don't run the build scripts.
     */
    SkipBuild = "skip-build"
}
export declare type InstallOptions = {
    /**
     * Instance of the cache that the project will use when packages have to be
     * fetched. Some fetches may occur even during the resolution, for example
     * when resolving git packages.
     */
    cache: Cache;
    /**
     * An optional override for the default fetching pipeline. This is for
     * overrides only - if you need to _add_ resolvers, prefer adding them
     * through regular plugins instead.
     */
    fetcher?: Fetcher;
    /**
     * An optional override for the default resolution pipeline. This is for
     * overrides only - if you need to _add_ resolvers, prefer adding them
     * through regular plugins instead.
     */
    resolver?: Resolver;
    /**
     * Provide a report instance that'll be use to store the information emitted
     * during the install process.
     */
    report: Report;
    /**
     * If true, Yarn will check that the lockfile won't change after the
     * resolution step. Additionally, after the link step, Yarn will retrieve
     * the list of files in `immutablePatterns` and check that they didn't get
     * modified either.
     */
    immutable?: boolean;
    /**
     * If true, Yarn will exclusively use the lockfile metadata. Setting this
     * flag will cause it to ignore any change in the manifests, and to abort
     * if any dependency isn't present in the lockfile.
     */
    lockfileOnly?: boolean;
    /**
     * If true, Yarn will check that the pre-existing resolutions found in the
     * lockfile are coherent with the ranges that depend on them.
     */
    checkResolutions?: boolean;
    /**
     * Changes which artifacts are generated during the install. Check the
     * enumeration documentation for details.
     */
    mode?: InstallMode;
    /**
     * If true (the default), Yarn will update the workspace manifests once the
     * install has completed.
     */
    persistProject?: boolean;
};
declare const INSTALL_STATE_FIELDS: {
    restoreLinkersCustomData: readonly ["linkersCustomData"];
    restoreResolutions: readonly ["accessibleLocators", "conditionalLocators", "disabledLocators", "optionalBuilds", "storedDescriptors", "storedResolutions", "storedPackages", "lockFileChecksum"];
    restoreBuildState: readonly ["storedBuildState"];
};
declare type RestoreInstallStateOpts = {
    [key in keyof typeof INSTALL_STATE_FIELDS]?: boolean;
};
export declare type PeerRequirement = {
    subject: LocatorHash;
    requested: Ident;
    rootRequester: LocatorHash;
    allRequesters: Array<LocatorHash>;
};
export declare class Project {
    readonly configuration: Configuration;
    readonly cwd: PortablePath;
    /**
     * Is meant to be populated by the consumer. Should the descriptor referenced
     * by the key be requested, the descriptor referenced in the value will be
     * resolved instead. The resolved data will then be used as final resolution
     * for the initial descriptor.
     *
     * Note that the lockfile will contain the second descriptor but not the
     * first one (meaning that if you remove the alias during a subsequent
     * install, it'll be lost and the real package will be resolved / installed).
     */
    resolutionAliases: Map<DescriptorHash, DescriptorHash>;
    workspaces: Array<Workspace>;
    workspacesByCwd: Map<PortablePath, Workspace>;
    workspacesByIdent: Map<IdentHash, Workspace>;
    storedResolutions: Map<DescriptorHash, LocatorHash>;
    storedDescriptors: Map<DescriptorHash, Descriptor>;
    storedPackages: Map<LocatorHash, Package>;
    storedChecksums: Map<LocatorHash, string>;
    storedBuildState: Map<LocatorHash, string>;
    accessibleLocators: Set<LocatorHash>;
    conditionalLocators: Set<LocatorHash>;
    disabledLocators: Set<LocatorHash>;
    originalPackages: Map<LocatorHash, Package>;
    optionalBuilds: Set<LocatorHash>;
    /**
     * If true, the data contained within `originalPackages` are from a different
     * lockfile version and need to be refreshed.
     */
    lockfileNeedsRefresh: boolean;
    /**
     * Populated by the `resolveEverything` method.
     * *Not* stored inside the install state.
     *
     * The map keys are 6 hexadecimal characters except the first one, always `p`.
     */
    peerRequirements: Map<string, PeerRequirement>;
    /**
     * Contains whatever data the linkers (cf `Linker.ts`) want to persist
     * from an install to another.
     */
    linkersCustomData: Map<string, unknown>;
    /**
     * Those checksums are used to detect whether the relevant files actually
     * changed since we last read them (to skip part of their generation).
     */
    lockFileChecksum: string | null;
    installStateChecksum: string | null;
    static find(configuration: Configuration, startingCwd: PortablePath): Promise<{
        project: Project;
        workspace: Workspace | null;
        locator: Locator;
    }>;
    constructor(projectCwd: PortablePath, { configuration }: {
        configuration: Configuration;
    });
    private setupResolutions;
    private setupWorkspaces;
    private addWorkspace;
    get topLevelWorkspace(): Workspace;
    tryWorkspaceByCwd(workspaceCwd: PortablePath): Workspace | null;
    getWorkspaceByCwd(workspaceCwd: PortablePath): Workspace;
    tryWorkspaceByFilePath(filePath: PortablePath): Workspace | null;
    getWorkspaceByFilePath(filePath: PortablePath): Workspace;
    tryWorkspaceByIdent(ident: Ident): Workspace | null;
    getWorkspaceByIdent(ident: Ident): Workspace;
    tryWorkspaceByDescriptor(descriptor: Descriptor): Workspace | null;
    getWorkspaceByDescriptor(descriptor: Descriptor): Workspace;
    tryWorkspaceByLocator(locator: Locator): Workspace | null;
    getWorkspaceByLocator(locator: Locator): Workspace;
    /**
     * Import the dependencies of each resolved workspace into their own
     * `Workspace` instance.
     */
    private refreshWorkspaceDependencies;
    forgetResolution(descriptor: Descriptor): void;
    forgetResolution(locator: Locator): void;
    forgetTransientResolutions(): void;
    forgetVirtualResolutions(): void;
    getDependencyMeta(ident: Ident, version: string | null): DependencyMeta;
    findLocatorForLocation(cwd: PortablePath, { strict }?: {
        strict?: boolean;
    }): Promise<Locator | null>;
    preparePackage(originalPkg: Package, { resolver, resolveOptions }: {
        resolver: Resolver;
        resolveOptions: ResolveOptions;
    }): Promise<Package>;
    resolveEverything(opts: Pick<InstallOptions, `report` | `resolver` | `checkResolutions` | `mode`> & ({
        report: Report;
        lockfileOnly: true;
    } | {
        lockfileOnly?: boolean;
        cache: Cache;
    })): Promise<void>;
    fetchEverything({ cache, report, fetcher: userFetcher, mode }: InstallOptions): Promise<void>;
    linkEverything({ cache, report, fetcher: optFetcher, mode }: InstallOptions): Promise<void>;
    install(opts: InstallOptions): Promise<void>;
    generateLockfile(): string;
    persistLockfile(): Promise<void>;
    persistInstallStateFile(): Promise<void>;
    restoreInstallState({ restoreLinkersCustomData, restoreResolutions, restoreBuildState }?: RestoreInstallStateOpts): Promise<void>;
    applyLightResolution(): Promise<void>;
    persist(): Promise<void>;
    cacheCleanup({ cache, report }: InstallOptions): Promise<void>;
}
export {};
