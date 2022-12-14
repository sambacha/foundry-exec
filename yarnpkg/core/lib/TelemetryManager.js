"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryManager = exports.MetricName = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const hashUtils = tslib_1.__importStar(require("./hashUtils"));
const httpUtils = tslib_1.__importStar(require("./httpUtils"));
const miscUtils = tslib_1.__importStar(require("./miscUtils"));
var MetricName;
(function (MetricName) {
    MetricName["VERSION"] = "version";
    MetricName["COMMAND_NAME"] = "commandName";
    MetricName["PLUGIN_NAME"] = "pluginName";
    MetricName["INSTALL_COUNT"] = "installCount";
    MetricName["PROJECT_COUNT"] = "projectCount";
    MetricName["WORKSPACE_COUNT"] = "workspaceCount";
    MetricName["DEPENDENCY_COUNT"] = "dependencyCount";
    MetricName["EXTENSION"] = "packageExtension";
})(MetricName = exports.MetricName || (exports.MetricName = {}));
class TelemetryManager {
    constructor(configuration, accountId) {
        this.values = new Map();
        this.hits = new Map();
        this.enumerators = new Map();
        this.configuration = configuration;
        const registryFile = this.getRegistryPath();
        this.isNew = !fslib_1.xfs.existsSync(registryFile);
        this.sendReport(accountId);
        this.startBuffer();
    }
    reportVersion(value) {
        // We don't really care about the exact commit they're using
        this.reportValue(MetricName.VERSION, value.replace(/-git\..*/, `-git`));
    }
    reportCommandName(value) {
        this.reportValue(MetricName.COMMAND_NAME, value || `<none>`);
    }
    reportPluginName(value) {
        this.reportValue(MetricName.PLUGIN_NAME, value);
    }
    reportProject(cwd) {
        this.reportEnumerator(MetricName.PROJECT_COUNT, cwd);
    }
    reportInstall(nodeLinker) {
        this.reportHit(MetricName.INSTALL_COUNT, nodeLinker);
    }
    reportPackageExtension(value) {
        this.reportValue(MetricName.EXTENSION, value);
    }
    reportWorkspaceCount(count) {
        this.reportValue(MetricName.WORKSPACE_COUNT, String(count));
    }
    reportDependencyCount(count) {
        this.reportValue(MetricName.DEPENDENCY_COUNT, String(count));
    }
    reportValue(metric, value) {
        miscUtils.getSetWithDefault(this.values, metric).add(value);
    }
    reportEnumerator(metric, value) {
        miscUtils.getSetWithDefault(this.enumerators, metric).add(hashUtils.makeHash(value));
    }
    reportHit(metric, extra = `*`) {
        const ns = miscUtils.getMapWithDefault(this.hits, metric);
        const current = miscUtils.getFactoryWithDefault(ns, extra, () => 0);
        ns.set(extra, current + 1);
    }
    getRegistryPath() {
        const registryFile = this.configuration.get(`globalFolder`);
        return fslib_1.ppath.join(registryFile, `telemetry.json`);
    }
    sendReport(accountId) {
        var _a, _b, _c;
        const registryFile = this.getRegistryPath();
        let content;
        try {
            content = fslib_1.xfs.readJsonSync(registryFile);
        }
        catch {
            content = {};
        }
        const now = Date.now();
        const interval = this.configuration.get(`telemetryInterval`) * 24 * 60 * 60 * 1000;
        const lastUpdate = (_a = content.lastUpdate) !== null && _a !== void 0 ? _a : now + interval + Math.floor(interval * Math.random());
        const nextUpdate = lastUpdate + interval;
        if (nextUpdate > now && content.lastUpdate != null)
            return;
        try {
            fslib_1.xfs.mkdirSync(fslib_1.ppath.dirname(registryFile), { recursive: true });
            fslib_1.xfs.writeJsonSync(registryFile, { lastUpdate: now });
        }
        catch {
            // In some cases this location is read-only. Too bad ?????????????
            return;
        }
        if (nextUpdate > now)
            return;
        if (!content.blocks)
            return;
        const rawUrl = `https://browser-http-intake.logs.datadoghq.eu/v1/input/${accountId}?ddsource=yarn`;
        const sendPayload = (payload) => httpUtils.post(rawUrl, payload, {
            configuration: this.configuration,
        }).catch(() => {
            // Nothing we can do
        });
        for (const [userId, block] of Object.entries((_b = content.blocks) !== null && _b !== void 0 ? _b : {})) {
            if (Object.keys(block).length === 0)
                continue;
            const upload = block;
            upload.userId = userId;
            upload.reportType = `primary`;
            for (const key of Object.keys((_c = upload.enumerators) !== null && _c !== void 0 ? _c : {}))
                upload.enumerators[key] = upload.enumerators[key].length;
            sendPayload(upload);
            // Datadog doesn't support well sending multiple tags in a single
            // payload, so we instead send them separately, at most one value
            // per query (we still aggregate different tags together).
            const toSend = new Map();
            // Also the max amount of queries (at worst once a week, remember)
            const maxValues = 20;
            for (const [metricName, values] of Object.entries(upload.values))
                if (values.length > 0)
                    toSend.set(metricName, values.slice(0, maxValues));
            while (toSend.size > 0) {
                const upload = {};
                upload.userId = userId;
                upload.reportType = `secondary`;
                upload.metrics = {};
                for (const [metricName, values] of toSend) {
                    upload.metrics[metricName] = values.shift();
                    if (values.length === 0) {
                        toSend.delete(metricName);
                    }
                }
                sendPayload(upload);
            }
        }
    }
    applyChanges() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const registryFile = this.getRegistryPath();
        let content;
        try {
            content = fslib_1.xfs.readJsonSync(registryFile);
        }
        catch {
            content = {};
        }
        const userId = (_a = this.configuration.get(`telemetryUserId`)) !== null && _a !== void 0 ? _a : `*`;
        const blocks = content.blocks = (_b = content.blocks) !== null && _b !== void 0 ? _b : {};
        const block = blocks[userId] = (_c = blocks[userId]) !== null && _c !== void 0 ? _c : {};
        for (const key of this.hits.keys()) {
            const store = block.hits = (_d = block.hits) !== null && _d !== void 0 ? _d : {};
            const ns = store[key] = (_e = store[key]) !== null && _e !== void 0 ? _e : {};
            for (const [extra, value] of this.hits.get(key)) {
                ns[extra] = ((_f = ns[extra]) !== null && _f !== void 0 ? _f : 0) + value;
            }
        }
        for (const field of [`values`, `enumerators`]) {
            for (const key of this[field].keys()) {
                const store = block[field] = (_g = block[field]) !== null && _g !== void 0 ? _g : {};
                store[key] = [...new Set([
                        ...(_h = store[key]) !== null && _h !== void 0 ? _h : [],
                        ...(_j = this[field].get(key)) !== null && _j !== void 0 ? _j : [],
                    ])];
            }
        }
        fslib_1.xfs.mkdirSync(fslib_1.ppath.dirname(registryFile), { recursive: true });
        fslib_1.xfs.writeJsonSync(registryFile, content);
    }
    startBuffer() {
        process.on(`exit`, () => {
            try {
                this.applyChanges();
            }
            catch {
                // Explicitly ignore errors
            }
        });
    }
}
exports.TelemetryManager = TelemetryManager;
