"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const fslib_2 = require("@yarnpkg/fslib");
const libzip_1 = require("@yarnpkg/libzip");
const crypto_1 = require("crypto");
const fs_1 = tslib_1.__importDefault(require("fs"));
const MessageName_1 = require("./MessageName");
const Report_1 = require("./Report");
const hashUtils = tslib_1.__importStar(require("./hashUtils"));
const miscUtils = tslib_1.__importStar(require("./miscUtils"));
const structUtils = tslib_1.__importStar(require("./structUtils"));
const CACHE_VERSION = 9;
class Cache {
    constructor(cacheCwd, { configuration, immutable = configuration.get(`enableImmutableCache`), check = false }) {
        // Contains the list of cache files that got accessed since the last time
        // you cleared the variable. Useful to know which files aren't needed
        // anymore when used in conjunction with fetchEverything.
        this.markedFiles = new Set();
        this.mutexes = new Map();
        /**
         * To ensure different instances of `Cache` doesn't end up copying to the same
         * temporary file this random ID is appended to the filename.
         */
        this.cacheId = `-${(0, crypto_1.randomBytes)(8).toString(`hex`)}.tmp`;
        this.configuration = configuration;
        this.cwd = cacheCwd;
        this.immutable = immutable;
        this.check = check;
        const cacheKeyOverride = configuration.get(`cacheKeyOverride`);
        if (cacheKeyOverride !== null) {
            this.cacheKey = `${cacheKeyOverride}`;
        }
        else {
            const compressionLevel = configuration.get(`compressionLevel`);
            const compressionKey = compressionLevel !== fslib_2.DEFAULT_COMPRESSION_LEVEL
                ? `c${compressionLevel}` : ``;
            this.cacheKey = [
                CACHE_VERSION,
                compressionKey,
            ].join(``);
        }
    }
    static async find(configuration, { immutable, check } = {}) {
        const cache = new Cache(configuration.get(`cacheFolder`), { configuration, immutable, check });
        await cache.setup();
        return cache;
    }
    get mirrorCwd() {
        if (!this.configuration.get(`enableMirror`))
            return null;
        const mirrorCwd = `${this.configuration.get(`globalFolder`)}/cache`;
        return mirrorCwd !== this.cwd ? mirrorCwd : null;
    }
    getVersionFilename(locator) {
        return `${structUtils.slugifyLocator(locator)}-${this.cacheKey}.zip`;
    }
    getChecksumFilename(locator, checksum) {
        // We only want the actual checksum (not the cache version, since the whole
        // point is to avoid changing the filenames when the cache version changes)
        const contentChecksum = getHashComponent(checksum);
        // We only care about the first few characters. It doesn't matter if that
        // makes the hash easier to collide with, because we check the file hashes
        // during each install anyway.
        const significantChecksum = contentChecksum.slice(0, 10);
        return `${structUtils.slugifyLocator(locator)}-${significantChecksum}.zip`;
    }
    getLocatorPath(locator, expectedChecksum, opts = {}) {
        var _a;
        // If there is no mirror, then the local cache *is* the mirror, in which
        // case we use the versioned filename pattern. Same if the package is
        // unstable, meaning it may be there or not depending on the environment,
        // so we can't rely on its checksum to get a stable location.
        if (this.mirrorCwd === null || ((_a = opts.unstablePackages) === null || _a === void 0 ? void 0 : _a.has(locator.locatorHash)))
            return fslib_2.ppath.resolve(this.cwd, this.getVersionFilename(locator));
        // If we don't yet know the checksum, discard the path resolution for now
        // until the checksum can be obtained from somewhere (mirror or network).
        if (expectedChecksum === null)
            return null;
        // If the cache key changed then we assume that the content probably got
        // altered as well and thus the existing path won't be good enough anymore.
        const cacheKey = getCacheKeyComponent(expectedChecksum);
        if (cacheKey !== this.cacheKey)
            return null;
        return fslib_2.ppath.resolve(this.cwd, this.getChecksumFilename(locator, expectedChecksum));
    }
    getLocatorMirrorPath(locator) {
        const mirrorCwd = this.mirrorCwd;
        return mirrorCwd !== null ? fslib_2.ppath.resolve(mirrorCwd, this.getVersionFilename(locator)) : null;
    }
    async setup() {
        // mkdir may cause write operations even when directories exist. To ensure that the cache can be successfully used
        // on read-only filesystems, only run mkdir when not running in immutable mode.
        if (!this.configuration.get(`enableGlobalCache`)) {
            if (this.immutable) {
                if (!await fslib_2.xfs.existsPromise(this.cwd)) {
                    throw new Report_1.ReportError(MessageName_1.MessageName.IMMUTABLE_CACHE, `Cache path does not exist.`);
                }
            }
            else {
                await fslib_2.xfs.mkdirPromise(this.cwd, { recursive: true });
                const gitignorePath = fslib_2.ppath.resolve(this.cwd, `.gitignore`);
                await fslib_2.xfs.changeFilePromise(gitignorePath, `/.gitignore\n*.flock\n*.tmp\n`);
            }
        }
        if (this.mirrorCwd || !this.immutable) {
            await fslib_2.xfs.mkdirPromise(this.mirrorCwd || this.cwd, { recursive: true });
        }
    }
    async fetchPackageFromCache(locator, expectedChecksum, { onHit, onMiss, loader, ...opts }) {
        var _a;
        const mirrorPath = this.getLocatorMirrorPath(locator);
        const baseFs = new fslib_1.NodeFS();
        // Conditional packages may not be fetched if they're intended for a
        // different architecture than the current one. To avoid having to be
        // careful about those packages everywhere, we instead change their
        // content to that of an empty in-memory package.
        //
        // This memory representation will be wrapped into an AliasFS to make
        // it seem like it actually exist on the disk, at the location of the
        // cache the package would fill if it was normally fetched.
        const makeMockPackage = () => {
            const zipFs = new fslib_1.ZipFS(null, { libzip });
            const rootPackageDir = fslib_2.ppath.join(fslib_1.PortablePath.root, structUtils.getIdentVendorPath(locator));
            zipFs.mkdirSync(rootPackageDir, { recursive: true });
            zipFs.writeJsonSync(fslib_2.ppath.join(rootPackageDir, fslib_1.Filename.manifest), {
                name: structUtils.stringifyIdent(locator),
                mocked: true,
            });
            return zipFs;
        };
        const validateFile = async (path, refetchPath = null) => {
            var _a;
            // We hide the checksum if the package presence is conditional, because it becomes unreliable
            // so there is no point in computing it unless we're checking the cache
            if (refetchPath === null && ((_a = opts.unstablePackages) === null || _a === void 0 ? void 0 : _a.has(locator.locatorHash)))
                return null;
            const actualChecksum = (!opts.skipIntegrityCheck || !expectedChecksum)
                ? `${this.cacheKey}/${await hashUtils.checksumFile(path)}`
                : expectedChecksum;
            if (refetchPath !== null) {
                const previousChecksum = (!opts.skipIntegrityCheck || !expectedChecksum)
                    ? `${this.cacheKey}/${await hashUtils.checksumFile(refetchPath)}`
                    : expectedChecksum;
                if (actualChecksum !== previousChecksum) {
                    throw new Report_1.ReportError(MessageName_1.MessageName.CACHE_CHECKSUM_MISMATCH, `The remote archive doesn't match the local checksum - has the local cache been corrupted?`);
                }
            }
            if (expectedChecksum !== null && actualChecksum !== expectedChecksum) {
                let checksumBehavior;
                // Using --check-cache overrides any preconfigured checksum behavior
                if (this.check)
                    checksumBehavior = `throw`;
                // If the lockfile references an old cache format, we tolerate different checksums
                else if (getCacheKeyComponent(expectedChecksum) !== getCacheKeyComponent(actualChecksum))
                    checksumBehavior = `update`;
                else
                    checksumBehavior = this.configuration.get(`checksumBehavior`);
                switch (checksumBehavior) {
                    case `ignore`:
                        return expectedChecksum;
                    case `update`:
                        return actualChecksum;
                    default:
                    case `throw`: {
                        throw new Report_1.ReportError(MessageName_1.MessageName.CACHE_CHECKSUM_MISMATCH, `The remote archive doesn't match the expected checksum`);
                    }
                }
            }
            return actualChecksum;
        };
        const validateFileAgainstRemote = async (cachePath) => {
            if (!loader)
                throw new Error(`Cache check required but no loader configured for ${structUtils.prettyLocator(this.configuration, locator)}`);
            const zipFs = await loader();
            const refetchPath = zipFs.getRealPath();
            zipFs.saveAndClose();
            await fslib_2.xfs.chmodPromise(refetchPath, 0o644);
            return await validateFile(cachePath, refetchPath);
        };
        const loadPackageThroughMirror = async () => {
            if (mirrorPath === null || !(await fslib_2.xfs.existsPromise(mirrorPath))) {
                const zipFs = await loader();
                const realPath = zipFs.getRealPath();
                zipFs.saveAndClose();
                return { source: `loader`, path: realPath };
            }
            return { source: `mirror`, path: mirrorPath };
        };
        const loadPackage = async () => {
            if (!loader)
                throw new Error(`Cache entry required but missing for ${structUtils.prettyLocator(this.configuration, locator)}`);
            if (this.immutable)
                throw new Report_1.ReportError(MessageName_1.MessageName.IMMUTABLE_CACHE, `Cache entry required but missing for ${structUtils.prettyLocator(this.configuration, locator)}`);
            const { path: packagePath, source: packageSource } = await loadPackageThroughMirror();
            // Do this before moving the file so that we don't pollute the cache with corrupted archives
            const checksum = await validateFile(packagePath);
            const cachePath = this.getLocatorPath(locator, checksum, opts);
            if (!cachePath)
                throw new Error(`Assertion failed: Expected the cache path to be available`);
            const copyProcess = [];
            // Copy the package into the mirror
            if (packageSource !== `mirror` && mirrorPath !== null) {
                copyProcess.push(async () => {
                    const mirrorPathTemp = `${mirrorPath}${this.cacheId}`;
                    await fslib_2.xfs.copyFilePromise(packagePath, mirrorPathTemp, fs_1.default.constants.COPYFILE_FICLONE);
                    await fslib_2.xfs.chmodPromise(mirrorPathTemp, 0o644);
                    // Doing a rename is important to ensure the cache is atomic
                    await fslib_2.xfs.renamePromise(mirrorPathTemp, mirrorPath);
                });
            }
            // Copy the package into the cache
            if (!opts.mirrorWriteOnly || mirrorPath === null) {
                copyProcess.push(async () => {
                    const cachePathTemp = `${cachePath}${this.cacheId}`;
                    await fslib_2.xfs.copyFilePromise(packagePath, cachePathTemp, fs_1.default.constants.COPYFILE_FICLONE);
                    await fslib_2.xfs.chmodPromise(cachePathTemp, 0o644);
                    // Doing a rename is important to ensure the cache is atomic
                    await fslib_2.xfs.renamePromise(cachePathTemp, cachePath);
                });
            }
            const finalPath = opts.mirrorWriteOnly
                ? mirrorPath !== null && mirrorPath !== void 0 ? mirrorPath : cachePath
                : cachePath;
            await Promise.all(copyProcess.map(copy => copy()));
            return [false, finalPath, checksum];
        };
        const loadPackageThroughMutex = async () => {
            const mutexedLoad = async () => {
                var _a;
                // We don't yet know whether the cache path can be computed yet, since that
                // depends on whether the cache is actually the mirror or not, and whether
                // the checksum is known or not.
                const tentativeCachePath = this.getLocatorPath(locator, expectedChecksum, opts);
                const cacheFileExists = tentativeCachePath !== null
                    ? this.markedFiles.has(tentativeCachePath) || await baseFs.existsPromise(tentativeCachePath)
                    : false;
                const shouldMock = !!((_a = opts.mockedPackages) === null || _a === void 0 ? void 0 : _a.has(locator.locatorHash)) && (!this.check || !cacheFileExists);
                const isCacheHit = shouldMock || cacheFileExists;
                const action = isCacheHit
                    ? onHit
                    : onMiss;
                if (action)
                    action();
                if (!isCacheHit) {
                    return loadPackage();
                }
                else {
                    let checksum = null;
                    const cachePath = tentativeCachePath;
                    if (!shouldMock)
                        checksum = this.check
                            ? await validateFileAgainstRemote(cachePath)
                            : await validateFile(cachePath);
                    return [shouldMock, cachePath, checksum];
                }
            };
            const mutex = mutexedLoad();
            this.mutexes.set(locator.locatorHash, mutex);
            try {
                return await mutex;
            }
            finally {
                this.mutexes.delete(locator.locatorHash);
            }
        };
        for (let mutex; (mutex = this.mutexes.get(locator.locatorHash));)
            await mutex;
        const [shouldMock, cachePath, checksum] = await loadPackageThroughMutex();
        if (!shouldMock)
            this.markedFiles.add(cachePath);
        let zipFs;
        const libzip = await (0, libzip_1.getLibzipPromise)();
        const zipFsBuilder = shouldMock
            ? () => makeMockPackage()
            : () => new fslib_1.ZipFS(cachePath, { baseFs, libzip, readOnly: true });
        const lazyFs = new fslib_1.LazyFS(() => miscUtils.prettifySyncErrors(() => {
            return zipFs = zipFsBuilder();
        }, message => {
            return `Failed to open the cache entry for ${structUtils.prettyLocator(this.configuration, locator)}: ${message}`;
        }), fslib_2.ppath);
        // We use an AliasFS to speed up getRealPath calls (e.g. VirtualFetcher.ensureVirtualLink)
        // (there's no need to create the lazy baseFs instance to gather the already-known cachePath)
        const aliasFs = new fslib_1.AliasFS(cachePath, { baseFs: lazyFs, pathUtils: fslib_2.ppath });
        const releaseFs = () => {
            zipFs === null || zipFs === void 0 ? void 0 : zipFs.discardAndClose();
        };
        // We hide the checksum if the package presence is conditional, because it becomes unreliable
        const exposedChecksum = !((_a = opts.unstablePackages) === null || _a === void 0 ? void 0 : _a.has(locator.locatorHash))
            ? checksum
            : null;
        return [aliasFs, releaseFs, exposedChecksum];
    }
}
exports.Cache = Cache;
function getCacheKeyComponent(checksum) {
    const split = checksum.indexOf(`/`);
    return split !== -1 ? checksum.slice(0, split) : null;
}
function getHashComponent(checksum) {
    const split = checksum.indexOf(`/`);
    return split !== -1 ? checksum.slice(split + 1) : checksum;
}
