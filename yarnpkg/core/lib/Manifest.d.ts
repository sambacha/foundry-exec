import { FakeFS, Filename, PortablePath } from '@yarnpkg/fslib';
import { Resolution } from '@yarnpkg/parsers';
import { Ident, Descriptor } from './types';
import { IdentHash } from './types';
export declare type AllDependencies = 'dependencies' | 'devDependencies' | 'peerDependencies';
export declare type HardDependencies = 'dependencies' | 'devDependencies';
export interface WorkspaceDefinition {
    pattern: string;
}
export interface DependencyMeta {
    built?: boolean;
    optional?: boolean;
    unplugged?: boolean;
}
export interface PeerDependencyMeta {
    optional?: boolean;
}
export interface PublishConfig {
    access?: string;
    main?: PortablePath;
    module?: PortablePath;
    type?: string;
    browser?: PortablePath | Map<PortablePath, boolean | PortablePath>;
    bin?: Map<string, PortablePath>;
    registry?: string;
    executableFiles?: Set<PortablePath>;
}
export interface InstallConfig {
    hoistingLimits?: string;
    selfReferences?: boolean;
}
export declare class Manifest {
    indent: string;
    name: Ident | null;
    version: string | null;
    os: Array<string> | null;
    cpu: Array<string> | null;
    libc: Array<string> | null;
    type: string | null;
    packageManager: string | null;
    ["private"]: boolean;
    license: string | null;
    main: PortablePath | null;
    module: PortablePath | null;
    browser: PortablePath | Map<PortablePath, boolean | PortablePath> | null;
    languageName: string | null;
    bin: Map<string, PortablePath>;
    scripts: Map<string, string>;
    dependencies: Map<IdentHash, Descriptor>;
    devDependencies: Map<IdentHash, Descriptor>;
    peerDependencies: Map<IdentHash, Descriptor>;
    workspaceDefinitions: Array<WorkspaceDefinition>;
    dependenciesMeta: Map<string, Map<string | null, DependencyMeta>>;
    peerDependenciesMeta: Map<string, PeerDependencyMeta>;
    resolutions: Array<{
        pattern: Resolution;
        reference: string;
    }>;
    files: Set<PortablePath> | null;
    publishConfig: PublishConfig | null;
    installConfig: InstallConfig | null;
    preferUnplugged: boolean | null;
    raw: {
        [key: string]: any;
    };
    /**
     * errors found in the raw manifest while loading
     */
    errors: Array<Error>;
    static readonly fileName: Filename;
    static readonly allDependencies: Array<AllDependencies>;
    static readonly hardDependencies: Array<HardDependencies>;
    static tryFind(path: PortablePath, { baseFs }?: {
        baseFs?: FakeFS<PortablePath>;
    }): Promise<Manifest | null>;
    static find(path: PortablePath, { baseFs }?: {
        baseFs?: FakeFS<PortablePath>;
    }): Promise<Manifest>;
    static fromFile(path: PortablePath, { baseFs }?: {
        baseFs?: FakeFS<PortablePath>;
    }): Promise<Manifest>;
    static fromText(text: string): Manifest;
    loadFromText(text: string): void;
    loadFile(path: PortablePath, { baseFs }: {
        baseFs?: FakeFS<PortablePath>;
    }): Promise<void>;
    load(data: any, { yamlCompatibilityMode }?: {
        yamlCompatibilityMode?: boolean;
    }): void;
    getForScope(type: string): Map<IdentHash, Descriptor>;
    hasConsumerDependency(ident: Ident): boolean;
    hasHardDependency(ident: Ident): boolean;
    hasSoftDependency(ident: Ident): boolean;
    hasDependency(ident: Ident): boolean;
    getConditions(): string | null;
    ensureDependencyMeta(descriptor: Descriptor): DependencyMeta;
    ensurePeerDependencyMeta(descriptor: Descriptor): PeerDependencyMeta;
    setRawField(name: string, value: any, { after }?: {
        after?: Array<string>;
    }): void;
    exportTo(data: {
        [key: string]: any;
    }, { compatibilityMode }?: {
        compatibilityMode?: boolean;
    }): {
        [key: string]: any;
    };
}
