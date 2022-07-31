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
exports.ExecResolver = void 0;
var core_1 = require("@yarnpkg/core");
var core_2 = require("@yarnpkg/core");
var core_3 = require("@yarnpkg/core");
var constants_1 = require("./constants");
var execUtils = require("./execUtils");
// We use this for the generators to be regenerated without bumping the whole cache
var CACHE_VERSION = 2;
var ExecResolver = /** @class */ (function () {
    function ExecResolver() {
    }
    ExecResolver.prototype.supportsDescriptor = function (descriptor, opts) {
        if (!descriptor.range.startsWith(constants_1.PROTOCOL))
            return false;
        return true;
    };
    ExecResolver.prototype.supportsLocator = function (locator, opts) {
        if (!locator.reference.startsWith(constants_1.PROTOCOL))
            return false;
        return true;
    };
    ExecResolver.prototype.shouldPersistResolution = function (locator, opts) {
        return false;
    };
    ExecResolver.prototype.bindDescriptor = function (descriptor, fromLocator, opts) {
        return core_3.structUtils.bindDescriptor(descriptor, {
            locator: core_3.structUtils.stringifyLocator(fromLocator)
        });
    };
    ExecResolver.prototype.getResolutionDependencies = function (descriptor, opts) {
        return {};
    };
    ExecResolver.prototype.getCandidates = function (descriptor, dependencies, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, path, parentLocator, generatorFile, generatorHash;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!opts.fetchOptions)
                            throw new Error("Assertion failed: This resolver cannot be used unless a fetcher is configured");
                        _a = execUtils.parseSpec(descriptor.range), path = _a.path, parentLocator = _a.parentLocator;
                        if (parentLocator === null)
                            throw new Error("Assertion failed: The descriptor should have been bound");
                        return [4 /*yield*/, execUtils.loadGeneratorFile(core_3.structUtils.makeRange({
                                protocol: constants_1.PROTOCOL,
                                source: path,
                                selector: path,
                                params: {
                                    locator: core_3.structUtils.stringifyLocator(parentLocator)
                                }
                            }), constants_1.PROTOCOL, opts.fetchOptions)];
                    case 1:
                        generatorFile = _b.sent();
                        generatorHash = core_3.hashUtils.makeHash("".concat(CACHE_VERSION), generatorFile).slice(0, 6);
                        return [2 /*return*/, [execUtils.makeLocator(descriptor, { parentLocator: parentLocator, path: path, generatorHash: generatorHash, protocol: constants_1.PROTOCOL })]];
                }
            });
        });
    };
    ExecResolver.prototype.getSatisfying = function (descriptor, dependencies, locators, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var locator;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCandidates(descriptor, dependencies, opts)];
                    case 1:
                        locator = (_a.sent())[0];
                        return [2 /*return*/, {
                                locators: locators.filter(function (candidate) { return candidate.locatorHash === locator.locatorHash; }),
                                sorted: false
                            }];
                }
            });
        });
    };
    ExecResolver.prototype.resolve = function (locator, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var packageFetch, manifest;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!opts.fetchOptions)
                            throw new Error("Assertion failed: This resolver cannot be used unless a fetcher is configured");
                        return [4 /*yield*/, opts.fetchOptions.fetcher.fetch(locator, opts.fetchOptions)];
                    case 1:
                        packageFetch = _a.sent();
                        return [4 /*yield*/, core_3.miscUtils.releaseAfterUseAsync(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, core_1.Manifest.find(packageFetch.prefixPath, { baseFs: packageFetch.packageFs })];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); }, packageFetch.releaseFs)];
                    case 2:
                        manifest = _a.sent();
                        return [2 /*return*/, __assign(__assign({}, locator), { version: manifest.version || "0.0.0", languageName: manifest.languageName || opts.project.configuration.get("defaultLanguageName"), linkType: core_2.LinkType.HARD, conditions: manifest.getConditions(), dependencies: opts.project.configuration.normalizeDependencyMap(manifest.dependencies), peerDependencies: manifest.peerDependencies, dependenciesMeta: manifest.dependenciesMeta, peerDependenciesMeta: manifest.peerDependenciesMeta, bin: manifest.bin })];
                }
            });
        });
    };
    return ExecResolver;
}());
exports.ExecResolver = ExecResolver;
