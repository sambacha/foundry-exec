"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractArchiveTo = exports.convertToZip = exports.makeArchiveFromDirectory = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const libzip_1 = require("@yarnpkg/libzip");
const stream_1 = require("stream");
const tar_1 = tslib_1.__importDefault(require("tar"));
const WorkerPool_1 = require("./WorkerPool");
const miscUtils = tslib_1.__importStar(require("./miscUtils"));
const worker_zip_1 = require("./worker-zip");
async function makeArchiveFromDirectory(source, { baseFs = new fslib_1.NodeFS(), prefixPath = fslib_1.PortablePath.root, compressionLevel, inMemory = false } = {}) {
    const libzip = await (0, libzip_1.getLibzipPromise)();
    let zipFs;
    if (inMemory) {
        zipFs = new fslib_1.ZipFS(null, { libzip, level: compressionLevel });
    }
    else {
        const tmpFolder = await fslib_1.xfs.mktempPromise();
        const tmpFile = fslib_1.ppath.join(tmpFolder, `archive.zip`);
        zipFs = new fslib_1.ZipFS(tmpFile, { create: true, libzip, level: compressionLevel });
    }
    const target = fslib_1.ppath.resolve(fslib_1.PortablePath.root, prefixPath);
    await zipFs.copyPromise(target, source, { baseFs, stableTime: true, stableSort: true });
    return zipFs;
}
exports.makeArchiveFromDirectory = makeArchiveFromDirectory;
let workerPool;
async function convertToZip(tgz, opts) {
    const tmpFolder = await fslib_1.xfs.mktempPromise();
    const tmpFile = fslib_1.ppath.join(tmpFolder, `archive.zip`);
    workerPool || (workerPool = new WorkerPool_1.WorkerPool((0, worker_zip_1.getContent)()));
    await workerPool.run({ tmpFile, tgz, opts });
    return new fslib_1.ZipFS(tmpFile, { libzip: await (0, libzip_1.getLibzipPromise)(), level: opts.compressionLevel });
}
exports.convertToZip = convertToZip;
async function* parseTar(tgz) {
    // @ts-expect-error - Types are wrong about what this function returns
    const parser = new tar_1.default.Parse();
    const passthrough = new stream_1.PassThrough({ objectMode: true, autoDestroy: true, emitClose: true });
    parser.on(`entry`, (entry) => {
        passthrough.write(entry);
    });
    parser.on(`error`, error => {
        passthrough.destroy(error);
    });
    parser.on(`close`, () => {
        if (!passthrough.destroyed) {
            passthrough.end();
        }
    });
    parser.end(tgz);
    for await (const entry of passthrough) {
        const it = entry;
        yield it;
        it.resume();
    }
}
async function extractArchiveTo(tgz, targetFs, { stripComponents = 0, prefixPath = fslib_1.PortablePath.dot } = {}) {
    var _a, _b;
    function ignore(entry) {
        // Disallow absolute paths; might be malicious (ex: /etc/passwd)
        if (entry.path[0] === `/`)
            return true;
        const parts = entry.path.split(/\//g);
        // We also ignore paths that could lead to escaping outside the archive
        if (parts.some((part) => part === `..`))
            return true;
        if (parts.length <= stripComponents)
            return true;
        return false;
    }
    for await (const entry of parseTar(tgz)) {
        if (ignore(entry))
            continue;
        const parts = fslib_1.ppath.normalize(fslib_1.npath.toPortablePath(entry.path)).replace(/\/$/, ``).split(/\//g);
        if (parts.length <= stripComponents)
            continue;
        const slicePath = parts.slice(stripComponents).join(`/`);
        const mappedPath = fslib_1.ppath.join(prefixPath, slicePath);
        let mode = 0o644;
        // If a single executable bit is set, normalize so that all are
        if (entry.type === `Directory` || (((_a = entry.mode) !== null && _a !== void 0 ? _a : 0) & 0o111) !== 0)
            mode |= 0o111;
        switch (entry.type) {
            case `Directory`:
                {
                    targetFs.mkdirpSync(fslib_1.ppath.dirname(mappedPath), { chmod: 0o755, utimes: [fslib_1.constants.SAFE_TIME, fslib_1.constants.SAFE_TIME] });
                    targetFs.mkdirSync(mappedPath, { mode });
                    targetFs.utimesSync(mappedPath, fslib_1.constants.SAFE_TIME, fslib_1.constants.SAFE_TIME);
                }
                break;
            case `OldFile`:
            case `File`:
                {
                    targetFs.mkdirpSync(fslib_1.ppath.dirname(mappedPath), { chmod: 0o755, utimes: [fslib_1.constants.SAFE_TIME, fslib_1.constants.SAFE_TIME] });
                    targetFs.writeFileSync(mappedPath, await miscUtils.bufferStream(entry), { mode });
                    targetFs.utimesSync(mappedPath, fslib_1.constants.SAFE_TIME, fslib_1.constants.SAFE_TIME);
                }
                break;
            case `SymbolicLink`:
                {
                    targetFs.mkdirpSync(fslib_1.ppath.dirname(mappedPath), { chmod: 0o755, utimes: [fslib_1.constants.SAFE_TIME, fslib_1.constants.SAFE_TIME] });
                    targetFs.symlinkSync(entry.linkpath, mappedPath);
                    (_b = targetFs.lutimesSync) === null || _b === void 0 ? void 0 : _b.call(targetFs, mappedPath, fslib_1.constants.SAFE_TIME, fslib_1.constants.SAFE_TIME);
                }
                break;
        }
    }
    return targetFs;
}
exports.extractArchiveTo = extractArchiveTo;
