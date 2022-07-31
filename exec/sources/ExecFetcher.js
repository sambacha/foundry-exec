"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.ExecFetcher = void 0;
var core_1 = require("@yarnpkg/core");
var core_2 = require("@yarnpkg/core");
var fslib_1 = require("@yarnpkg/fslib");
var constants_1 = require("./constants");
var execUtils_1 = require("./execUtils");
var ExecFetcher = /** @class */ (function () {
    function ExecFetcher() {
    }
    ExecFetcher.prototype.supports = function (locator, opts) {
        if (!locator.reference.startsWith(constants_1.PROTOCOL))
            return false;
        return true;
    };
    ExecFetcher.prototype.getLocalPath = function (locator, opts) {
        var _a = core_1.structUtils.parseFileStyleRange(locator.reference, { protocol: constants_1.PROTOCOL }), parentLocator = _a.parentLocator, path = _a.path;
        if (fslib_1.ppath.isAbsolute(path))
            return path;
        var parentLocalPath = opts.fetcher.getLocalPath(parentLocator, opts);
        if (parentLocalPath === null)
            return null;
        return fslib_1.ppath.resolve(parentLocalPath, path);
    };
    ExecFetcher.prototype.fetch = function (locator, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var expectedChecksum, _a, packageFs, releaseFs, checksum;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        expectedChecksum = opts.checksums.get(locator.locatorHash) || null;
                        return [4 /*yield*/, opts.cache.fetchPackageFromCache(locator, expectedChecksum, __assign({ onHit: function () { return opts.report.reportCacheHit(locator); }, onMiss: function () { return opts.report.reportCacheMiss(locator); }, loader: function () { return _this.fetchFromDisk(locator, opts); } }, opts.cacheOptions))];
                    case 1:
                        _a = _b.sent(), packageFs = _a[0], releaseFs = _a[1], checksum = _a[2];
                        return [2 /*return*/, {
                                packageFs: packageFs,
                                releaseFs: releaseFs,
                                prefixPath: core_1.structUtils.getIdentVendorPath(locator),
                                localPath: this.getLocalPath(locator, opts),
                                checksum: checksum
                            }];
                }
            });
        });
    };
    ExecFetcher.prototype.fetchFromDisk = function (locator, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var generatorFile;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, execUtils_1.loadGeneratorFile)(locator.reference, constants_1.PROTOCOL, opts)];
                    case 1:
                        generatorFile = _a.sent();
                        return [2 /*return*/, fslib_1.xfs.mktempPromise(function (generatorDir) { return __awaiter(_this, void 0, void 0, function () {
                                var generatorPath;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            generatorPath = fslib_1.ppath.join(generatorDir, "generator.js");
                                            return [4 /*yield*/, fslib_1.xfs.writeFilePromise(generatorPath, generatorFile)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, fslib_1.xfs.mktempPromise(function (cwd) { return __awaiter(_this, void 0, void 0, function () {
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0: 
                                                            // Execute the specified script in the temporary directory
                                                            return [4 /*yield*/, this.generatePackage(cwd, locator, generatorPath, opts)];
                                                            case 1:
                                                                // Execute the specified script in the temporary directory
                                                                _a.sent();
                                                                // Make sure the script generated the package
                                                                if (!fslib_1.xfs.existsSync(fslib_1.ppath.join(cwd, "build")))
                                                                    throw new Error("The script should have generated a build directory");
                                                                return [4 /*yield*/, core_1.tgzUtils.makeArchiveFromDirectory(fslib_1.ppath.join(cwd, "build"), {
                                                                        prefixPath: core_1.structUtils.getIdentVendorPath(locator),
                                                                        compressionLevel: opts.project.configuration.get("compressionLevel")
                                                                    })];
                                                            case 2: return [2 /*return*/, _a.sent()];
                                                        }
                                                    });
                                                }); })];
                                    }
                                });
                            }); })];
                }
            });
        });
    };
    ExecFetcher.prototype.generatePackage = function (cwd, locator, generatorPath, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fslib_1.xfs.mktempPromise(function (binFolder) { return __awaiter(_this, void 0, void 0, function () {
                            var env, runtimeFile;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, core_1.scriptUtils.makeScriptEnv({ project: opts.project, binFolder: binFolder })];
                                    case 1:
                                        env = _a.sent();
                                        runtimeFile = fslib_1.ppath.join(cwd, "runtime.js");
                                        return [4 /*yield*/, fslib_1.xfs.mktempPromise(function (logDir) { return __awaiter(_this, void 0, void 0, function () {
                                                var logFile, stdin, stdout, stderr, tempDir, buildDir, execEnvValues, nodeOptions, pnpRegularExpression, code;
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0:
                                                            logFile = fslib_1.ppath.join(logDir, "buildfile.log");
                                                            stdin = null;
                                                            stdout = fslib_1.xfs.createWriteStream(logFile);
                                                            stderr = stdout;
                                                            tempDir = fslib_1.ppath.join(cwd, "generator");
                                                            buildDir = fslib_1.ppath.join(cwd, "build");
                                                            return [4 /*yield*/, fslib_1.xfs.mkdirPromise(tempDir)];
                                                        case 1:
                                                            _a.sent();
                                                            return [4 /*yield*/, fslib_1.xfs.mkdirPromise(buildDir)];
                                                        case 2:
                                                            _a.sent();
                                                            execEnvValues = {
                                                                tempDir: fslib_1.npath.fromPortablePath(tempDir),
                                                                buildDir: fslib_1.npath.fromPortablePath(buildDir),
                                                                locator: core_1.structUtils.stringifyLocator(locator)
                                                            };
                                                            return [4 /*yield*/, fslib_1.xfs.writeFilePromise(runtimeFile, "\n          // Expose 'Module' as a global variable\n          Object.defineProperty(global, 'Module', {\n            get: () => require('module'),\n            configurable: true,\n            enumerable: false,\n          });\n\n          // Expose non-hidden built-in modules as global variables\n          for (const name of Module.builtinModules.filter((name) => name !== 'module' && !name.startsWith('_'))) {\n            Object.defineProperty(global, name, {\n              get: () => require(name),\n              configurable: true,\n              enumerable: false,\n            });\n          }\n\n          // Expose the 'execEnv' global variable\n          Object.defineProperty(global, 'execEnv', {\n            value: {\n              ...".concat(JSON.stringify(execEnvValues), ",\n            },\n            enumerable: true,\n          });\n        "))];
                                                        case 3:
                                                            _a.sent();
                                                            nodeOptions = env.NODE_OPTIONS || "";
                                                            pnpRegularExpression = /\s*--require\s+\S*\.pnp\.c?js\s*/g;
                                                            nodeOptions = nodeOptions.replace(pnpRegularExpression, " ").trim();
                                                            env.NODE_OPTIONS = nodeOptions;
                                                            stdout.write("# This file contains the result of Yarn generating a package (".concat(core_1.structUtils.stringifyLocator(locator), ")\n"));
                                                            stdout.write("\n");
                                                            return [4 /*yield*/, core_1.execUtils.pipevp(process.execPath, ["--require", fslib_1.npath.fromPortablePath(runtimeFile), fslib_1.npath.fromPortablePath(generatorPath), core_1.structUtils.stringifyIdent(locator)], { cwd: cwd, env: env, stdin: stdin, stdout: stdout, stderr: stderr })];
                                                        case 4:
                                                            code = (_a.sent()).code;
                                                            if (code !== 0) {
                                                                fslib_1.xfs.detachTemp(logDir);
                                                                throw new Error("Package generation failed (exit code ".concat(code, ", logs can be found here: ").concat(core_2.formatUtils.pretty(opts.project.configuration, logFile, core_2.formatUtils.Type.PATH), ")"));
                                                            }
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); })];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return ExecFetcher;
}());
exports.ExecFetcher = ExecFetcher;
