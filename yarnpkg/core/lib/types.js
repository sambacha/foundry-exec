"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageExtensionStatus = exports.PackageExtensionType = exports.LinkType = void 0;
/**
 * Describes in which capacity the linkers can manipulate the package sources.
 */
var LinkType;
(function (LinkType) {
    /**
     * The package manager owns the location (typically things within the cache)
     * and can transform it at will (for instance the PnP linker may decide to
     * unplug those packages).
     */
    LinkType["HARD"] = "HARD";
    /**
     * The package manager doesn't own the location (symlinks, workspaces, etc),
     * so the linkers aren't allowed to do anything with them except use them as
     * they are.
     */
    LinkType["SOFT"] = "SOFT";
})(LinkType = exports.LinkType || (exports.LinkType = {}));
var PackageExtensionType;
(function (PackageExtensionType) {
    PackageExtensionType["Dependency"] = "Dependency";
    PackageExtensionType["PeerDependency"] = "PeerDependency";
    PackageExtensionType["PeerDependencyMeta"] = "PeerDependencyMeta";
})(PackageExtensionType = exports.PackageExtensionType || (exports.PackageExtensionType = {}));
var PackageExtensionStatus;
(function (PackageExtensionStatus) {
    PackageExtensionStatus["Inactive"] = "inactive";
    PackageExtensionStatus["Redundant"] = "redundant";
    PackageExtensionStatus["Active"] = "active";
})(PackageExtensionStatus = exports.PackageExtensionStatus || (exports.PackageExtensionStatus = {}));
