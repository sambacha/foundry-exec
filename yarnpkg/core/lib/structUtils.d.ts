/// <reference types="node" />
import { PortablePath } from '@yarnpkg/fslib';
import querystring from 'querystring';
import { Configuration } from './Configuration';
import { Workspace } from './Workspace';
import * as nodeUtils from './nodeUtils';
import { Ident, Descriptor, Locator, Package } from './types';
/**
 * Creates a package ident.
 *
 * @param scope The package scope without the `@` prefix (eg. `types`)
 * @param name The name of the package
 */
export declare function makeIdent(scope: string | null, name: string): Ident;
/**
 * Creates a package descriptor.
 *
 * @param ident The base ident (see `makeIdent`)
 * @param range The range to attach (eg. `^1.0.0`)
 */
export declare function makeDescriptor(ident: Ident, range: string): Descriptor;
/**
 * Creates a package locator.
 *
 * @param ident The base ident (see `makeIdent`)
 * @param range The reference to attach (eg. `1.0.0`)
 */
export declare function makeLocator(ident: Ident, reference: string): Locator;
/**
 * Turns a compatible source to an ident. You won't really have to use this
 * function since by virtue of structural inheritance all descriptors and
 * locators are already valid idents.
 *
 * This function is only useful if you absolutely need to remove the non-ident
 * fields from a structure before storing it somewhere.
 *
 * @param source The data structure to convert into an ident.
 */
export declare function convertToIdent(source: Descriptor | Locator | Package): Ident;
/**
 * Turns a descriptor into a locator.
 *
 * Note that this process may be unsafe, as descriptors may reference multiple
 * packages, putting them at odd with locators' expected semantic. Only makes
 * sense when used with single-resolution protocols, for instance `file:`.
 *
 * @param descriptor The descriptor to convert into a locator.
 */
export declare function convertDescriptorToLocator(descriptor: Descriptor): Locator;
/**
 * Turns a locator into a descriptor.
 *
 * This should be safe to do regardless of the locator, since all locator
 * references are expected to be valid descriptor ranges.
 *
 * @param locator The locator to convert into a descriptor.
 */
export declare function convertLocatorToDescriptor(locator: Locator): Descriptor;
/**
 * Turns a package structure into a simple locator. You won't often need to
 * call this function since packages are already valid locators by virtue of
 * structural inheritance.
 *
 * This function is only useful if you absolutely need to remove the
 * non-locator fields from a structure before storing it somewhere.
 *
 * @param pkg The package to convert into a locator.
 */
export declare function convertPackageToLocator(pkg: Package): Locator;
/**
 * Deep copies a package then change its locator to something else.
 *
 * @param pkg The source package
 * @param locator Its new new locator
 */
export declare function renamePackage(pkg: Package, locator: Locator): Package;
/**
 * Deep copies a package. The copy will share the same locator as the original.
 *
 * @param pkg The source package
 */
export declare function copyPackage(pkg: Package): Package;
/**
 * Creates a new virtual descriptor from a non virtual one.
 *
 * @param descriptor The descriptor to virtualize
 * @param entropy A hash that provides uniqueness to this virtualized descriptor (normally a locator hash)
 */
export declare function virtualizeDescriptor(descriptor: Descriptor, entropy: string): Descriptor;
/**
 * Creates a new virtual package from a non virtual one.
 *
 * @param pkg The package to virtualize
 * @param entropy A hash that provides uniqueness to this virtualized package (normally a locator hash)
 */
export declare function virtualizePackage(pkg: Package, entropy: string): Package;
/**
 * Returns `true` if the descriptor is virtual.
 */
export declare function isVirtualDescriptor(descriptor: Descriptor): boolean;
/**
 * Returns `true` if the locator is virtual.
 */
export declare function isVirtualLocator(locator: Locator): boolean;
/**
 * Returns a new devirtualized descriptor based on a virtualized descriptor
 */
