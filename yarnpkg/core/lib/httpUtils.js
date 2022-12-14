"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.del = exports.post = exports.put = exports.get = exports.request = exports.Method = exports.getNetworkSettings = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const https_1 = require("https");
const http_1 = require("http");
const micromatch_1 = tslib_1.__importDefault(require("micromatch"));
const tunnel_1 = tslib_1.__importDefault(require("tunnel"));
const url_1 = require("url");
const MessageName_1 = require("./MessageName");
const Report_1 = require("./Report");
const formatUtils = tslib_1.__importStar(require("./formatUtils"));
const miscUtils = tslib_1.__importStar(require("./miscUtils"));
const cache = new Map();
const fileCache = new Map();
const globalHttpAgent = new http_1.Agent({ keepAlive: true });
const globalHttpsAgent = new https_1.Agent({ keepAlive: true });
function parseProxy(specifier) {
    const url = new url_1.URL(specifier);
    const proxy = { host: url.hostname, headers: {} };
    if (url.port)
        proxy.port = Number(url.port);
    if (url.username && url.password)
        proxy.proxyAuth = `${url.username}:${url.password}`;
    return { proxy };
}
async function getCachedFile(filePath) {
    return miscUtils.getFactoryWithDefault(fileCache, filePath, () => {
        return fslib_1.xfs.readFilePromise(filePath).then(file => {
            fileCache.set(filePath, file);
            return file;
        });
    });
}
function prettyResponseCode({ statusCode, statusMessage }, configuration) {
    const prettyStatusCode = formatUtils.pretty(configuration, statusCode, formatUtils.Type.NUMBER);
    const href = `https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${statusCode}`;
    return formatUtils.applyHyperlink(configuration, `${prettyStatusCode}${statusMessage ? ` (${statusMessage})` : ``}`, href);
}
async function prettyNetworkError(response, { configuration, customErrorMessage }) {
    var _a, _b;
    try {
        return await response;
    }
    catch (err) {
        if (err.name !== `HTTPError`)
            throw err;
        let message = (_a = customErrorMessage === null || customErrorMessage === void 0 ? void 0 : customErrorMessage(err, configuration)) !== null && _a !== void 0 ? _a : (_b = err.response.body) === null || _b === void 0 ? void 0 : _b.error;
        if (message == null) {
            if (err.message.startsWith(`Response code`)) {
                message = `The remote server failed to provide the requested resource`;
            }
            else {
                message = err.message;
            }
        }
        if (err.code === `ETIMEDOUT` && err.event === `socket`)
            message += `(can be increased via ${formatUtils.pretty(configuration, `httpTimeout`, formatUtils.Type.SETTING)})`;
        const networkError = new Report_1.ReportError(MessageName_1.MessageName.NETWORK_ERROR, message, report => {
            if (err.response) {
                report.reportError(MessageName_1.MessageName.NETWORK_ERROR, `  ${formatUtils.prettyField(configuration, {
                    label: `Response Code`,
                    value: formatUtils.tuple(formatUtils.Type.NO_HINT, prettyResponseCode(err.response, configuration)),
                })}`);
            }
            if (err.request) {
                report.reportError(MessageName_1.MessageName.NETWORK_ERROR, `  ${formatUtils.prettyField(configuration, {
                    label: `Request Method`,
                    value: formatUtils.tuple(formatUtils.Type.NO_HINT, err.request.options.method),
                })}`);
                report.reportError(MessageName_1.MessageName.NETWORK_ERROR, `  ${formatUtils.prettyField(configuration, {
                    label: `Request URL`,
                    value: formatUtils.tuple(formatUtils.Type.URL, err.request.requestUrl),
                })}`);
            }
            if (err.request.redirects.length > 0) {
                report.reportError(MessageName_1.MessageName.NETWORK_ERROR, `  ${formatUtils.prettyField(configuration, {
                    label: `Request Redirects`,
                    value: formatUtils.tuple(formatUtils.Type.NO_HINT, formatUtils.prettyList(configuration, err.request.redirects, formatUtils.Type.URL)),
                })}`);
            }
            if (err.request.retryCount === err.request.options.retry.limit) {
                report.reportError(MessageName_1.MessageName.NETWORK_ERROR, `  ${formatUtils.prettyField(configuration, {
                    label: `Request Retry Count`,
                    value: formatUtils.tuple(formatUtils.Type.NO_HINT, `${formatUtils.pretty(configuration, err.request.retryCount, formatUtils.Type.NUMBER)} (can be increased via ${formatUtils.pretty(configuration, `httpRetry`, formatUtils.Type.SETTING)})`),
                })}`);
            }
        });
        networkError.originalError = err;
        throw networkError;
    }
}
/**
 * Searches through networkSettings and returns the most specific match
 */
