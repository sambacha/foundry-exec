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
exports.loadGeneratorFile = exports.makeLocator = exports.makeSpec = exports.parseSpec = void 0;
var core_1 = require("@yarnpkg/core");
var fslib_1 = require("@yarnpkg/fslib");
function parseSpec(spec) {
    var _a = core_1.structUtils.parseRange(spec), params = _a.params, selector = _a.selector;
    var path = fslib_1.npath.toPortablePath(selector);
    var parentLocator = params && typeof params.locator === "string"
        ? core_1.structUtils.parseLocator(params.locator)
        : null;
    return { parentLocator: parentLocator, path: path };
}
exports.parseSpec = parseSpec;
function makeSpec(_a) {
    var parentLocator = _a.parentLocator, path = _a.path, generatorHash = _a.generatorHash, protocol = _a.protocol;
    var parentLocatorSpread = parentLocator !== null
        ? { locator: core_1.structUtils.stringifyLocator(parentLocator) }
        : {};
    var generatorHashSpread = typeof generatorHash !== "undefined"
        ? { hash: generatorHash }
        : {};
    return core_1.structUtils.makeRange({
        protocol: protocol,
        source: path,
        selector: path,
        params: __assign(__assign({}, generatorHashSpread), parentLocatorSpread)
    });
}
exports.makeSpec = makeSpec;
function makeLocator(ident, _a) {
    var parentLocator = _a.parentLocator, path = _a.path, generatorHash = _a.generatorHash, protocol = _a.protocol;
    return core_1.structUtils.makeLocator(ident, makeSpec({ parentLocator: parentLocator, path: path, generatorHash: generatorHash, protocol: protocol }));
}
exports.makeLocator = makeLocator;
function loadGeneratorFile(range, protocol, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, parentLocator, path, parentFetch, _b, effectiveParentFetch, generatorFs, generatorPath;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = core_1.structUtils.parseFileStyleRange(range, { protocol: protocol }), parentLocator = _a.parentLocator, path = _a.path;
                    if (!fslib_1.ppath.isAbsolute(path)) return [3 /*break*/, 1];
                    _b = { packageFs: new fslib_1.CwdFS(fslib_1.PortablePath.root), prefixPath: fslib_1.PortablePath.dot, localPath: fslib_1.PortablePath.root };
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, opts.fetcher.fetch(parentLocator, opts)];
                case 2:
                    _b = _c.sent();
                    _c.label = 3;
                case 3:
                    parentFetch = _b;
                    effectiveParentFetch = parentFetch.localPath
                        ? { packageFs: new fslib_1.CwdFS(fslib_1.PortablePath.root), prefixPath: fslib_1.ppath.relative(fslib_1.PortablePath.root, parentFetch.localPath) }
                        : parentFetch;
                    // Discard the parent fs unless we really need it to access the files
                    if (parentFetch !== effectiveParentFetch && parentFetch.releaseFs)
                        parentFetch.releaseFs();
                    generatorFs = effectiveParentFetch.packageFs;
                    generatorPath = fslib_1.ppath.join(effectiveParentFetch.prefixPath, path);
                    return [4 /*yield*/, generatorFs.readFilePromise(generatorPath, "utf8")];
                case 4: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
exports.loadGeneratorFile = loadGeneratorFile;
