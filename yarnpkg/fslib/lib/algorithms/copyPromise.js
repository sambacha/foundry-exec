"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyPromise = exports.setupCopyIndex = void 0;
const tslib_1 = require("tslib");
const constants = tslib_1.__importStar(require("../constants"));
const path_1 = require("../path");
const defaultTime = new Date(constants.SAFE_TIME * 1000);
const defaultTimeMs = defaultTime.getTime();
async function setupCopyIndex(destinationFs, linkStrategy) {
    const hexCharacters = `0123456789abcdef`;
    await destinationFs.mkdirPromise(linkStrategy.indexPath, { recursive: true });
    const promises = [];
    for (const l1 of hexCharacters)
        for (const l2 of hexCharacters)
            promises.push(destinationFs.mkdirPromise(destinationFs.pathUtils.join(linkStrategy.indexPath, `${l1}${l2}`), { recursive: true }));
    await Promise.all(promises);
    return linkStrategy.indexPath;
}
exports.setupCopyIndex = setupCopyIndex;
async function copyPromise(destinationFs, destination, sourceFs, source, opts) {
    const normalizedDestination = destinationFs.pathUtils.normalize(destination);
    const normalizedSource = sourceFs.pathUtils.normalize(source);
    const prelayout = [];
    const postlayout = [];
    const { atime, mtime } = opts.stableTime
        ? { atime: defaultTime, mtime: defaultTime }
        : await sourceFs.lstatPromise(normalizedSource);
    await destinationFs.mkdirpPromise(destinationFs.pathUtils.dirname(destination), { utimes: [atime, mtime] });
    const updateTime = typeof destinationFs.lutimesPromise === `function`
        ? destinationFs.lutimesPromise.bind(destinationFs)
        : destinationFs.utimesPromise.bind(destinationFs);
    await copyImpl(prelayout, postlayout, updateTime, destinationFs, normalizedDestination, sourceFs, normalizedSource, { ...opts, didParentExist: true });
    for (const operation of prelayout)
        await operation();
    await Promise.all(postlayout.map(operation => {
        return operation();
    }));
}
exports.copyPromise = copyPromise;
async function copyImpl(prelayout, postlayout, updateTime, destinationFs, destination, sourceFs, source, opts) {
    var _a, _b, _c;
    const destinationStat = opts.didParentExist ? await maybeLStat(destinationFs, destination) : null;
    const sourceStat = await sourceFs.lstatPromise(source);
    const { atime, mtime } = opts.stableTime
        ? { atime: defaultTime, mtime: defaultTime }
        : sourceStat;
    let updated;
    switch (true) {
        case sourceStat.isDirectory():
            {
                updated = await copyFolder(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
            }
            break;
        case sourceStat.isFile():
            {
                updated = await copyFile(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
            }
            break;
        case sourceStat.isSymbolicLink():
            {
                updated = await copySymlink(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
            }
            break;
        default:
            {
                throw new Error(`Unsupported file type (${sourceStat.mode})`);
            }
            break;
    }
    // We aren't allowed to modify the destination if we work with the index,
    // since otherwise we'd accidentally propagate the changes to all projects.
    if (((_a = opts.linkStrategy) === null || _a === void 0 ? void 0 : _a.type) !== `HardlinkFromIndex` || !sourceStat.isFile()) {
        if (updated || ((_b = destinationStat === null || destinationStat === void 0 ? void 0 : destinationStat.mtime) === null || _b === void 0 ? void 0 : _b.getTime()) !== mtime.getTime() || ((_c = destinationStat === null || destinationStat === void 0 ? void 0 : destinationStat.atime) === null || _c === void 0 ? void 0 : _c.getTime()) !== atime.getTime()) {
            postlayout.push(() => updateTime(destination, atime, mtime));
            updated = true;
        }
        if (destinationStat === null || (destinationStat.mode & 0o777) !== (sourceStat.mode & 0o777)) {
            postlayout.push(() => destinationFs.chmodPromise(destination, sourceStat.mode & 0o777));
            updated = true;
        }
    }
    return updated;
}
async function maybeLStat(baseFs, p) {
    try {
        return await baseFs.lstatPromise(p);
    }
    catch (e) {
        return null;
    }
}
async function copyFolder(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
    if (destinationStat !== null && !destinationStat.isDirectory()) {
        if (opts.overwrite) {
            prelayout.push(async () => destinationFs.removePromise(destination));
            destinationStat = null;
        }
        else {
            return false;
        }
    }
    let updated = false;
    if (destinationStat === null) {
        prelayout.push(async () => {
            try {
                await destinationFs.mkdirPromise(destination, { mode: sourceStat.mode });
            }
            catch (err) {
                if (err.code !== `EEXIST`) {
                    throw err;
                }
            }
        });
        updated = true;
    }
    const entries = await sourceFs.readdirPromise(source);
    const nextOpts = opts.didParentExist && !destinationStat ? { ...opts, didParentExist: false } : opts;
    if (opts.stableSort) {
        for (const entry of entries.sort()) {
            if (await copyImpl(prelayout, postlayout, updateTime, destinationFs, destinationFs.pathUtils.join(destination, entry), sourceFs, sourceFs.pathUtils.join(source, entry), nextOpts)) {
                updated = true;
            }
        }
    }
    else {
        const entriesUpdateStatus = await Promise.all(entries.map(async (entry) => {
            await copyImpl(prelayout, postlayout, updateTime, destinationFs, destinationFs.pathUtils.join(destination, entry), sourceFs, sourceFs.pathUtils.join(source, entry), nextOpts);
        }));
        if (entriesUpdateStatus.some(status => status)) {
            updated = true;
        }
    }
    return updated;
}
async function copyFileViaIndex(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts, linkStrategy) {
    const sourceHash = await sourceFs.checksumFilePromise(source, { algorithm: `sha1` });
    const indexPath = destinationFs.pathUtils.join(linkStrategy.indexPath, sourceHash.slice(0, 2), `${sourceHash}.dat`);
    let indexStat = await maybeLStat(destinationFs, indexPath);
    if (destinationStat) {
        const isDestinationHardlinkedFromIndex = indexStat && destinationStat.dev === indexStat.dev && destinationStat.ino === indexStat.ino;
        const isIndexModified = (indexStat === null || indexStat === void 0 ? void 0 : indexStat.mtimeMs) !== defaultTimeMs;
        if (isDestinationHardlinkedFromIndex)
            if (isIndexModified && linkStrategy.autoRepair)
                indexStat = null;
        if (!isDestinationHardlinkedFromIndex) {
            if (opts.overwrite) {
                prelayout.push(async () => destinationFs.removePromise(destination));
                destinationStat = null;
            }
            else {
                return false;
            }
        }
    }
    prelayout.push(async () => {
        if (!indexStat) {
            await destinationFs.lockPromise(indexPath, async () => {
                const content = await sourceFs.readFilePromise(source);
                await destinationFs.writeFilePromise(indexPath, content);
            });
        }
        if (!destinationStat) {
            await destinationFs.linkPromise(indexPath, destination);
        }
    });
    postlayout.push(async () => {
        if (!indexStat) {
            await updateTime(indexPath, defaultTime, defaultTime);
        }
    });
    return false;
}
async function copyFileDirect(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
    if (destinationStat !== null) {
        if (opts.overwrite) {
            prelayout.push(async () => destinationFs.removePromise(destination));
            destinationStat = null;
        }
        else {
            return false;
        }
    }
    // TODO: Add support for file cloning, by adding a flag inside the FakeFS
    // instances to detect which "namespace" they're part of (for example, the
    // NodeFS and the ZipFS would be different namespaces since you can't clone
    // from one disk to the other; on the other hand, a CwdFS would share the
    // namespace from its base FS and thus would support cloning).
    prelayout.push(async () => {
        const content = await sourceFs.readFilePromise(source);
        await destinationFs.writeFilePromise(destination, content);
    });
    return true;
}
async function copyFile(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
    var _a;
    if (((_a = opts.linkStrategy) === null || _a === void 0 ? void 0 : _a.type) === `HardlinkFromIndex`) {
        return copyFileViaIndex(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts, opts.linkStrategy);
    }
    else {
        return copyFileDirect(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
    }
}
async function copySymlink(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
    if (destinationStat !== null) {
        if (opts.overwrite) {
            prelayout.push(async () => destinationFs.removePromise(destination));
            destinationStat = null;
        }
        else {
            return false;
        }
    }
    prelayout.push(async () => {
        await destinationFs.symlinkPromise((0, path_1.convertPath)(destinationFs.pathUtils, await sourceFs.readlinkPromise(source)), destination);
    });
    return true;
}
