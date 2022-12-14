"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = exports.isReportError = exports.ReportError = void 0;
const tslib_1 = require("tslib");
const throttle_1 = tslib_1.__importDefault(require("lodash/throttle"));
const stream_1 = require("stream");
const string_decoder_1 = require("string_decoder");
const MessageName_1 = require("./MessageName");
const TITLE_PROGRESS_FPS = 15;
class ReportError extends Error {
    constructor(code, message, reportExtra) {
        super(message);
        this.reportExtra = reportExtra;
        this.reportCode = code;
    }
}
exports.ReportError = ReportError;
function isReportError(error) {
    return typeof error.reportCode !== `undefined`;
}
exports.isReportError = isReportError;
class Report {
    constructor() {
        this.reportedInfos = new Set();
        this.reportedWarnings = new Set();
        this.reportedErrors = new Set();
    }
    static progressViaCounter(max) {
        let current = 0;
        let unlock;
        let lock = new Promise(resolve => {
            unlock = resolve;
        });
        const set = (n) => {
            const thisUnlock = unlock;
            lock = new Promise(resolve => {
                unlock = resolve;
            });
            current = n;
            thisUnlock();
        };
        const tick = (n = 0) => {
            set(current + 1);
        };
        const gen = (async function* () {
            while (current < max) {
                await lock;
                yield {
                    progress: current / max,
                };
            }
        })();
        return {
            [Symbol.asyncIterator]() {
                return gen;
            },
            hasProgress: true,
            hasTitle: false,
            set,
            tick,
        };
    }
    static progressViaTitle() {
        let currentTitle;
        let unlock;
        let lock = new Promise(resolve => {
            unlock = resolve;
        });
        const setTitle = (0, throttle_1.default)((title) => {
            const thisUnlock = unlock;
            lock = new Promise(resolve => {
                unlock = resolve;
            });
            currentTitle = title;
            thisUnlock();
        }, 1000 / TITLE_PROGRESS_FPS);
        const gen = (async function* () {
            while (true) {
                await lock;
                yield {
                    title: currentTitle,
                };
            }
        })();
        return {
            [Symbol.asyncIterator]() {
                return gen;
            },
            hasProgress: false,
            hasTitle: true,
            setTitle,
        };
    }
    async startProgressPromise(progressIt, cb) {
        const reportedProgress = this.reportProgress(progressIt);
        try {
            return await cb(progressIt);
        }
        finally {
            reportedProgress.stop();
        }
    }
    startProgressSync(progressIt, cb) {
        const reportedProgress = this.reportProgress(progressIt);
        try {
            return cb(progressIt);
        }
        finally {
            reportedProgress.stop();
        }
    }
    reportInfoOnce(name, text, opts) {
        var _a;
        const key = opts && opts.key ? opts.key : text;
        if (!this.reportedInfos.has(key)) {
            this.reportedInfos.add(key);
            this.reportInfo(name, text);
            (_a = opts === null || opts === void 0 ? void 0 : opts.reportExtra) === null || _a === void 0 ? void 0 : _a.call(opts, this);
        }
    }
    reportWarningOnce(name, text, opts) {
        var _a;
        const key = opts && opts.key ? opts.key : text;
        if (!this.reportedWarnings.has(key)) {
            this.reportedWarnings.add(key);
            this.reportWarning(name, text);
            (_a = opts === null || opts === void 0 ? void 0 : opts.reportExtra) === null || _a === void 0 ? void 0 : _a.call(opts, this);
        }
    }
    reportErrorOnce(name, text, opts) {
        var _a;
        const key = opts && opts.key ? opts.key : text;
        if (!this.reportedErrors.has(key)) {
            this.reportedErrors.add(key);
            this.reportError(name, text);
            (_a = opts === null || opts === void 0 ? void 0 : opts.reportExtra) === null || _a === void 0 ? void 0 : _a.call(opts, this);
        }
    }
    reportExceptionOnce(error) {
        if (isReportError(error)) {
            this.reportErrorOnce(error.reportCode, error.message, { key: error, reportExtra: error.reportExtra });
        }
        else {
            this.reportErrorOnce(MessageName_1.MessageName.EXCEPTION, error.stack || error.message, { key: error });
        }
    }
    createStreamReporter(prefix = null) {
        const stream = new stream_1.PassThrough();
        const decoder = new string_decoder_1.StringDecoder();
        let buffer = ``;
        stream.on(`data`, chunk => {
            let chunkStr = decoder.write(chunk);
            let lineIndex;
            do {
                lineIndex = chunkStr.indexOf(`\n`);
                if (lineIndex !== -1) {
                    const line = buffer + chunkStr.substring(0, lineIndex);
                    chunkStr = chunkStr.substring(lineIndex + 1);
                    buffer = ``;
                    if (prefix !== null) {
                        this.reportInfo(null, `${prefix} ${line}`);
                    }
                    else {
                        this.reportInfo(null, line);
                    }
                }
            } while (lineIndex !== -1);
            buffer += chunkStr;
        });
        stream.on(`end`, () => {
            const last = decoder.end();
            if (last !== ``) {
                if (prefix !== null) {
                    this.reportInfo(null, `${prefix} ${last}`);
                }
                else {
                    this.reportInfo(null, last);
                }
            }
        });
        return stream;
    }
}
exports.Report = Report;