function getNetworkSettings(target, opts) {
    // Sort the config by key length to match on the most specific pattern
    const networkSettings = [...opts.configuration.get(`networkSettings`)].sort(([keyA], [keyB]) => {
        return keyB.length - keyA.length;
    });
    const mergedNetworkSettings = {
        enableNetwork: undefined,
        httpsCaFilePath: undefined,
        httpProxy: undefined,
        httpsProxy: undefined,
        httpsKeyFilePath: undefined,
        httpsCertFilePath: undefined,
    };
    const mergableKeys = Object.keys(mergedNetworkSettings);
    const url = typeof target === `string` ? new url_1.URL(target) : target;
    for (const [glob, config] of networkSettings) {
        if (micromatch_1.default.isMatch(url.hostname, glob)) {
            for (const key of mergableKeys) {
                const setting = config.get(key);
                if (setting !== null && typeof mergedNetworkSettings[key] === `undefined`) {
                    mergedNetworkSettings[key] = setting;
                }
            }
        }
    }
    // Apply defaults
    for (const key of mergableKeys)
        if (typeof mergedNetworkSettings[key] === `undefined`)
            mergedNetworkSettings[key] = opts.configuration.get(key);
    return mergedNetworkSettings;
}
exports.getNetworkSettings = getNetworkSettings;
var Method;
(function (Method) {
    Method["GET"] = "GET";
    Method["PUT"] = "PUT";
    Method["POST"] = "POST";
    Method["DELETE"] = "DELETE";
})(Method = exports.Method || (exports.Method = {}));
async function request(target, body, { configuration, headers, jsonRequest, jsonResponse, method = Method.GET }) {
    const realRequest = async () => await requestImpl(target, body, { configuration, headers, jsonRequest, jsonResponse, method });
    const executor = await configuration.reduceHook(hooks => {
        return hooks.wrapNetworkRequest;
    }, realRequest, { target, body, configuration, headers, jsonRequest, jsonResponse, method });
    return await executor();
}
exports.request = request;
async function get(target, { configuration, jsonResponse, customErrorMessage, ...rest }) {
    let entry = miscUtils.getFactoryWithDefault(cache, target, () => {
        return prettyNetworkError(request(target, null, { configuration, ...rest }), { configuration, customErrorMessage }).then(response => {
            cache.set(target, response.body);
            return response.body;
        });
    });
    if (Buffer.isBuffer(entry) === false)
        entry = await entry;
    if (jsonResponse) {
        return JSON.parse(entry.toString());
    }
    else {
        return entry;
    }
}
exports.get = get;
async function put(target, body, { customErrorMessage, ...options }) {
    const response = await prettyNetworkError(request(target, body, { ...options, method: Method.PUT }), { customErrorMessage, configuration: options.configuration });
    return response.body;
}
exports.put = put;
async function post(target, body, { customErrorMessage, ...options }) {
    const response = await prettyNetworkError(request(target, body, { ...options, method: Method.POST }), { customErrorMessage, configuration: options.configuration });
    return response.body;
}
exports.post = post;
async function del(target, { customErrorMessage, ...options }) {
    const response = await prettyNetworkError(request(target, null, { ...options, method: Method.DELETE }), { customErrorMessage, configuration: options.configuration });
    return response.body;
}
exports.del = del;
async function requestImpl(target, body, { configuration, headers, jsonRequest, jsonResponse, method = Method.GET }) {
    const url = typeof target === `string` ? new url_1.URL(target) : target;
    const networkConfig = getNetworkSettings(url, { configuration });
    if (networkConfig.enableNetwork === false)
        throw new Error(`Request to '${url.href}' has been blocked because of your configuration settings`);
    if (url.protocol === `http:` && !micromatch_1.default.isMatch(url.hostname, configuration.get(`unsafeHttpWhitelist`)))
        throw new Error(`Unsafe http requests must be explicitly whitelisted in your configuration (${url.hostname})`);
    const agent = {
        http: networkConfig.httpProxy
            ? tunnel_1.default.httpOverHttp(parseProxy(networkConfig.httpProxy))
            : globalHttpAgent,
        https: networkConfig.httpsProxy
            ? tunnel_1.default.httpsOverHttp(parseProxy(networkConfig.httpsProxy))
            : globalHttpsAgent,
    };
    const gotOptions = { agent, headers, method };
    gotOptions.responseType = jsonResponse
        ? `json`
        : `buffer`;
    if (body !== null) {
        if (Buffer.isBuffer(body) || (!jsonRequest && typeof body === `string`)) {
            gotOptions.body = body;
        }
        else {
            // @ts-expect-error: The got types only allow an object, but got can stringify any valid JSON
            gotOptions.json = body;
        }
    }
    const socketTimeout = configuration.get(`httpTimeout`);
    const retry = configuration.get(`httpRetry`);
    const rejectUnauthorized = configuration.get(`enableStrictSsl`);
    const httpsCaFilePath = networkConfig.httpsCaFilePath;
    const httpsCertFilePath = networkConfig.httpsCertFilePath;
    const httpsKeyFilePath = networkConfig.httpsKeyFilePath;
    const { default: got } = await Promise.resolve().then(() => tslib_1.__importStar(require(`got`)));
    const certificateAuthority = httpsCaFilePath
        ? await getCachedFile(httpsCaFilePath)
        : undefined;
    const certificate = httpsCertFilePath
        ? await getCachedFile(httpsCertFilePath)
        : undefined;
    const key = httpsKeyFilePath
        ? await getCachedFile(httpsKeyFilePath)
        : undefined;
    const gotClient = got.extend({
        timeout: {
            socket: socketTimeout,
        },
        retry,
        https: {
            rejectUnauthorized,
            certificateAuthority,
            certificate,
            key,
        },
        ...gotOptions,
    });
    return configuration.getLimit(`networkConcurrency`)(() => {
        return gotClient(url);
    });
}
