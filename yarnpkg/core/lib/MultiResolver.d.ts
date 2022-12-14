import { Resolver, ResolveOptions, MinimalResolveOptions } from './Resolver';
import { Descriptor, Locator, Package } from './types';
export declare class MultiResolver implements Resolver {
    private readonly resolvers;
    constructor(resolvers: Array<Resolver | null>);
    supportsDescriptor(descriptor: Descriptor, opts: MinimalResolveOptions): boolean;
    supportsLocator(locator: Locator, opts: MinimalResolveOptions): boolean;
    shouldPersistResolution(locator: Locator, opts: MinimalResolveOptions): boolean;
    bindDescriptor(descriptor: Descriptor, fromLocator: Locator, opts: MinimalResolveOptions): Descriptor;
    getResolutionDependencies(descriptor: Descriptor, opts: MinimalResolveOptions): Record<string, Descriptor>;
    getCandidates(descriptor: Descriptor, dependencies: Record<string, Package>, opts: ResolveOptions): Promise<Locator[]>;
    getSatisfying(descriptor: Descriptor, dependencies: Record<string, Package>, locators: Array<Locator>, opts: ResolveOptions): Promise<{
        locators: Locator[];
        sorted: boolean;
    }>;
    resolve(locator: Locator, opts: ResolveOptions): Promise<Package>;
    private tryResolverByDescriptor;
    private getResolverByDescriptor;
    private tryResolverByLocator;
    private getResolverByLocator;
}
