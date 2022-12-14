"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.URLFS = void 0;
const url_1 = require("url");
const ProxiedFS_1 = require("./ProxiedFS");
const path_1 = require("./path");
/**
 * Adds support for file URLs to the wrapped `baseFs`, but *not* inside the typings.
 *
 * Only exists for compatibility with Node's behavior.
 *
 * Automatically wraps all FS instances passed to `patchFs` & `extendFs`.
 *
 * Don't use it!
 */
class URLFS extends ProxiedFS_1.ProxiedFS {
    constructor(baseFs) {
        super(path_1.npath);
        this.baseFs = baseFs;
    }
    mapFromBase(path) {
        return path;
    }
    mapToBase(path) {
        if (path instanceof url_1.URL)
            return (0, url_1.fileURLToPath)(path);
        return path;
    }
}
exports.URLFS = URLFS;
