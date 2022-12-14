"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checksumPattern = exports.checksumFile = exports.makeHash = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const crypto_1 = require("crypto");
const globby_1 = tslib_1.__importDefault(require("globby"));
function makeHash(...args) {
    const hash = (0, crypto_1.createHash)(`sha512`);
    let acc = ``;
    for (const arg of args) {
        if (typeof arg === `string`) {
            acc += arg;
        }
        else if (arg) {
            if (acc) {
                hash.update(acc);
                acc = ``;
            }
            hash.update(arg);
        }
    }
    if (acc)
        hash.update(acc);
    return hash.digest(`hex`);
}
exports.makeHash = makeHash;
async function checksumFile(path, { baseFs, algorithm } = { baseFs: fslib_1.xfs, algorithm: `sha512` }) {
    const fd = await baseFs.openPromise(path, `r`);
    try {
        const CHUNK_SIZE = 65536;
        const chunk = Buffer.allocUnsafeSlow(CHUNK_SIZE);
        const hash = (0, crypto_1.createHash)(algorithm);
        let bytesRead = 0;
        while ((bytesRead = await baseFs.readPromise(fd, chunk, 0, CHUNK_SIZE)) !== 0)
            hash.update(bytesRead === CHUNK_SIZE ? chunk : chunk.slice(0, bytesRead));
        return hash.digest(`hex`);
    }
    finally {
        await baseFs.closePromise(fd);
    }
}
exports.checksumFile = checksumFile;
async function checksumPattern(pattern, { cwd }) {
    // Note: We use a two-pass glob instead of using the expandDirectories option
    // from globby, because the native implementation is broken.
    //
    // Ref: https://github.com/sindresorhus/globby/issues/147
    const dirListing = await (0, globby_1.default)(pattern, {
        cwd: fslib_1.npath.fromPortablePath(cwd),
        expandDirectories: false,
        onlyDirectories: true,
        unique: true,
    });
    const dirPatterns = dirListing.map(entry => {
        return `${entry}/**/*`;
    });
    const listing = await (0, globby_1.default)([pattern, ...dirPatterns], {
        cwd: fslib_1.npath.fromPortablePath(cwd),
        expandDirectories: false,
        onlyFiles: false,
        unique: true,
    });
    listing.sort();
    const hashes = await Promise.all(listing.map(async (entry) => {
        const parts = [Buffer.from(entry)];
        const p = fslib_1.npath.toPortablePath(entry);
        const stat = await fslib_1.xfs.lstatPromise(p);
        if (stat.isSymbolicLink())
            parts.push(Buffer.from(await fslib_1.xfs.readlinkPromise(p)));
        else if (stat.isFile())
            parts.push(await fslib_1.xfs.readFilePromise(p));
        return parts.join(`\u0000`);
    }));
    const hash = (0, crypto_1.createHash)(`sha512`);
    for (const sub of hashes)
        hash.update(sub);
    return hash.digest(`hex`);
}
exports.checksumPattern = checksumPattern;