export declare function devirtualizeDescriptor(descriptor: Descriptor): Descriptor;
/**
 * Returns a new devirtualized locator based on a virtualized locator
 * @param locator the locator
 */
export declare function devirtualizeLocator(locator: Locator): Locator;
/**
 * Returns a descriptor guaranteed to be devirtualized
 */
export declare function ensureDevirtualizedDescriptor(descriptor: Descriptor): Descriptor;
/**
 * Returns a locator guaranteed to be devirtualized
 * @param locator the locator
 */
export declare function ensureDevirtualizedLocator(locator: Locator): Locator;
/**
 * Some descriptors only make sense when bound with some internal state. For
 * instance that would be the case for the `file:` ranges, which require to
 * be bound to their parent packages in order to resolve relative paths from
 * the right location.
 *
 * This function will apply the specified parameters onto the requested
 * descriptor, but only if it didn't get bound before (important to handle the
 * case where we replace a descriptor by another, since when that happens the
 * replacement has probably been already bound).
 *
 * @param descriptor The original descriptor
 * @param params The parameters to encode in the range
 */
export declare function bindDescriptor(descriptor: Descriptor, params: {
    [key: string]: string;
}): Descriptor;
/**
 * Some locators only make sense when bound with some internal state. For
 * instance that would be the case for the `file:` references, which require to
 * be bound to their parent packages in order to resolve relative paths from
 * the right location.
 *
 * This function will apply the specified parameters onto the requested
 * locator, but only if it didn't get bound before (important to handle the
 * case where we replace a locator by another, since when that happens the
 * replacement has probably been already bound).
 *
 * @param locator The original locator
 * @param params The parameters to encode in the reference
 */
export declare function bindLocator(locator: Locator, params: {
    [key: string]: string;
}): Locator;
/**
 * Returns `true` if the idents are equal
 */
export declare function areIdentsEqual(a: Ident, b: Ident): boolean;
/**
 * Returns `true` if the descriptors are equal
 */
export declare function areDescriptorsEqual(a: Descriptor, b: Descriptor): boolean;
/**
 * Returns `true` if the locators are equal
 */
export declare function areLocatorsEqual(a: Locator, b: Locator): boolean;
/**
 * Virtual packages are considered equivalent when they belong to the same
 * package identity and have the same dependencies. Note that equivalence
 * is not the same as equality, as the references may be different.
 */
export declare function areVirtualPackagesEquivalent(a: Package, b: Package): boolean;
/**
 * Parses a string into an ident.
 *
 * Throws an error if the ident cannot be parsed.
 *
 * @param string The ident string (eg. `@types/lodash`)
 */
export declare function parseIdent(string: string): Ident;
/**
 * Parses a string into an ident.
 *
 * Returns `null` if the ident cannot be parsed.
 *
 * @param string The ident string (eg. `@types/lodash`)
 */
export declare function tryParseIdent(string: string): Ident | null;
/**
 * Parses a `string` into a descriptor
 *
 * Throws an error if the descriptor cannot be parsed.
 *
 * @param string The descriptor string (eg. `lodash@^1.0.0`)
 * @param strict If `false`, the range is optional (`unknown` will be used as fallback)
 */
export declare function parseDescriptor(string: string, strict?: boolean): Descriptor;
/**
 * Parses a `string` into a descriptor
 *
 * Returns `null` if the descriptor cannot be parsed.
 *
 * @param string The descriptor string (eg. `lodash@^1.0.0`)
 * @param strict If `false`, the range is optional (`unknown` will be used as fallback)
 */
export declare function tryParseDescriptor(string: string, strict?: boolean): Descriptor | null;
/**
 * Parses a `string` into a locator
 *
 * Throws an error if the locator cannot be parsed.
 *
 * @param string The locator `string` (eg. `lodash@1.0.0`)
 * @param strict If `false`, the reference is optional (`unknown` will be used as fallback)
 */
