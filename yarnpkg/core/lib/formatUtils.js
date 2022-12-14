"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLogFilterSupport = exports.LogLevel = exports.prettyField = exports.mark = exports.jsonOrPretty = exports.json = exports.prettyList = exports.pretty = exports.applyHyperlink = exports.applyColor = exports.applyStyle = exports.tuple = exports.supportsHyperlinks = exports.supportsColor = exports.Style = exports.Type = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const ci_info_1 = tslib_1.__importDefault(require("ci-info"));
const clipanion_1 = require("clipanion");
const micromatch_1 = tslib_1.__importDefault(require("micromatch"));
const strip_ansi_1 = tslib_1.__importDefault(require("strip-ansi"));
const MessageName_1 = require("./MessageName");
const miscUtils = tslib_1.__importStar(require("./miscUtils"));
const structUtils = tslib_1.__importStar(require("./structUtils"));
const types_1 = require("./types");
// We have to workaround a TS bug:
// https://github.com/microsoft/TypeScript/issues/35329
//
// We also can't use const enum because Babel doesn't support them:
// https://github.com/babel/babel/issues/8741
//
exports.Type = {
    NO_HINT: `NO_HINT`,
    NULL: `NULL`,
    SCOPE: `SCOPE`,
    NAME: `NAME`,
    RANGE: `RANGE`,
    REFERENCE: `REFERENCE`,
    NUMBER: `NUMBER`,
    PATH: `PATH`,
    URL: `URL`,
    ADDED: `ADDED`,
    REMOVED: `REMOVED`,
    CODE: `CODE`,
    DURATION: `DURATION`,
    SIZE: `SIZE`,
    IDENT: `IDENT`,
    DESCRIPTOR: `DESCRIPTOR`,
    LOCATOR: `LOCATOR`,
    RESOLUTION: `RESOLUTION`,
    DEPENDENT: `DEPENDENT`,
    PACKAGE_EXTENSION: `PACKAGE_EXTENSION`,
    SETTING: `SETTING`,
    MARKDOWN: `MARKDOWN`,
};
var Style;
(function (Style) {
    Style[Style["BOLD"] = 2] = "BOLD";
})(Style = exports.Style || (exports.Style = {}));
const chalkOptions = ci_info_1.default.GITHUB_ACTIONS
    ? { level: 2 }
    : chalk_1.default.supportsColor
        ? { level: chalk_1.default.supportsColor.level }
        : { level: 0 };
