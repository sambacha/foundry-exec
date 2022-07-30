import { Resolver, ResolveOptions, MinimalResolveOptions } from '@yarnpkg/core';
import { Descriptor, Locator, Package } from '@yarnpkg/core';
import { LinkType } from '@yarnpkg/core';
export declare class ExecResolver implements Resolver {
    supportsDescriptor(descriptor: Descriptor, opts: MinimalResolveOptions): boolean;
    supportsLocator(locator: Locator, opts: MinimalResolveOptions): boolean;
    shouldPersistResolution(locator: Locator, opts: MinimalResolveOptions): boolean;
    bindDescriptor(descriptor: Descriptor, fromLocator: Locator, opts: MinimalResolveOptions): Descriptor;
    getResolutionDependencies(descriptor: Descriptor, opts: MinimalResolveOptions): {};
    getCandidates(descriptor: Descriptor, dependencies: Record<string, Package>, opts: ResolveOptions): Promise<Locator[]>;
    getSatisfying(descriptor: Descriptor, dependencies: Record<string, Package>, locators: Array<Locator>, opts: ResolveOptions): Promise<{
        locators: Locator[];
        sorted: boolean;
    }>;
    resolve(locator: Locator, opts: ResolveOptions): Promise<{
        version: string;
        languageName: string;
        linkType: LinkType;
        conditions: string | null;
        dependencies: Map<import("@yarnpkg/core").IdentHash, Descriptor>;
        peerDependencies: Map<import("@yarnpkg/core").IdentHash, Descriptor>;
        dependenciesMeta: Map<string, Map<string | null, import("@yarnpkg/core").DependencyMeta>>;
        peerDependenciesMeta: Map<string, import("@yarnpkg/core").PeerDependencyMeta>;
        bin: Map<string, import("@yarnpkg/fslib").PortablePath>;
        locatorHash: import("@yarnpkg/core").LocatorHash;
        reference: string;
        identHash: import("@yarnpkg/core").IdentHash;
        scope: string | null;
        name: string;
    }>;
}