export declare function parseLocator(string: string, strict?: boolean): Locator;
/**
 * Parses a `string` into a locator
 *
 * Returns `null` if the locator cannot be parsed.
 *
 * @param string The locator string (eg. `lodash@1.0.0`)
 * @param strict If `false`, the reference is optional (`unknown` will be used as fallback)
 */
export declare function tryParseLocator(string: string, strict?: boolean): Locator | null;
declare type ParseRangeOptions = {
    /** Throw an error if bindings are missing */
    requireBindings?: boolean;
    /** Throw an error if the protocol is missing or is not the specified one */
    requireProtocol?: boolean | string;
    /** Throw an error if the source is missing */
    requireSource?: boolean;
    /** Whether to parse the selector as a query string */
    parseSelector?: boolean;
};
declare type ParseRangeReturnType<Opts extends ParseRangeOptions> = ({
    params: Opts extends {
        requireBindings: true;
    } ? querystring.ParsedUrlQuery : querystring.ParsedUrlQuery | null;
}) & ({
    protocol: Opts extends {
        requireProtocol: true | string;
    } ? string : string | null;
}) & ({
    source: Opts extends {
        requireSource: true;
    } ? string : string | null;
}) & ({
    selector: Opts extends {
        parseSelector: true;
    } ? querystring.ParsedUrlQuery : string;
});
/**
 * Parses a range into its constituents. Ranges typically follow these forms,
 * with both `protocol` and `bindings` being optionals:
 *
 *     <protocol>:<selector>::<bindings>
 *     <protocol>:<source>#<selector>::<bindings>
 *
 * The selector is intended to "refine" the source, and is required. The source
 * itself is optional (for instance we don't need it for npm packages, but we
 * do for git dependencies).
 */
export declare function parseRange<Opts extends ParseRangeOptions>(range: string, opts?: Opts): ParseRangeReturnType<Opts>;
/**
 * Parses a range into its constituents. Ranges typically follow these forms,
 * with both `protocol` and `bindings` being optionals:
 *
 *     <protocol>:<selector>::<bindings>
 *     <protocol>:<source>#<selector>::<bindings>
 *
 * The selector is intended to "refine" the source, and is required. The source
 * itself is optional (for instance we don't need it for npm packages, but we
 * do for git dependencies).
 */
export declare function tryParseRange<Opts extends ParseRangeOptions>(range: string, opts?: Opts): ParseRangeReturnType<Opts> | null;
/**
 * File-style ranges are bound to a parent locators that we need in order to
 * resolve relative paths to the location of their parent packages. This
 * function wraps `parseRange` to automatically extract the parent locator
 * from the bindings and return it along with the selector.
 */
export declare function parseFileStyleRange(range: string, { protocol }: {
    protocol: string;
}): {
    parentLocator: Locator;
    path: PortablePath;
};
/**
 * Turn the components returned by `parseRange` back into a string. Check
 * `parseRange` for more details.
 */
export declare function makeRange({ protocol, source, selector, params }: {
    protocol: string | null;
    source: string | null;
    selector: string;
    params: querystring.ParsedUrlQuery | null;
}): string;
/**
 * Some bindings are internal-only and not meant to be displayed anywhere (for
 * instance that's the case with the parent locator bound to the `file:` ranges).
 *
 * this function strips them from a range.
 */
export declare function convertToManifestRange(range: string): string;
/**
 * Returns a string from an ident (eg. `@types/lodash`).
 */
export declare function stringifyIdent(ident: Ident): string;
/**
 * Returns a string from a descriptor (eg. `@types/lodash@^1.0.0`).
 */
export declare function stringifyDescriptor(descriptor: Descriptor): string;
/**
 * Returns a string from a descriptor (eg. `@types/lodash@1.0.0`).
 */
export declare function stringifyLocator(locator: Locator): string;
/**
 * Returns a string from an ident, formatted as a slug (eg. `@types-lodash`).
 */
