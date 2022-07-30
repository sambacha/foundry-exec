"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecFetcher = void 0;
const core_1 = require("@yarnpkg/core");
const core_2 = require("@yarnpkg/core");
const fslib_1 = require("@yarnpkg/fslib");
const constants_1 = require("./constants");
const execUtils_1 = require("./execUtils");
class ExecFetcher {
    supports(locator, opts) {
        if (!locator.reference.startsWith(constants_1.PROTOCOL))
            return false;
        return true;
    }
    getLocalPath(locator, opts) {
        const { parentLocator, path } = core_1.structUtils.parseFileStyleRange(locator.reference, { protocol: constants_1.PROTOCOL });
        if (fslib_1.ppath.isAbsolute(path))
            return path;
        const parentLocalPath = opts.fetcher.getLocalPath(parentLocator, opts);
        if (parentLocalPath === null)
            return null;
        return fslib_1.ppath.resolve(parentLocalPath, path);
    }
    async fetch(locator, opts) {
        const expectedChecksum = opts.checksums.get(locator.locatorHash) || null;
        const [packageFs, releaseFs, checksum] = await opts.cache.fetchPackageFromCache(locator, expectedChecksum, {
            onHit: () => opts.report.reportCacheHit(locator),
            onMiss: () => opts.report.reportCacheMiss(locator),
            loader: () => this.fetchFromDisk(locator, opts),
            ...opts.cacheOptions,
        });
        return {
            packageFs,
            releaseFs,
            prefixPath: core_1.structUtils.getIdentVendorPath(locator),
            localPath: this.getLocalPath(locator, opts),
            checksum,
        };
    }
    async fetchFromDisk(locator, opts) {
        const generatorFile = await (0, execUtils_1.loadGeneratorFile)(locator.reference, constants_1.PROTOCOL, opts);
        return fslib_1.xfs.mktempPromise(async (generatorDir) => {
            const generatorPath = fslib_1.ppath.join(generatorDir, `generator.js`);
            await fslib_1.xfs.writeFilePromise(generatorPath, generatorFile);
            return fslib_1.xfs.mktempPromise(async (cwd) => {
                // Execute the specified script in the temporary directory
                await this.generatePackage(cwd, locator, generatorPath, opts);
                // Make sure the script generated the package
                if (!fslib_1.xfs.existsSync(fslib_1.ppath.join(cwd, `build`)))
                    throw new Error(`The script should have generated a build directory`);
                return await core_1.tgzUtils.makeArchiveFromDirectory(fslib_1.ppath.join(cwd, `build`), {
                    prefixPath: core_1.structUtils.getIdentVendorPath(locator),
                    compressionLevel: opts.project.configuration.get(`compressionLevel`),
                });
            });
        });
    }
    async generatePackage(cwd, locator, generatorPath, opts) {
        return await fslib_1.xfs.mktempPromise(async (binFolder) => {
            const env = await core_1.scriptUtils.makeScriptEnv({ project: opts.project, binFolder });
            const runtimeFile = fslib_1.ppath.join(cwd, `runtime.js`);
            return await fslib_1.xfs.mktempPromise(async (logDir) => {
                const logFile = fslib_1.ppath.join(logDir, `buildfile.log`);
                const stdin = null;
                const stdout = fslib_1.xfs.createWriteStream(logFile);
                const stderr = stdout;
                const tempDir = fslib_1.ppath.join(cwd, `generator`);
                const buildDir = fslib_1.ppath.join(cwd, `build`);
                await fslib_1.xfs.mkdirPromise(tempDir);
                await fslib_1.xfs.mkdirPromise(buildDir);
                /**
                 * Values exposed on the global `execEnv` variable.
                 *
                 * Must be stringifiable using `JSON.stringify`.
                 */
                const execEnvValues = {
                    tempDir: fslib_1.npath.fromPortablePath(tempDir),
                    buildDir: fslib_1.npath.fromPortablePath(buildDir),
                    locator: core_1.structUtils.stringifyLocator(locator),
                };
                await fslib_1.xfs.writeFilePromise(runtimeFile, `
          // Expose 'Module' as a global variable
          Object.defineProperty(global, 'Module', {
            get: () => require('module'),
            configurable: true,
            enumerable: false,
          });

          // Expose non-hidden built-in modules as global variables
          for (const name of Module.builtinModules.filter((name) => name !== 'module' && !name.startsWith('_'))) {
            Object.defineProperty(global, name, {
              get: () => require(name),
              configurable: true,
              enumerable: false,
            });
          }

          // Expose the 'execEnv' global variable
          Object.defineProperty(global, 'execEnv', {
            value: {
              ...${JSON.stringify(execEnvValues)},
            },
            enumerable: true,
          });
        `);
                let nodeOptions = env.NODE_OPTIONS || ``;
                const pnpRegularExpression = /\s*--require\s+\S*\.pnp\.c?js\s*/g;
                nodeOptions = nodeOptions.replace(pnpRegularExpression, ` `).trim();
                env.NODE_OPTIONS = nodeOptions;
                stdout.write(`# This file contains the result of Yarn generating a package (${core_1.structUtils.stringifyLocator(locator)})\n`);
                stdout.write(`\n`);
                const { code } = await core_1.execUtils.pipevp(process.execPath, [`--require`, fslib_1.npath.fromPortablePath(runtimeFile), fslib_1.npath.fromPortablePath(generatorPath), core_1.structUtils.stringifyIdent(locator)], { cwd, env, stdin, stdout, stderr });
                if (code !== 0) {
                    fslib_1.xfs.detachTemp(logDir);
                    throw new Error(`Package generation failed (exit code ${code}, logs can be found here: ${core_2.formatUtils.pretty(opts.project.configuration, logFile, core_2.formatUtils.Type.PATH)})`);
                }
            });
        });
    }
}
exports.ExecFetcher = ExecFetcher;