exports.supportsColor = chalkOptions.level !== 0;
exports.supportsHyperlinks = exports.supportsColor && !ci_info_1.default.GITHUB_ACTIONS && !ci_info_1.default.CIRCLE && !ci_info_1.default.GITLAB;
const chalkInstance = new chalk_1.default.Instance(chalkOptions);
const colors = new Map([
    [exports.Type.NO_HINT, null],
    [exports.Type.NULL, [`#a853b5`, 129]],
    [exports.Type.SCOPE, [`#d75f00`, 166]],
    [exports.Type.NAME, [`#d7875f`, 173]],
    [exports.Type.RANGE, [`#00afaf`, 37]],
    [exports.Type.REFERENCE, [`#87afff`, 111]],
    [exports.Type.NUMBER, [`#ffd700`, 220]],
    [exports.Type.PATH, [`#d75fd7`, 170]],
    [exports.Type.URL, [`#d75fd7`, 170]],
    [exports.Type.ADDED, [`#5faf00`, 70]],
    [exports.Type.REMOVED, [`#d70000`, 160]],
    [exports.Type.CODE, [`#87afff`, 111]],
    [exports.Type.SIZE, [`#ffd700`, 220]],
]);
// Just to make sure that the individual fields of the transform map have
// compatible parameter types, without upcasting the map to a too generic type
//
// We also take the opportunity to downcast the configuration into `any`,
// otherwise TypeScript will detect a circular reference and won't allow us to
// properly type the `format` method from Configuration. Since transforms are
// internal to this file, it should be fine.
const validateTransform = (spec) => spec;
const transforms = {
    [exports.Type.NUMBER]: validateTransform({
        pretty: (configuration, value) => {
            return `${value}`;
        },
        json: (value) => {
            return value;
        },
    }),
    [exports.Type.IDENT]: validateTransform({
        pretty: (configuration, ident) => {
            return structUtils.prettyIdent(configuration, ident);
        },
        json: (ident) => {
            return structUtils.stringifyIdent(ident);
        },
    }),
    [exports.Type.LOCATOR]: validateTransform({
        pretty: (configuration, locator) => {
            return structUtils.prettyLocator(configuration, locator);
        },
        json: (locator) => {
            return structUtils.stringifyLocator(locator);
        },
    }),
    [exports.Type.DESCRIPTOR]: validateTransform({
        pretty: (configuration, descriptor) => {
            return structUtils.prettyDescriptor(configuration, descriptor);
        },
        json: (descriptor) => {
            return structUtils.stringifyDescriptor(descriptor);
        },
    }),
    [exports.Type.RESOLUTION]: validateTransform({
        pretty: (configuration, { descriptor, locator }) => {
            return structUtils.prettyResolution(configuration, descriptor, locator);
        },
        json: ({ descriptor, locator }) => {
            return {
                descriptor: structUtils.stringifyDescriptor(descriptor),
                locator: locator !== null
                    ? structUtils.stringifyLocator(locator)
                    : null,
            };
        },
    }),
    [exports.Type.DEPENDENT]: validateTransform({
        pretty: (configuration, { locator, descriptor }) => {
            return structUtils.prettyDependent(configuration, locator, descriptor);
        },
        json: ({ locator, descriptor }) => {
            return {
                locator: structUtils.stringifyLocator(locator),
                descriptor: structUtils.stringifyDescriptor(descriptor),
            };
        },
    }),
    [exports.Type.PACKAGE_EXTENSION]: validateTransform({
        pretty: (configuration, packageExtension) => {
            switch (packageExtension.type) {
                case types_1.PackageExtensionType.Dependency:
                    return `${structUtils.prettyIdent(configuration, packageExtension.parentDescriptor)} ??? ${applyColor(configuration, `dependencies`, exports.Type.CODE)} ??? ${structUtils.prettyIdent(configuration, packageExtension.descriptor)}`;
                case types_1.PackageExtensionType.PeerDependency:
                    return `${structUtils.prettyIdent(configuration, packageExtension.parentDescriptor)} ??? ${applyColor(configuration, `peerDependencies`, exports.Type.CODE)} ??? ${structUtils.prettyIdent(configuration, packageExtension.descriptor)}`;
                case types_1.PackageExtensionType.PeerDependencyMeta:
                    return `${structUtils.prettyIdent(configuration, packageExtension.parentDescriptor)} ??? ${applyColor(configuration, `peerDependenciesMeta`, exports.Type.CODE)} ??? ${structUtils.prettyIdent(configuration, structUtils.parseIdent(packageExtension.selector))} ??? ${applyColor(configuration, packageExtension.key, exports.Type.CODE)}`;
                default:
                    throw new Error(`Assertion failed: Unsupported package extension type: ${packageExtension.type}`);
            }
        },
        json: (packageExtension) => {
            switch (packageExtension.type) {
                case types_1.PackageExtensionType.Dependency:
                    return `${structUtils.stringifyIdent(packageExtension.parentDescriptor)} > ${structUtils.stringifyIdent(packageExtension.descriptor)}`;
                case types_1.PackageExtensionType.PeerDependency:
                    return `${structUtils.stringifyIdent(packageExtension.parentDescriptor)} >> ${structUtils.stringifyIdent(packageExtension.descriptor)}`;
                case types_1.PackageExtensionType.PeerDependencyMeta:
                    return `${structUtils.stringifyIdent(packageExtension.parentDescriptor)} >> ${packageExtension.selector} / ${packageExtension.key}`;
                default:
                    throw new Error(`Assertion failed: Unsupported package extension type: ${packageExtension.type}`);
            }
        },
    }),
    [exports.Type.SETTING]: validateTransform({
        pretty: (configuration, settingName) => {
            // Asserts that the setting is valid
            configuration.get(settingName);
            return applyHyperlink(configuration, applyColor(configuration, settingName, exports.Type.CODE), `https://yarnpkg.com/configuration/yarnrc#${settingName}`);
        },
        json: (settingName) => {
            return settingName;
        },
    }),
    [exports.Type.DURATION]: validateTransform({
        pretty: (configuration, duration) => {
            if (duration > 1000 * 60) {
                const minutes = Math.floor(duration / 1000 / 60);
                const seconds = Math.ceil((duration - minutes * 60 * 1000) / 1000);
                return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
            }
            else {
                const seconds = Math.floor(duration / 1000);
                const milliseconds = duration - seconds * 1000;
                return milliseconds === 0 ? `${seconds}s` : `${seconds}s ${milliseconds}ms`;
            }
        },
        json: (duration) => {
            return duration;
        },
    }),
    [exports.Type.SIZE]: validateTransform({
        pretty: (configuration, size) => {
            const thresholds = [`KB`, `MB`, `GB`, `TB`];
            let power = thresholds.length;
            while (power > 1 && size < 1024 ** power)
                power -= 1;
            const factor = 1024 ** power;
            const value = Math.floor(size * 100 / factor) / 100;
            return applyColor(configuration, `${value} ${thresholds[power - 1]}`, exports.Type.NUMBER);
        },
        json: (size) => {
            return size;
        },
    }),
    [exports.Type.PATH]: validateTransform({
        pretty: (configuration, filePath) => {
            return applyColor(configuration, fslib_1.npath.fromPortablePath(filePath), exports.Type.PATH);
        },
        json: (filePath) => {
            return fslib_1.npath.fromPortablePath(filePath);
        },
    }),
    [exports.Type.MARKDOWN]: validateTransform({
        pretty: (configuration, { text, format, paragraphs }) => {
            return (0, clipanion_1.formatMarkdownish)(text, { format, paragraphs });
        },
        json: ({ text }) => {
            return text;
        },
    }),
};
function tuple(formatType, value) {
    return [value, formatType];
}
exports.tuple = tuple;
function applyStyle(configuration, text, flags) {
    if (!configuration.get(`enableColors`))
        return text;
    if (flags & Style.BOLD)
        text = chalk_1.default.bold(text);
    return text;
}
exports.applyStyle = applyStyle;
function applyColor(configuration, value, formatType) {
    if (!configuration.get(`enableColors`))
        return value;
    const colorSpec = colors.get(formatType);
    if (colorSpec === null)
        return value;
    const color = typeof colorSpec === `undefined`
        ? formatType
        : chalkOptions.level >= 3
            ? colorSpec[0]
            : colorSpec[1];
    const fn = typeof color === `number`
        ? chalkInstance.ansi256(color)
        : color.startsWith(`#`)
            ? chalkInstance.hex(color)
            : chalkInstance[color];
    if (typeof fn !== `function`)
        throw new Error(`Invalid format type ${color}`);
    return fn(value);
}
exports.applyColor = applyColor;
const isKonsole = !!process.env.KONSOLE_VERSION;
function applyHyperlink(configuration, text, href) {
    // Only print hyperlinks if allowed per configuration
    if (!configuration.get(`enableHyperlinks`))
        return text;
    // We use ESC as ST for Konsole because it doesn't support
    // the non-standard BEL character for hyperlinks
    if (isKonsole)
        return `\u001b]8;;${href}\u001b\\${text}\u001b]8;;\u001b\\`;
    // We use BELL as ST because it seems that iTerm doesn't properly support
    // the \x1b\\ sequence described in the reference document
    // https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda#the-escape-sequence
    return `\u001b]8;;${href}\u0007${text}\u001b]8;;\u0007`;
}
exports.applyHyperlink = applyHyperlink;
function pretty(configuration, value, formatType) {
    if (value === null)
        return applyColor(configuration, `null`, exports.Type.NULL);
    if (Object.prototype.hasOwnProperty.call(transforms, formatType)) {
        const transform = transforms[formatType];
        const typedTransform = transform;
        return typedTransform.pretty(configuration, value);
    }
    if (typeof value !== `string`)
        throw new Error(`Assertion failed: Expected the value to be a string, got ${typeof value}`);
    return applyColor(configuration, value, formatType);
}
exports.pretty = pretty;
function prettyList(configuration, values, formatType, { separator = `, ` } = {}) {
    return [...values].map(value => pretty(configuration, value, formatType)).join(separator);
}
exports.prettyList = prettyList;
function json(value, formatType) {
    if (value === null)
        return null;
    if (Object.prototype.hasOwnProperty.call(transforms, formatType)) {
        miscUtils.overrideType(formatType);
        return transforms[formatType].json(value);
    }
    if (typeof value !== `string`)
        throw new Error(`Assertion failed: Expected the value to be a string, got ${typeof value}`);
    return value;
}
exports.json = json;
function jsonOrPretty(outputJson, configuration, [value, formatType]) {
    return outputJson
        ? json(value, formatType)
        : pretty(configuration, value, formatType);
}
exports.jsonOrPretty = jsonOrPretty;
function mark(configuration) {
    return {
        Check: applyColor(configuration, `???`, `green`),
        Cross: applyColor(configuration, `???`, `red`),
        Question: applyColor(configuration, `?`, `cyan`),
    };
}
exports.mark = mark;
function prettyField(configuration, { label, value: [value, formatType] }) {
    return `${pretty(configuration, label, exports.Type.CODE)}: ${pretty(configuration, value, formatType)}`;
}
exports.prettyField = prettyField;
var LogLevel;
(function (LogLevel) {
    LogLevel["Error"] = "error";
    LogLevel["Warning"] = "warning";
    LogLevel["Info"] = "info";
    LogLevel["Discard"] = "discard";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
/**
 * Add support support for the `logFilters` setting to the specified Report
 * instance.
 */
function addLogFilterSupport(report, { configuration }) {
    const logFilters = configuration.get(`logFilters`);
    const logFiltersByCode = new Map();
    const logFiltersByText = new Map();
    const logFiltersByPatternMatcher = [];
    for (const filter of logFilters) {
        const level = filter.get(`level`);
        if (typeof level === `undefined`)
            continue;
        const code = filter.get(`code`);
        if (typeof code !== `undefined`)
            logFiltersByCode.set(code, level);
        const text = filter.get(`text`);
        if (typeof text !== `undefined`)
            logFiltersByText.set(text, level);
        const pattern = filter.get(`pattern`);
        if (typeof pattern !== `undefined`) {
            logFiltersByPatternMatcher.push([micromatch_1.default.matcher(pattern, { contains: true }), level]);
        }
    }
    // Higher priority to the last patterns, just like other filters
    logFiltersByPatternMatcher.reverse();
    const findLogLevel = (name, text, defaultLevel) => {
        if (name === null || name === MessageName_1.MessageName.UNNAMED)
            return defaultLevel;
        // Avoid processing the string unless we know we'll actually need it
        const strippedText = logFiltersByText.size > 0 || logFiltersByPatternMatcher.length > 0
            ? (0, strip_ansi_1.default)(text)
            : text;
        if (logFiltersByText.size > 0) {
            const level = logFiltersByText.get(strippedText);
            if (typeof level !== `undefined`) {
                return level !== null && level !== void 0 ? level : defaultLevel;
            }
        }
        if (logFiltersByPatternMatcher.length > 0) {
            for (const [filterMatcher, filterLevel] of logFiltersByPatternMatcher) {
                if (filterMatcher(strippedText)) {
                    return filterLevel !== null && filterLevel !== void 0 ? filterLevel : defaultLevel;
                }
            }
        }
        if (logFiltersByCode.size > 0) {
            const level = logFiltersByCode.get((0, MessageName_1.stringifyMessageName)(name));
            if (typeof level !== `undefined`) {
                return level !== null && level !== void 0 ? level : defaultLevel;
            }
        }
        return defaultLevel;
    };
    const reportInfo = report.reportInfo;
    const reportWarning = report.reportWarning;
    const reportError = report.reportError;
    const routeMessage = function (report, name, text, level) {
        switch (findLogLevel(name, text, level)) {
            case LogLevel.Info:
                {
                    reportInfo.call(report, name, text);
                }
                break;
            case LogLevel.Warning:
                {
                    reportWarning.call(report, name !== null && name !== void 0 ? name : MessageName_1.MessageName.UNNAMED, text);
                }
                break;
            case LogLevel.Error:
                {
                    reportError.call(report, name !== null && name !== void 0 ? name : MessageName_1.MessageName.UNNAMED, text);
                }
                break;
        }
    };
    report.reportInfo = function (...args) {
        return routeMessage(this, ...args, LogLevel.Info);
    };
    report.reportWarning = function (...args) {
        return routeMessage(this, ...args, LogLevel.Warning);
    };
    report.reportError = function (...args) {
        return routeMessage(this, ...args, LogLevel.Error);
    };
}
exports.addLogFilterSupport = addLogFilterSupport;