export declare function slugifyIdent(ident: Ident): string;
/**
 * Returns a string from a locator, formatted as a slug (eg. `@types-lodash-npm-1.0.0-abcdef1234`).
 */
export declare function slugifyLocator(locator: Locator): import("@yarnpkg/fslib").Filename;
/**
 * Returns a string that is suitable to be printed to stdout. Based on the
 * configuration it may include color sequences.
 *
 * @param configuration Reference configuration
 * @param ident The ident to pretty print
 */
export declare function prettyIdent(configuration: Configuration, ident: Ident): string;
/**
 * Returns a string that is suitable to be printed to stdout. Based on the
 * configuration it may include color sequences.
 *
 * @param configuration Reference configuration
 * @param ident The range to pretty print
 */
export declare function prettyRange(configuration: Configuration, range: string): string;
/**
 * Returns a string that is suitable to be printed to stdout. Based on the
 * configuration it may include color sequences.
 *
 * @param configuration Reference configuration
 * @param descriptor The descriptor to pretty print
 */
export declare function prettyDescriptor(configuration: Configuration, descriptor: Descriptor): string;
/**
 * Returns a string that is suitable to be printed to stdout. Based on the
 * configuration it may include color sequences.
 *
 * @param configuration Reference configuration
 * @param reference The reference to pretty print
 */
export declare function prettyReference(configuration: Configuration, reference: string): string;
/**
 * Returns a string that is suitable to be printed to stdout. Based on the
 * configuration it may include color sequences.
 *
 * @param configuration Reference configuration
 * @param locator The locator to pretty print
 */
export declare function prettyLocator(configuration: Configuration, locator: Locator): string;
/**
 * Returns a string that is suitable to be printed to stdout. It will never
 * be colored.
 *
 * @param locator The locator to pretty print
 */
export declare function prettyLocatorNoColors(locator: Locator): string;
/**
 * Sorts a list of descriptors, first by their idents then by their ranges.
 */
export declare function sortDescriptors(descriptors: Iterable<Descriptor>): Descriptor[];
/**
 * Returns a string that is suitable to be printed to stdout. Based on the
 * configuration it may include color sequences.
 *
 * @param configuration Reference configuration
 * @param workspace The workspace to pretty print
 */
export declare function prettyWorkspace(configuration: Configuration, workspace: Workspace): string;
/**
 * Returns a string that is suitable to be printed to stdout. Based on the
 * configuration it may include color sequences.
 *
 * @param configuration Reference configuration
 * @param descriptor The descriptor to pretty print
 * @param locator The locator is resolves to
 */
export declare function prettyResolution(configuration: Configuration, descriptor: Descriptor, locator: Locator | null): string;
/**
 * Returns a string that is suitable to be printed to stdout. Based on the
 * configuration it may include color sequences.
 *
 * @param configuration Reference configuration
 * @param locator The locator to pretty print
 * @param descriptor The descriptor that depends on it
 */
export declare function prettyDependent(configuration: Configuration, locator: Locator, descriptor: Descriptor | null): string;
/**
 * The presence of a `node_modules` directory in the path is extremely common
 * in the JavaScript ecosystem to denote whether a path belongs to a vendor
 * or not. I considered using a more generic path for packages that aren't
 * always JS-only (such as when using the Git fetcher), but that unfortunately
 * caused various JS apps to start showing errors when working with git repos.
 *
 * As a result, all packages from all languages will follow this convention. At
 * least it'll be consistent, and linkers will always have the ability to remap
 * them to a different location if that's a critical requirement.
 */
export declare function getIdentVendorPath(ident: Ident): PortablePath;
/**
 * Returns whether the given package is compatible with the specified environment.
 */
export declare function isPackageCompatible(pkg: Package, architectures: nodeUtils.ArchitectureSet): boolean;
export {};
