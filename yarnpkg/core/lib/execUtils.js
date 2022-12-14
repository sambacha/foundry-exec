"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execvp = exports.pipevp = exports.ExecError = exports.PipeError = exports.EndStrategy = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const cross_spawn_1 = tslib_1.__importDefault(require("cross-spawn"));
const Configuration_1 = require("./Configuration");
const MessageName_1 = require("./MessageName");
const Report_1 = require("./Report");
const formatUtils = tslib_1.__importStar(require("./formatUtils"));
var EndStrategy;
(function (EndStrategy) {
    EndStrategy[EndStrategy["Never"] = 0] = "Never";
    EndStrategy[EndStrategy["ErrorCode"] = 1] = "ErrorCode";
    EndStrategy[EndStrategy["Always"] = 2] = "Always";
})(EndStrategy = exports.EndStrategy || (exports.EndStrategy = {}));
class PipeError extends Report_1.ReportError {
    constructor({ fileName, code, signal }) {
        // It doesn't matter whether we create a new Configuration from the cwd or from a
        // temp directory since in none of these cases the user's rc values will be respected.
        // TODO: find a way to respect them
        const configuration = Configuration_1.Configuration.create(fslib_1.ppath.cwd());
        const prettyFileName = formatUtils.pretty(configuration, fileName, formatUtils.Type.PATH);
        super(MessageName_1.MessageName.EXCEPTION, `Child ${prettyFileName} reported an error`, report => {
            reportExitStatus(code, signal, { configuration, report });
        });
        this.code = getExitCode(code, signal);
    }
}
exports.PipeError = PipeError;
class ExecError extends PipeError {
    constructor({ fileName, code, signal, stdout, stderr }) {
        super({ fileName, code, signal });
        this.stdout = stdout;
        this.stderr = stderr;
    }
}
exports.ExecError = ExecError;
function hasFd(stream) {
    // @ts-expect-error: Not sure how to typecheck this field
    return stream !== null && typeof stream.fd === `number`;
}
const activeChildren = new Set();
function sigintHandler() {
    // We don't want SIGINT to kill our process; we want it to kill the
    // innermost process, whose end will cause our own to exit.
}
function sigtermHandler() {
    for (const child of activeChildren) {
        child.kill();
    }
}
async function pipevp(fileName, args, { cwd, env = process.env, strict = false, stdin = null, stdout, stderr, end = EndStrategy.Always }) {
    const stdio = [`pipe`, `pipe`, `pipe`];
    if (stdin === null)
        stdio[0] = `ignore`;
    else if (hasFd(stdin))
        stdio[0] = stdin;
    if (hasFd(stdout))
        stdio[1] = stdout;
    if (hasFd(stderr))
        stdio[2] = stderr;
    const child = (0, cross_spawn_1.default)(fileName, args, {
        cwd: fslib_1.npath.fromPortablePath(cwd),
        env: {
            ...env,
            PWD: fslib_1.npath.fromPortablePath(cwd),
        },
        stdio,
    });
    activeChildren.add(child);
    if (activeChildren.size === 1) {
        process.on(`SIGINT`, sigintHandler);
        process.on(`SIGTERM`, sigtermHandler);
    }
    if (!hasFd(stdin) && stdin !== null)
        stdin.pipe(child.stdin);
    if (!hasFd(stdout))
        child.stdout.pipe(stdout, { end: false });
    if (!hasFd(stderr))
        child.stderr.pipe(stderr, { end: false });
    const closeStreams = () => {
        for (const stream of new Set([stdout, stderr])) {
            if (!hasFd(stream)) {
                stream.end();
            }
        }
    };
    return new Promise((resolve, reject) => {
        child.on(`error`, error => {
            activeChildren.delete(child);
            if (activeChildren.size === 0) {
                process.off(`SIGINT`, sigintHandler);
                process.off(`SIGTERM`, sigtermHandler);
            }
            if (end === EndStrategy.Always || end === EndStrategy.ErrorCode)
                closeStreams();
            reject(error);
        });
        child.on(`close`, (code, signal) => {
            activeChildren.delete(child);
            if (activeChildren.size === 0) {
                process.off(`SIGINT`, sigintHandler);
                process.off(`SIGTERM`, sigtermHandler);
            }
            if (end === EndStrategy.Always || (end === EndStrategy.ErrorCode && code > 0))
                closeStreams();
            if (code === 0 || !strict) {
                resolve({ code: getExitCode(code, signal) });
            }
            else {
                reject(new PipeError({ fileName, code, signal }));
            }
        });
    });
}
exports.pipevp = pipevp;
async function execvp(fileName, args, { cwd, env = process.env, encoding = `utf8`, strict = false }) {
    const stdio = [`ignore`, `pipe`, `pipe`];
    const stdoutChunks = [];
    const stderrChunks = [];
    const nativeCwd = fslib_1.npath.fromPortablePath(cwd);
    if (typeof env.PWD !== `undefined`)
        env = { ...env, PWD: nativeCwd };
    const subprocess = (0, cross_spawn_1.default)(fileName, args, {
        cwd: nativeCwd,
        env,
        stdio,
    });
    subprocess.stdout.on(`data`, (chunk) => {
        stdoutChunks.push(chunk);
    });
    subprocess.stderr.on(`data`, (chunk) => {
        stderrChunks.push(chunk);
    });
    return await new Promise((resolve, reject) => {
        subprocess.on(`error`, err => {
            const configuration = Configuration_1.Configuration.create(cwd);
            const prettyFileName = formatUtils.pretty(configuration, fileName, formatUtils.Type.PATH);
            reject(new Report_1.ReportError(MessageName_1.MessageName.EXCEPTION, `Process ${prettyFileName} failed to spawn`, report => {
                report.reportError(MessageName_1.MessageName.EXCEPTION, `  ${formatUtils.prettyField(configuration, {
                    label: `Thrown Error`,
                    value: formatUtils.tuple(formatUtils.Type.NO_HINT, err.message),
                })}`);
            }));
        });
        subprocess.on(`close`, (code, signal) => {
            const stdout = encoding === `buffer`
                ? Buffer.concat(stdoutChunks)
                : Buffer.concat(stdoutChunks).toString(encoding);
            const stderr = encoding === `buffer`
                ? Buffer.concat(stderrChunks)
                : Buffer.concat(stderrChunks).toString(encoding);
            if (code === 0 || !strict) {
                resolve({
                    code: getExitCode(code, signal), stdout, stderr,
                });
            }
            else {
                reject(new ExecError({ fileName, code, signal, stdout, stderr }));
            }
        });
    });
}
exports.execvp = execvp;
const signalToCodeMap = new Map([
    [`SIGINT`, 2],
    [`SIGQUIT`, 3],
    [`SIGKILL`, 9],
    [`SIGTERM`, 15], // default signal for kill
]);
function getExitCode(code, signal) {
    const signalCode = signalToCodeMap.get(signal);
    if (typeof signalCode !== `undefined`) {
        return 128 + signalCode;
    }
    else {
        return code !== null && code !== void 0 ? code : 1;
    }
}
function reportExitStatus(code, signal, { configuration, report }) {
    report.reportError(MessageName_1.MessageName.EXCEPTION, `  ${formatUtils.prettyField(configuration, code !== null ? {
        label: `Exit Code`,
        value: formatUtils.tuple(formatUtils.Type.NUMBER, code),
    } : {
        label: `Exit Signal`,
        value: formatUtils.tuple(formatUtils.Type.CODE, signal),
    })}`);
}
